/**
 * ProgressView component
 * Overall progress display with phases
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";
import { Progress } from "../progress.js";
import { Card, CardContent } from "../card.js";

export type ProcessingStage =
  | "scanning"
  | "analyzing"
  | "planning"
  | "processing"
  | "writing"
  | "complete"
  | "error"
  | "cancelled";

interface ProgressViewProps {
  stage: ProcessingStage;
  progress: number;
  processedCount: number;
  totalCount: number;
  elapsedTime: number;
  className?: string;
}

export function ProgressView({
  stage,
  progress,
  processedCount,
  totalCount,
  elapsedTime,
  className,
}: ProgressViewProps) {
  const isComplete = stage === "complete";
  const isError = stage === "error";
  const isCancelled = stage === "cancelled";
  const isRunning = !isComplete && !isError && !isCancelled;

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        {/* Stage indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isRunning && <LoadingSpinner className="w-5 h-5 text-primary" />}
            {isComplete && <CheckIcon className="w-5 h-5 text-green-500" />}
            {isError && <XIcon className="w-5 h-5 text-red-500" />}
            {isCancelled && <StopIcon className="w-5 h-5 text-yellow-500" />}
            <span className="text-lg font-medium">{getStageLabel(stage)}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatDuration(elapsedTime)}
          </span>
        </div>

        {/* Progress bar */}
        <Progress
          value={progress}
          className={cn(
            "h-3 mb-3",
            isError && "[&>div]:bg-red-500",
            isCancelled && "[&>div]:bg-yellow-500",
            isComplete && "[&>div]:bg-green-500"
          )}
        />

        {/* Stats row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {processedCount} of {totalCount} files
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>

        {/* Stage progress dots */}
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
          {STAGES.map((s, index) => {
            const stageIndex = STAGES.indexOf(stage);
            const isActive = s === stage;
            const isPast = index < stageIndex;

            return (
              <React.Fragment key={s}>
                <div
                  className={cn(
                    "w-3 h-3 rounded-full transition-colors",
                    isActive && "bg-primary ring-2 ring-primary/30",
                    isPast && "bg-primary/60",
                    !isActive && !isPast && "bg-muted"
                  )}
                  title={getStageLabel(s)}
                />
                {index < STAGES.length - 1 && (
                  <div
                    className={cn(
                      "w-6 h-0.5",
                      index < stageIndex ? "bg-primary/60" : "bg-muted"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const STAGES: ProcessingStage[] = [
  "scanning",
  "analyzing",
  "planning",
  "processing",
  "writing",
  "complete",
];

function getStageLabel(stage: ProcessingStage): string {
  switch (stage) {
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
      return "Processing...";
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Icons
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin", className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
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
      <circle cx="12" cy="12" r="10" />
      <rect width="6" height="6" x="9" y="9" />
    </svg>
  );
}
