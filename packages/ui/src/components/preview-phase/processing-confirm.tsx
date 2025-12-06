/**
 * ProcessingConfirm component
 * Confirm/Cancel buttons for starting processing
 */

import { cn } from "../../lib/cn.js";
import { Button } from "../button.js";

interface ProcessingConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
  isDisabled?: boolean;
  warningCount?: number;
  className?: string;
}

export function ProcessingConfirm({
  onConfirm,
  onCancel,
  isDisabled = false,
  warningCount = 0,
  className,
}: ProcessingConfirmProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 p-4 border-t bg-background", className)}>
      <div className="text-sm text-muted-foreground">
        {warningCount > 0 ? (
          <span className="text-yellow-600 dark:text-yellow-400">
            {warningCount} warning{warningCount !== 1 ? "s" : ""} - review before proceeding
          </span>
        ) : (
          <span>Ready to process</span>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel}>
          Back
        </Button>
        <Button onClick={onConfirm} disabled={isDisabled}>
          <PlayIcon className="w-4 h-4 mr-2" />
          Start Processing
        </Button>
      </div>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
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
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
