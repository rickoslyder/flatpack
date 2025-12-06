/**
 * Main Flatpack Desktop Application
 */

import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
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
import { tauriAdapter } from "./tauri-adapter";

// Convert scanned files to preview tree format
function buildPreviewTree(
  files: Array<{
    path: string;
    relativePath: string;
    name: string;
    isDirectory: boolean;
    size: number;
  }>
): PreviewFileNode[] {
  const root: PreviewFileNode[] = [];
  const pathMap = new Map<string, PreviewFileNode>();

  // Sort files so directories come first and paths are in order
  const sortedFiles = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.relativePath.localeCompare(b.relativePath);
  });

  for (const file of sortedFiles) {
    const node: PreviewFileNode = {
      name: file.name,
      path: file.relativePath,
      isDirectory: file.isDirectory,
      size: file.size,
      action: file.isDirectory ? undefined : "keep",
      children: file.isDirectory ? [] : undefined,
    };

    pathMap.set(file.relativePath, node);

    // Find parent
    const parentPath = file.relativePath.includes("/")
      ? file.relativePath.substring(0, file.relativePath.lastIndexOf("/"))
      : "";

    if (parentPath && pathMap.has(parentPath)) {
      const parent = pathMap.get(parentPath)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else if (!parentPath) {
      root.push(node);
    }
  }

  return root;
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("input");
  const [isLoading, setIsLoading] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  // Actual scan data
  const [previewFiles, setPreviewFiles] = useState<PreviewFileNode[]>([]);
  const [previewStats, setPreviewStats] = useState<PreviewStats>({
    totalFiles: 0,
    totalSize: 0,
    totalWords: 0,
    outputSources: 0,
    maxSources: 300,
    actions: { keep: 0, convert: 0, merge: 0, chunk: 0, ocr: 0, fail: 0 },
  });
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");

  // Load config on mount
  useEffect(() => {
    invoke("load_config").catch(console.error);
  }, []);

  const handleFolderSelect = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await tauriAdapter.selectFolder({
        title: "Select folder to process",
      });

      if (result) {
        setSelectedPath(result.path);

        // Scan the directory
        const scanner = tauriAdapter.getScanner();
        const scanResult = await scanner.scan(result.path);

        // Build preview tree
        const tree = buildPreviewTree(scanResult.files);
        setPreviewFiles(tree);

        // Calculate stats
        const files = scanResult.files.filter((f) => !f.isDirectory);
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);

        setPreviewStats({
          totalFiles: scanResult.totalFiles,
          totalSize,
          totalWords: 0, // Would need content analysis
          outputSources: scanResult.totalFiles,
          maxSources: 300,
          actions: {
            keep: scanResult.totalFiles,
            convert: 0,
            merge: 0,
            chunk: 0,
            ocr: 0,
            fail: 0,
          },
        });

        setWarnings([]);
        setPhase("preview");
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleZipSelect = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await tauriAdapter.selectFiles({
        title: "Select ZIP archive",
        filters: [{ name: "ZIP Archives", extensions: ["zip"] }],
      });

      if (results && results.length > 0) {
        const zipPath = results[0].path;
        setSelectedPath(zipPath);

        // Extract ZIP and scan contents
        // For now, show a placeholder message
        setPreviewFiles([
          {
            name: results[0].name,
            path: results[0].name,
            isDirectory: false,
            size: results[0].size || 0,
            action: "keep",
          },
        ]);

        setPreviewStats({
          totalFiles: 1,
          totalSize: results[0].size || 0,
          totalWords: 0,
          outputSources: 1,
          maxSources: 300,
          actions: { keep: 1, convert: 0, merge: 0, chunk: 0, ocr: 0, fail: 0 },
        });

        setWarnings([
          {
            id: "zip-info",
            type: "general",
            message: "ZIP extraction will be performed during processing",
          },
        ]);

        setPhase("preview");
      }
    } catch (error) {
      console.error("Failed to select ZIP:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConfirmProcessing = useCallback(async () => {
    setPhase("processing");
    setProgress(0);
    setProcessedCount(0);
    setElapsedTime(0);
    setLogEntries([
      {
        id: "1",
        timestamp: Date.now(),
        type: "info",
        message: `Starting processing of ${selectedPath}...`,
      },
    ]);

    // Simulate processing for now
    // In a real implementation, this would call the core processing pipeline
    let currentProgress = 0;
    const totalFiles = previewStats.totalFiles || 1;
    const startTime = Date.now();

    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress > 100) currentProgress = 100;

      setProgress(currentProgress);
      setProcessedCount(Math.floor((currentProgress / 100) * totalFiles));
      setElapsedTime(Date.now() - startTime);
      setCurrentFile(
        currentProgress < 100
          ? `Processing file ${Math.floor((currentProgress / 100) * totalFiles) + 1}...`
          : null
      );

      setLogEntries((prev) => [
        ...prev,
        {
          id: String(prev.length + 1),
          timestamp: Date.now(),
          type: currentProgress === 100 ? "success" : "info",
          message:
            currentProgress === 100
              ? "Processing complete!"
              : `Processing... ${Math.floor(currentProgress)}%`,
        },
      ]);

      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => setPhase("results"), 500);
      }
    }, 500);
  }, [selectedPath, previewStats.totalFiles]);

  const handleCancelInput = useCallback(() => {
    setPhase("input");
    setPreviewFiles([]);
    setPreviewStats({
      totalFiles: 0,
      totalSize: 0,
      totalWords: 0,
      outputSources: 0,
      maxSources: 300,
      actions: { keep: 0, convert: 0, merge: 0, chunk: 0, ocr: 0, fail: 0 },
    });
    setWarnings([]);
    setSelectedPath("");
  }, []);

  const handleCancelProcessing = useCallback(() => {
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
    setPreviewFiles([]);
    setPreviewStats({
      totalFiles: 0,
      totalSize: 0,
      totalWords: 0,
      outputSources: 0,
      maxSources: 300,
      actions: { keep: 0, convert: 0, merge: 0, chunk: 0, ocr: 0, fail: 0 },
    });
    setWarnings([]);
    setSelectedPath("");
  }, []);

  const handleOpenFolder = useCallback(async () => {
    // Open the output folder in system file manager
    // For now just log - would need Tauri shell plugin
    console.log("Opening folder:", selectedPath);
  }, [selectedPath]);

  const handleDownloadZip = useCallback(async () => {
    const savePath = await tauriAdapter.selectSavePath({
      title: "Save ZIP archive",
      defaultPath: "flatpack-output.zip",
      filters: [{ name: "ZIP Archives", extensions: ["zip"] }],
    });

    if (savePath) {
      // Create and save ZIP
      console.log("Saving ZIP to:", savePath);
    }
  }, []);

  const resultsStats: ResultsStats = {
    success: previewStats.totalFiles,
    warnings: warnings.length,
    failures: 0,
    totalFiles: previewStats.totalFiles,
    outputSources: previewStats.outputSources,
    totalSize: previewStats.totalSize,
    totalWords: previewStats.totalWords,
    duration: elapsedTime,
  };

  const failures: FailedFile[] = [];

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
        return (
          <PreviewPhase
            files={previewFiles}
            stats={previewStats}
            warnings={warnings}
            onConfirm={handleConfirmProcessing}
            onCancel={handleCancelInput}
          />
        );
      case "processing":
        return (
          <ProcessingPhaseView
            stage={progress >= 100 ? "complete" : "processing"}
            progress={progress}
            processedCount={processedCount}
            totalCount={previewStats.totalFiles}
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
            actions={previewStats.actions}
            failures={failures}
            manifest={{ version: "1.0", files: previewStats.totalFiles }}
            onOpenFolder={handleOpenFolder}
            onDownloadZip={handleDownloadZip}
            onStartOver={handleStartOver}
            isDesktop={true}
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
