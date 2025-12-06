/**
 * ProcessingPhaseView component
 * Complete processing phase layout
 */

import { cn } from "../../lib/cn.js";
import { Button } from "../button.js";
import { ProgressView, type ProcessingStage } from "./progress-view.js";
import { CurrentFile } from "./current-file.js";
import { ProcessingLog, type LogEntry } from "./processing-log.js";
import { ErrorPrompt, type ErrorAction } from "./error-prompt.js";

interface ProcessingPhaseViewProps {
  stage: ProcessingStage;
  progress: number;
  processedCount: number;
  totalCount: number;
  elapsedTime: number;
  currentFile: string | null;
  currentAction?: "keep" | "convert" | "merge" | "chunk" | "ocr";
  logEntries: LogEntry[];
  error: {
    message: string;
    filePath?: string;
    details?: string;
  } | null;
  onCancel: () => void;
  onErrorAction: (action: ErrorAction) => void;
  className?: string;
}

export function ProcessingPhaseView({
  stage,
  progress,
  processedCount,
  totalCount,
  elapsedTime,
  currentFile,
  currentAction,
  logEntries,
  error,
  onCancel,
  onErrorAction,
  className,
}: ProcessingPhaseViewProps) {
  const isRunning = !["complete", "error", "cancelled"].includes(stage);

  return (
    <div className={cn("flex flex-col h-full p-6", className)}>
      {/* Progress section */}
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <ProgressView
          stage={stage}
          progress={progress}
          processedCount={processedCount}
          totalCount={totalCount}
          elapsedTime={elapsedTime}
        />

        {/* Current file */}
        {isRunning && currentFile && (
          <CurrentFile filePath={currentFile} action={currentAction} />
        )}

        {/* Cancel button */}
        {isRunning && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={onCancel}>
              <StopIcon className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Log section */}
      <div className="flex-1 mt-6 min-h-0">
        <h3 className="text-sm font-medium mb-2">Processing Log</h3>
        <ProcessingLog
          entries={logEntries}
          maxHeight="calc(100% - 2rem)"
          className="h-full"
        />
      </div>

      {/* Error prompt */}
      <ErrorPrompt
        open={!!error}
        error={error}
        onAction={onErrorAction}
      />
    </div>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="14" x="5" y="5" rx="2" />
    </svg>
  );
}
