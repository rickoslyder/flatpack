/**
 * Session store
 * Manages current session and processing history
 */

import { create } from "zustand";
import type { ProcessingPlan, ProcessingResults, AnalyzedFile } from "@flatpack/core";

/**
 * Input source type
 */
export type InputSource =
  | { type: "folder"; path: string; name: string }
  | { type: "zip"; path: string; name: string; size: number }
  | { type: "drop"; files: FileInfo[] };

/**
 * File info for dropped files
 */
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
}

/**
 * Session history entry
 */
export interface HistoryEntry {
  id: string;
  inputName: string;
  inputType: "folder" | "zip";
  outputPath: string;
  timestamp: Date;
  stats: {
    inputFiles: number;
    outputFiles: number;
    duration: number;
  };
  success: boolean;
}

/**
 * Session state
 */
export interface SessionState {
  /** Current input source */
  input: InputSource | null;
  /** Output path */
  outputPath: string | null;
  /** Analyzed files (after scan) */
  analyzedFiles: AnalyzedFile[];
  /** Processing plan (after analysis) */
  plan: ProcessingPlan | null;
  /** Processing results (after completion) */
  results: ProcessingResults | null;
  /** Session history */
  history: HistoryEntry[];

  /** Set input source */
  setInput: (input: InputSource | null) => void;
  /** Set output path */
  setOutputPath: (path: string | null) => void;
  /** Set analyzed files */
  setAnalyzedFiles: (files: AnalyzedFile[]) => void;
  /** Set processing plan */
  setPlan: (plan: ProcessingPlan | null) => void;
  /** Set processing results */
  setResults: (results: ProcessingResults | null) => void;
  /** Add to history */
  addToHistory: (entry: HistoryEntry) => void;
  /** Clear history */
  clearHistory: () => void;
  /** Reset session (keep history) */
  resetSession: () => void;
  /** Full reset */
  reset: () => void;
}

/**
 * Maximum history entries to keep
 */
const MAX_HISTORY = 50;

/**
 * Session store
 */
export const useSessionStore = create<SessionState>((set) => ({
  input: null,
  outputPath: null,
  analyzedFiles: [],
  plan: null,
  results: null,
  history: [],

  setInput: (input) =>
    set({
      input,
      analyzedFiles: [],
      plan: null,
      results: null,
    }),

  setOutputPath: (outputPath) => set({ outputPath }),

  setAnalyzedFiles: (analyzedFiles) => set({ analyzedFiles }),

  setPlan: (plan) => set({ plan }),

  setResults: (results) => set({ results }),

  addToHistory: (entry) =>
    set((state) => ({
      history: [entry, ...state.history].slice(0, MAX_HISTORY),
    })),

  clearHistory: () => set({ history: [] }),

  resetSession: () =>
    set({
      input: null,
      outputPath: null,
      analyzedFiles: [],
      plan: null,
      results: null,
    }),

  reset: () =>
    set({
      input: null,
      outputPath: null,
      analyzedFiles: [],
      plan: null,
      results: null,
      history: [],
    }),
}));

/**
 * Selector for input
 */
export const useInput = () => useSessionStore((state) => state.input);

/**
 * Selector for plan
 */
export const usePlan = () => useSessionStore((state) => state.plan);

/**
 * Selector for results
 */
export const useResults = () => useSessionStore((state) => state.results);

/**
 * Selector for history
 */
export const useHistory = () => useSessionStore((state) => state.history);

/**
 * Check if session has input
 */
export const useHasInput = () => useSessionStore((state) => state.input !== null);

/**
 * Check if session has plan
 */
export const useHasPlan = () => useSessionStore((state) => state.plan !== null);
