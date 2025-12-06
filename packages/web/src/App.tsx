/**
 * Main Flatpack Web Application
 */

import { useState, useCallback, useRef } from "react";
import {
  AppShell,
  PhaseManager,
  InputPhase,
  PreviewPhase,
  ProcessingPhaseView,
  ResultsPhase,
  type AppPhase,
  type PreviewFileNode,
  type PreviewStats,
  type Warning,
  type LogEntry,
  type ErrorAction,
  type ResultsStats,
  type FailedFile,
} from "@flatpack/ui";
import {
  generateProcessingPlan,
  classifyFile,
  type ScanResult,
  type ScannedFile,
  type ProcessingPlan,
  type AnalyzedFile,
  type FlatpackConfig,
  DEFAULT_CONFIG,
  TIER_LIMITS,
} from "@flatpack/core";
import { webAdapter } from "./web-adapter";

// Helper to build preview tree from scanned files
function buildPreviewTree(
  files: ScannedFile[],
  analyzedMap: Map<string, AnalyzedFile>,
  plan?: ProcessingPlan
): PreviewFileNode[] {
  const root: PreviewFileNode[] = [];
  const pathMap = new Map<string, PreviewFileNode>();

  // Sort: directories first, then by path
  const sortedFiles = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.relativePath.localeCompare(b.relativePath);
  });

  for (const file of sortedFiles) {
    const analyzed = analyzedMap.get(file.relativePath);
    const planned = plan?.files.find((f) => f.source.relativePath === file.relativePath);

    let action: PreviewFileNode["action"] = undefined;
    let warning: string | undefined;

    if (!file.isDirectory && analyzed) {
      const tier = analyzed.tier;
      if (tier === "passthrough") action = "keep";
      else if (tier === "conversion") action = "convert";
      else if (tier === "ocr") {
        action = "fail";
        warning = "OCR not available in web version";
      } else if (tier === "unsupported") {
        action = "fail";
        warning = "Unsupported file format";
      }

      if (planned?.action === "merge") action = "merge";
      if (planned?.action === "chunk") action = "chunk";
    }

    const node: PreviewFileNode = {
      name: file.name,
      path: file.relativePath,
      isDirectory: file.isDirectory,
      size: file.size,
      wordCount: analyzed?.wordCount,
      action,
      warning,
      children: file.isDirectory ? [] : undefined,
    };

    pathMap.set(file.relativePath, node);

    // Find parent
    const parentPath = file.relativePath.includes("/")
      ? file.relativePath.substring(0, file.relativePath.lastIndexOf("/"))
      : "";

    if (parentPath && pathMap.has(parentPath)) {
      pathMap.get(parentPath)!.children!.push(node);
    } else if (!parentPath) {
      root.push(node);
    }
  }

  return root;
}

// Calculate stats from analyzed files
function calculateStats(
  files: ScannedFile[],
  analyzed: AnalyzedFile[],
  plan: ProcessingPlan,
  tier: "pro" | "free"
): PreviewStats {
  const actions = { keep: 0, convert: 0, merge: 0, chunk: 0, ocr: 0, fail: 0 };

  for (const p of plan.files) {
    if (p.action === "keep") actions.keep++;
    else if (p.action === "convert") actions.convert++;
    else if (p.action === "merge") actions.merge++;
    else if (p.action === "chunk") actions.chunk++;
    else if (p.action === "ocr") actions.ocr++;
    else if (p.action === "fail" || p.action === "skip") actions.fail++;
  }

  const totalSize = files.reduce((sum, f) => sum + (f.isDirectory ? 0 : f.size), 0);
  const totalWords = analyzed.reduce((sum, f) => sum + (f.wordCount || 0), 0);

  return {
    totalFiles: files.filter((f) => !f.isDirectory).length,
    totalSize,
    totalWords,
    outputSources: plan.summary.totalOutputFiles,
    maxSources: TIER_LIMITS[tier].maxSources,
    actions,
  };
}

// Generate warnings from plan
function generateWarnings(plan: ProcessingPlan): Warning[] {
  const warnings: Warning[] = [];
  let id = 0;

  for (const w of plan.warnings) {
    warnings.push({
      id: String(++id),
      type: "general",
      message: w.message,
    });
  }

  for (const file of plan.skipped) {
    warnings.push({
      id: String(++id),
      type: "format",
      message: `Unsupported: ${file.source.name}`,
      filePath: file.source.relativePath,
    });
  }

  return warnings;
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("input");
  const [isLoading, setIsLoading] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  // Data state
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [plan, setPlan] = useState<ProcessingPlan | null>(null);
  const [previewFiles, setPreviewFiles] = useState<PreviewFileNode[]>([]);
  const [previewStats, setPreviewStats] = useState<PreviewStats | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [failures, setFailures] = useState<FailedFile[]>([]);
  const [outputFiles, setOutputFiles] = useState<Map<string, string | Uint8Array>>(new Map());
  const [processingDuration, setProcessingDuration] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  const config: FlatpackConfig = { ...DEFAULT_CONFIG, tier: "pro" };

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogEntries((prev) => [
      ...prev,
      { id: String(prev.length + 1), timestamp: Date.now(), type, message },
    ]);
  }, []);

  const handleFolderSelect = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await webAdapter.selectFolder();
      if (!result) {
        setIsLoading(false);
        return;
      }

      addLog("info", `Scanning folder: ${result.name}`);

      // Scan directory
      const scanner = webAdapter.getScanner();
      const scan = await scanner.scan(result.path);
      setScanResult(scan);

      addLog("info", `Found ${scan.totalFiles} files in ${scan.totalDirectories} directories`);

      // Analyze files
      const nonDirFiles = scan.files.filter((f) => !f.isDirectory);
      const analyzed: AnalyzedFile[] = [];

      for (const file of nonDirFiles) {
        const classification = classifyFile(file.name, file.size);
        analyzed.push({
          ...file,
          tier: classification.tier,
          requiresOcr: classification.requiresOcr,
          wordCount: 0,
          isCopyProtected: false,
          relatedFiles: [],
          warnings: [],
        });
      }

      // Generate plan
      const processingPlan = generateProcessingPlan(analyzed, config);
      setPlan(processingPlan);

      // Build preview
      const analyzedMap = new Map(analyzed.map((a) => [a.relativePath, a]));
      const tree = buildPreviewTree(scan.files, analyzedMap, processingPlan);
      setPreviewFiles(tree);

      const stats = calculateStats(scan.files, analyzed, processingPlan, config.tier);
      setPreviewStats(stats);

      const warns = generateWarnings(processingPlan);
      setWarnings(warns);

      addLog("success", "Analysis complete");
      setPhase("preview");
    } catch (error) {
      console.error("Failed to select folder:", error);
      addLog("error", `Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }, [addLog, config]);

  const handleZipSelect = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await webAdapter.selectZipFile();
      if (!result) {
        setIsLoading(false);
        return;
      }

      addLog("info", `Selected ZIP: ${result.name}`);
      addLog("error", "ZIP extraction not yet implemented - please use folder selection");
    } catch (error) {
      console.error("Failed to select ZIP:", error);
      addLog("error", `Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  const handleConfirmProcessing = useCallback(async () => {
    if (!scanResult || !plan) return;

    setPhase("processing");
    setProgress(0);
    setProcessedCount(0);
    setElapsedTime(0);
    setLogEntries([]);
    startTimeRef.current = Date.now();

    abortControllerRef.current = new AbortController();

    addLog("info", "Starting processing...");

    // Track elapsed time
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current);
    }, 100);

    try {
      const processedContents = new Map<string, string | Uint8Array>();
      const errors: FailedFile[] = [];

      const filesToProcess = plan.files.filter(
        (f) => f.action !== "fail" && f.action !== "skip"
      );
      const total = filesToProcess.length;

      for (let i = 0; i < filesToProcess.length; i++) {
        const planned = filesToProcess[i];
        const file = planned.source;

        if (abortControllerRef.current?.signal.aborted) {
          throw new Error("Processing cancelled");
        }

        setCurrentFile(file.relativePath);
        setProcessedCount(i);
        setProgress(Math.round((i / total) * 100));

        try {
          addLog("info", `Processing: ${file.relativePath}`);

          // Read file content
          const scanner = webAdapter.getScanner();
          const content = await scanner.readFile(file.path);

          // Determine output based on tier
          let outputContent: string;
          const decoder = new TextDecoder();

          if (file.tier === "passthrough") {
            // Wrap in markdown code block
            const textContent = decoder.decode(content);
            const lang = file.extension || "text";
            outputContent = `<!-- Source: ${file.relativePath} -->\n\n\`\`\`${lang}\n${textContent}\n\`\`\`\n`;
          } else if (file.tier === "conversion") {
            // For now, include as text (full conversion would use converters)
            try {
              const textContent = decoder.decode(content);
              outputContent = `<!-- Source: ${file.relativePath} -->\n<!-- Note: Full conversion pending -->\n\n${textContent}\n`;
            } catch {
              outputContent = `<!-- Source: ${file.relativePath} -->\n<!-- Binary file, conversion not yet implemented -->\n`;
            }
          } else {
            outputContent = `<!-- Source: ${file.relativePath} -->\n<!-- Unsupported format -->\n`;
          }

          // Flatten the filename
          const flatName = file.relativePath.replace(/\//g, "_").replace(/\.[^.]+$/, ".md");
          processedContents.set(flatName, outputContent);

          addLog("success", `Processed: ${file.relativePath}`);
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Unknown error";
          errors.push({ path: file.relativePath, reason });
          addLog("error", `Failed: ${file.relativePath} - ${reason}`);
        }
      }

      // Generate manifest
      const manifest = {
        version: "1.0",
        generated: new Date().toISOString(),
        source: scanResult.root,
        files: Array.from(processedContents.keys()),
        stats: {
          total: total,
          processed: processedContents.size,
          failed: errors.length,
        },
      };
      processedContents.set("FLATPACK_MANIFEST.json", JSON.stringify(manifest, null, 2));

      // Generate master structure
      const structure = [
        "# Master Structure",
        "",
        `Generated: ${new Date().toISOString()}`,
        `Source: ${scanResult.root}`,
        "",
        "## Files",
        "",
        ...Array.from(processedContents.keys())
          .filter((k) => k !== "FLATPACK_MANIFEST.json")
          .map((k) => `- ${k}`),
        "",
      ].join("\n");
      processedContents.set("00_MASTER_STRUCTURE.md", structure);

      setOutputFiles(processedContents);
      setProgress(100);
      setProcessedCount(total);
      setFailures(errors);
      setProcessingDuration(Date.now() - startTimeRef.current);

      addLog("success", `Processing complete! ${processedContents.size} files generated.`);

      clearInterval(timer);
      setTimeout(() => setPhase("results"), 500);
    } catch (error) {
      clearInterval(timer);
      addLog("error", `Processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setPhase("preview");
    }
  }, [scanResult, plan, addLog]);

  const handleCancelInput = useCallback(() => {
    setPhase("input");
    setScanResult(null);
    setPlan(null);
    setPreviewFiles([]);
    setPreviewStats(null);
    setWarnings([]);
  }, []);

  const handleCancelProcessing = useCallback(() => {
    abortControllerRef.current?.abort();
    setPhase("preview");
  }, []);

  const handleErrorAction = useCallback((_action: ErrorAction) => {
    // Handle error action
  }, []);

  const handleStartOver = useCallback(() => {
    setPhase("input");
    setProgress(0);
    setProcessedCount(0);
    setElapsedTime(0);
    setLogEntries([]);
    setCurrentFile(null);
    setScanResult(null);
    setPlan(null);
    setPreviewFiles([]);
    setPreviewStats(null);
    setWarnings([]);
    setFailures([]);
    setOutputFiles(new Map());
    setProcessingDuration(0);
  }, []);

  const handleDownloadZip = useCallback(async () => {
    if (outputFiles.size === 0) return;
    await webAdapter.downloadAsZip(outputFiles, "flatpack-output.zip");
  }, [outputFiles]);

  const resultsStats: ResultsStats = {
    success: outputFiles.size - 2, // Subtract manifest and structure
    warnings: warnings.length,
    failures: failures.length,
    totalFiles: previewStats?.totalFiles || 0,
    outputSources: outputFiles.size,
    totalSize: previewStats?.totalSize || 0,
    totalWords: previewStats?.totalWords || 0,
    duration: processingDuration,
  };

  const renderPhase = () => {
    switch (phase) {
      case "input":
        return (
          <InputPhase
            onFolderSelect={handleFolderSelect}
            onZipSelect={handleZipSelect}
            isLoading={isLoading}
          />
        );
      case "preview":
        return previewStats ? (
          <PreviewPhase
            files={previewFiles}
            stats={previewStats}
            warnings={warnings}
            onConfirm={handleConfirmProcessing}
            onCancel={handleCancelInput}
          />
        ) : null;
      case "processing":
        return (
          <ProcessingPhaseView
            stage={progress >= 100 ? "complete" : "processing"}
            progress={progress}
            processedCount={processedCount}
            totalCount={plan?.files.filter((f) => f.action !== "fail" && f.action !== "skip").length || 0}
            elapsedTime={elapsedTime}
            currentFile={currentFile}
            currentAction="convert"
            logEntries={logEntries}
            error={null}
            onCancel={handleCancelProcessing}
            onErrorAction={handleErrorAction}
          />
        );
      case "results":
        return (
          <ResultsPhase
            stats={resultsStats}
            actions={previewStats?.actions || { keep: 0, convert: 0, merge: 0, chunk: 0, ocr: 0 }}
            failures={failures}
            manifest={{ version: "1.0", files: outputFiles.size }}
            onDownloadZip={handleDownloadZip}
            onStartOver={handleStartOver}
            isDesktop={false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppShell>
      <PhaseManager currentPhase={phase}>{renderPhase()}</PhaseManager>
    </AppShell>
  );
}
