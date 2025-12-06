/**
 * ProcessingProgress component
 * Displays real-time processing status and progress
 */

import { cn } from "../lib/cn.js";
import { Progress } from "./progress.js";
import { Card, CardContent, CardHeader, CardTitle } from "./card.js";
import { useProgress, useIsProcessing, useElapsedTime } from "../stores/index.js";

interface ProcessingProgressProps {
  className?: string;
}

/**
 * Processing progress display
 */
export function ProcessingProgress({ className }: ProcessingProgressProps) {
  const { phase, progress, currentFile, message } = useProgress();
  const isProcessing = useIsProcessing();
  const elapsedTime = useElapsedTime();

  if (phase === "idle") {
    return null;
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{getPhaseTitle(phase)}</span>
          {isProcessing && (
            <span className="text-sm font-normal text-muted-foreground">
              {formatDuration(elapsedTime)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={progress} max={100} />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{message}</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>

        {currentFile && (
          <div className="text-xs text-muted-foreground truncate">
            Current: {currentFile}
          </div>
        )}

        {phase === "complete" && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <span>✓</span>
            <span>Processing complete!</span>
          </div>
        )}

        {phase === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <span>✗</span>
            <span>Processing failed</span>
          </div>
        )}

        {phase === "cancelled" && (
          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <span>⚠</span>
            <span>Processing cancelled</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Get user-friendly phase title
 */
function getPhaseTitle(phase: string): string {
  switch (phase) {
    case "scanning":
      return "Scanning Files";
    case "analyzing":
      return "Analyzing Content";
    case "planning":
      return "Planning Processing";
    case "processing":
      return "Processing Files";
    case "writing":
      return "Writing Output";
    case "complete":
      return "Complete";
    case "error":
      return "Error";
    case "cancelled":
      return "Cancelled";
    default:
      return "Processing";
  }
}

/**
 * Format duration in ms to human readable
 */
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

