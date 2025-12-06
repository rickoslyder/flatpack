/**
 * ErrorPrompt component
 * Error dialog with Skip/Retry/Abort options
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../dialog.js";
import { Button } from "../button.js";

export type ErrorAction = "skip" | "retry" | "abort";

interface ErrorPromptProps {
  open: boolean;
  error: {
    message: string;
    filePath?: string;
    details?: string;
  } | null;
  onAction: (action: ErrorAction) => void;
  canRetry?: boolean;
}

export function ErrorPrompt({
  open,
  error,
  onAction,
  canRetry = true,
}: ErrorPromptProps) {
  if (!error) return null;

  return (
    <Dialog open={open} onOpenChange={() => onAction("skip")}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ErrorIcon className="w-5 h-5" />
            Processing Error
          </DialogTitle>
          <DialogDescription>
            An error occurred while processing a file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error message */}
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {error.message}
            </p>
          </div>

          {/* File path */}
          {error.filePath && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">File</span>
              <p className="text-sm font-mono truncate">{error.filePath}</p>
            </div>
          )}

          {/* Details */}
          {error.details && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Details</span>
              <p className="text-sm text-muted-foreground">{error.details}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            onClick={() => onAction("abort")}
            className="sm:order-1"
          >
            Abort
          </Button>
          <div className="flex gap-2 sm:order-2">
            <Button variant="outline" onClick={() => onAction("skip")}>
              Skip File
            </Button>
            {canRetry && (
              <Button onClick={() => onAction("retry")}>
                <RetryIcon className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ErrorIcon({ className }: { className?: string }) {
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

function RetryIcon({ className }: { className?: string }) {
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
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
