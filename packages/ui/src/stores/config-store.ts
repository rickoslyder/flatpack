/**
 * Configuration store
 * Manages user preferences and settings
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NotebookTier, PathSeparator, PdfHandling } from "@flatpack/core";

/**
 * User preferences
 */
export interface UserPreferences {
  /** Theme preference */
  theme: "light" | "dark" | "system";
  /** Auto-start processing after input selection */
  autoStart: boolean;
  /** Show advanced options */
  showAdvanced: boolean;
  /** Remember last output path */
  rememberOutputPath: boolean;
  /** Last used output path */
  lastOutputPath?: string;
}

/**
 * Processing configuration
 */
export interface ProcessingConfig {
  /** NotebookLM tier */
  tier: NotebookTier;
  /** Path separator style */
  pathSeparator: PathSeparator;
  /** PDF handling strategy */
  pdfHandling: PdfHandling;
  /** OCR language */
  ocrLanguage: string;
  /** Custom ignore patterns */
  customIgnorePatterns: string[];
  /** Soft warning threshold */
  softWarningThreshold: number;
  /** Create ZIP output */
  createZip: boolean;
}

/**
 * Config store state
 */
export interface ConfigState {
  /** User preferences */
  preferences: UserPreferences;
  /** Processing configuration */
  config: ProcessingConfig;

  /** Update preferences */
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  /** Update processing config */
  setConfig: (config: Partial<ProcessingConfig>) => void;
  /** Reset to defaults */
  reset: () => void;
}

/**
 * Default preferences
 */
const defaultPreferences: UserPreferences = {
  theme: "system",
  autoStart: false,
  showAdvanced: false,
  rememberOutputPath: true,
};

/**
 * Default processing config
 */
const defaultConfig: ProcessingConfig = {
  tier: "pro",
  pathSeparator: "underscore",
  pdfHandling: "convert",
  ocrLanguage: "eng",
  customIgnorePatterns: [],
  softWarningThreshold: 400000,
  createZip: false,
};

/**
 * Config store
 */
export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      preferences: defaultPreferences,
      config: defaultConfig,

      setPreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      setConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),

      reset: () =>
        set({
          preferences: defaultPreferences,
          config: defaultConfig,
        }),
    }),
    {
      name: "flatpack-config",
      version: 1,
    }
  )
);

/**
 * Selector for theme with setter
 */
export const useTheme = (): [string, (theme: "light" | "dark" | "system") => void] => {
  const theme = useConfigStore((state) => state.preferences.theme);
  const setPreferences = useConfigStore((state) => state.setPreferences);
  return [theme, (t) => setPreferences({ theme: t })];
};

/**
 * Selector for tier with setter
 */
export const useTier = (): [NotebookTier, (tier: NotebookTier) => void] => {
  const tier = useConfigStore((state) => state.config.tier);
  const setConfig = useConfigStore((state) => state.setConfig);
  return [tier, (t) => setConfig({ tier: t })];
};

/**
 * Selector for full config with setter
 */
export const useConfig = (): [ProcessingConfig, (config: Partial<ProcessingConfig>) => void] => {
  const config = useConfigStore((state) => state.config);
  const setConfig = useConfigStore((state) => state.setConfig);
  return [config, setConfig];
};
