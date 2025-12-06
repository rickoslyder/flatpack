/**
 * @flatpack/ui components
 */

// Base components
export { Button, buttonVariants, type ButtonProps } from "./button.js";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./card.js";
export { Badge, badgeVariants, type BadgeProps } from "./badge.js";
export { Progress } from "./progress.js";
export { Switch, type SwitchProps } from "./switch.js";
export { Input, type InputProps } from "./input.js";
export { Textarea, type TextareaProps } from "./textarea.js";
export { Select, type SelectProps } from "./select.js";
export { Tooltip, type TooltipProps } from "./tooltip.js";
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog.js";

// Flatpack-specific components
export { FileTree, type FileTreeNode } from "./file-tree.js";
export { ProcessingProgress } from "./processing-progress.js";

// Layout components
export { AppShell } from "./layout/app-shell.js";
export { Header } from "./layout/header.js";
export { PhaseManager, type AppPhase } from "./layout/phase-manager.js";

// Input phase components
export { DropZone } from "./input-phase/drop-zone.js";
export { TierSelector } from "./input-phase/tier-selector.js";
export { SettingsPanel } from "./input-phase/settings-panel.js";
export { IgnorePatternEditor } from "./input-phase/ignore-pattern-editor.js";
export { InputPhase } from "./input-phase/input-phase.js";

// Preview phase components
export { PreviewFileTree, type PreviewFileNode } from "./preview-phase/preview-file-tree.js";
export { FileDetails } from "./preview-phase/file-details.js";
export { WarningsList, type Warning } from "./preview-phase/warnings-list.js";
export { PreviewSummary, type PreviewStats } from "./preview-phase/preview-summary.js";
export { ProcessingConfirm } from "./preview-phase/processing-confirm.js";
export { PreviewPhase } from "./preview-phase/preview-phase.js";

// Processing phase components
export { ProgressView, type ProcessingStage } from "./processing-phase/progress-view.js";
export { CurrentFile } from "./processing-phase/current-file.js";
export { ProcessingLog, type LogEntry } from "./processing-phase/processing-log.js";
export { ErrorPrompt, type ErrorAction } from "./processing-phase/error-prompt.js";
export { ProcessingPhaseView } from "./processing-phase/processing-phase.js";

// Results phase components
export { ResultsSummary, type ResultsStats } from "./results-phase/results-summary.js";
export { StatsBreakdown } from "./results-phase/stats-breakdown.js";
export { QuickActions } from "./results-phase/quick-actions.js";
export { FailuresList, type FailedFile } from "./results-phase/failures-list.js";
export { ManifestViewer } from "./results-phase/manifest-viewer.js";
export { ResultsPhase } from "./results-phase/results-phase.js";
