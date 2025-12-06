/**
 * Processing store
 * Manages real-time processing state and progress
 */

import { create } from "zustand";
import type { ProcessingError, FileAction } from "@flatpack/core";

/**
 * Processing phase
 */
export type ProcessingPhase =
  | "idle"
  | "scanning"
  | "analyzing"
  | "planning"
  | "processing"
  | "writing"
  | "complete"
  | "error"
  | "cancelled";

/**
 * File processing status
 */
export interface FileStatus {
  path: string;
  name: string;
  action: FileAction;
  status: "pending" | "processing" | "complete" | "error";
  progress?: number;
  error?: string;
}

/**
 * Processing statistics
 */
export interface ProcessingStats {
  filesProcessed: number;
  filesTotal: number;
  bytesProcessed: number;
  bytesTotal: number;
  wordsProcessed: number;
  wordsTotal: number;
  errorsCount: number;
  startTime: Date | null;
  endTime: Date | null;
}

/**
 * Processing state
 */
export interface ProcessingState {
  /** Current phase */
  phase: ProcessingPhase;
  /** Overall progress (0-100) */
  progress: number;
  /** Current file being processed */
  currentFile: string | null;
  /** Current phase message */
  message: string;
  /** Detailed file statuses */
  fileStatuses: Map<string, FileStatus>;
  /** Processing errors */
  errors: ProcessingError[];
  /** Statistics */
  stats: ProcessingStats;
  /** Abort controller */
  abortController: AbortController | null;

  /** Start processing */
  startProcessing: () => AbortController;
  /** Update phase */
  setPhase: (phase: ProcessingPhase, message?: string) => void;
  /** Update progress */
  setProgress: (progress: number, currentFile?: string) => void;
  /** Update file status */
  setFileStatus: (path: string, status: Partial<FileStatus>) => void;
  /** Add error */
  addError: (error: ProcessingError) => void;
  /** Update stats */
  updateStats: (stats: Partial<ProcessingStats>) => void;
  /** Cancel processing */
  cancel: () => void;
  /** Complete processing */
  complete: (success: boolean) => void;
  /** Reset */
  reset: () => void;
}

/**
 * Initial stats
 */
const initialStats: ProcessingStats = {
  filesProcessed: 0,
  filesTotal: 0,
  bytesProcessed: 0,
  bytesTotal: 0,
  wordsProcessed: 0,
  wordsTotal: 0,
  errorsCount: 0,
  startTime: null,
  endTime: null,
};

/**
 * Processing store
 */
export const useProcessingStore = create<ProcessingState>((set, get) => ({
  phase: "idle",
  progress: 0,
  currentFile: null,
  message: "",
  fileStatuses: new Map(),
  errors: [],
  stats: initialStats,
  abortController: null,

  startProcessing: () => {
    const controller = new AbortController();
    set({
      phase: "scanning",
      progress: 0,
      currentFile: null,
      message: "Starting...",
      fileStatuses: new Map(),
      errors: [],
      stats: { ...initialStats, startTime: new Date() },
      abortController: controller,
    });
    return controller;
  },

  setPhase: (phase, message) =>
    set((state) => ({
      phase,
      message: message || getPhaseMessage(phase),
      // Reset progress on phase change
      progress: phase === state.phase ? state.progress : 0,
    })),

  setProgress: (progress, currentFile) =>
    set((state) => ({
      progress,
      currentFile: currentFile ?? state.currentFile,
    })),

  setFileStatus: (path, status) =>
    set((state) => {
      const newStatuses = new Map(state.fileStatuses);
      const existing = newStatuses.get(path);
      newStatuses.set(path, { ...existing, ...status, path } as FileStatus);
      return { fileStatuses: newStatuses };
    }),

  addError: (error) =>
    set((state) => ({
      errors: [...state.errors, error],
      stats: {
        ...state.stats,
        errorsCount: state.stats.errorsCount + 1,
      },
    })),

  updateStats: (stats) =>
    set((state) => ({
      stats: { ...state.stats, ...stats },
    })),

  cancel: () => {
    const { abortController } = get();
    abortController?.abort();
    set({
      phase: "cancelled",
      message: "Processing cancelled",
      abortController: null,
    });
  },

  complete: (success) =>
    set((state) => ({
      phase: success ? "complete" : "error",
      progress: 100,
      message: success ? "Processing complete!" : "Processing failed",
      stats: { ...state.stats, endTime: new Date() },
      abortController: null,
    })),

  reset: () =>
    set({
      phase: "idle",
      progress: 0,
      currentFile: null,
      message: "",
      fileStatuses: new Map(),
      errors: [],
      stats: initialStats,
      abortController: null,
    }),
}));

/**
 * Get default message for phase
 */
function getPhaseMessage(phase: ProcessingPhase): string {
  switch (phase) {
    case "idle":
      return "Ready";
    case "scanning":
      return "Scanning files...";
    case "analyzing":
      return "Analyzing content...";
    case "planning":
      return "Planning processing...";
    case "processing":
      return "Processing files...";
    case "writing":
      return "Writing output...";
    case "complete":
      return "Complete!";
    case "error":
      return "Error occurred";
    case "cancelled":
      return "Cancelled";
    default:
      return "";
  }
}

/**
 * Selector for phase
 */
export const usePhase = () => useProcessingStore((state) => state.phase);

/**
 * Selector for progress
 */
export const useProgress = () =>
  useProcessingStore((state) => ({
    phase: state.phase,
    progress: state.progress,
    currentFile: state.currentFile,
    message: state.message,
  }));

/**
 * Selector for errors
 */
export const useErrors = () => useProcessingStore((state) => state.errors);

/**
 * Selector for stats
 */
export const useStats = () => useProcessingStore((state) => state.stats);

/**
 * Check if processing is active
 */
export const useIsProcessing = () =>
  useProcessingStore((state) =>
    ["scanning", "analyzing", "planning", "processing", "writing"].includes(
      state.phase
    )
  );

/**
 * Check if processing is complete
 */
export const useIsComplete = () =>
  useProcessingStore((state) => state.phase === "complete");

/**
 * Get elapsed time
 */
export const useElapsedTime = () =>
  useProcessingStore((state) => {
    const { startTime, endTime } = state.stats;
    if (!startTime) return 0;
    const end = endTime || new Date();
    return end.getTime() - startTime.getTime();
  });
