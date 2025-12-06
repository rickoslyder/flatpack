/**
 * Main Flatpack Web Application
 */

import { useState, useCallback } from "react";
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
import { webAdapter } from "./web-adapter";

// Demo data for preview
const demoFiles: PreviewFileNode[] = [
  {
    name: "documents",
    path: "documents",
    isDirectory: true,
    children: [
      {
        name: "report.pdf",
        path: "documents/report.pdf",
        isDirectory: false,
        size: 1024000,
        wordCount: 5000,
        action: "convert",
      },
      {
        name: "notes.md",
        path: "documents/notes.md",
        isDirectory: false,
        size: 2048,
        wordCount: 500,
        action: "keep",
      },
    ],
  },
  {
    name: "images",
    path: "images",
    isDirectory: true,
    children: [
      {
        name: "diagram.png",
        path: "images/diagram.png",
        isDirectory: false,
        size: 512000,
        action: "fail",
        warning: "OCR not available in web version",
      },
    ],
  },
];

const demoStats: PreviewStats = {
  totalFiles: 3,
  totalSize: 1538048,
  totalWords: 5500,
  outputSources: 2,
  maxSources: 300,
  actions: {
    keep: 1,
    convert: 1,
    merge: 0,
    chunk: 0,
    ocr: 0,
    fail: 1,
  },
};

const demoWarnings: Warning[] = [
  {
    id: "1",
    type: "format",
    message: "Image files require OCR which is not available in web version",
    filePath: "images/diagram.png",
  },
];

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("input");
  const [isLoading, setIsLoading] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const handleFolderSelect = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await webAdapter.selectFolder();
      if (result) {
        // For now, go to preview with demo data
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
      const result = await webAdapter.selectZipFile();
      if (result) {
        // For now, go to preview with demo data
        setPhase("preview");
      }
    } catch (error) {
      console.error("Failed to select ZIP:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConfirmProcessing = useCallback(() => {
    setPhase("processing");
    setProgress(0);
    setProcessedCount(0);
    setElapsedTime(0);
    setLogEntries([
      {
        id: "1",
        timestamp: Date.now(),
        type: "info",
        message: "Starting processing...",
      },
    ]);

    // Simulate processing
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      setProcessedCount(Math.floor(currentProgress / 33));
      setElapsedTime((prev) => prev + 500);
      setCurrentFile(currentProgress < 50 ? "documents/report.pdf" : "documents/notes.md");

      setLogEntries((prev) => [
        ...prev,
        {
          id: String(prev.length + 1),
          timestamp: Date.now(),
          type: currentProgress === 100 ? "success" : "info",
          message:
            currentProgress === 100
              ? "Processing complete!"
              : `Processing... ${currentProgress}%`,
        },
      ]);

      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => setPhase("results"), 500);
      }
    }, 500);
  }, []);

  const handleCancelInput = useCallback(() => {
    setPhase("input");
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
  }, []);

  const handleDownloadZip = useCallback(async () => {
    const files = new Map<string, string>();
    files.set("documents_report.md", "# Report\n\nConverted content...");
    files.set("documents_notes.md", "# Notes\n\nOriginal content...");
    files.set("FLATPACK_MANIFEST.json", JSON.stringify({ version: "1.0" }, null, 2));
    await webAdapter.downloadAsZip(files, "flatpack-output.zip");
  }, []);

  const resultsStats: ResultsStats = {
    success: 2,
    warnings: 1,
    failures: 1,
    totalFiles: 3,
    outputSources: 2,
    totalSize: 1538048,
    totalWords: 5500,
    duration: elapsedTime,
  };

  const failures: FailedFile[] = [
    {
      path: "images/diagram.png",
      reason: "OCR not available in web version",
    },
  ];

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
            files={demoFiles}
            stats={demoStats}
            warnings={demoWarnings}
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
            totalCount={3}
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
            actions={{
              keep: 1,
              convert: 1,
              merge: 0,
              chunk: 0,
              ocr: 0,
            }}
            failures={failures}
            manifest={{ version: "1.0", files: 2 }}
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
