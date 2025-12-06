/**
 * QuickActions component
 * Action buttons for results phase
 */

import { cn } from "../../lib/cn.js";
import { Button } from "../button.js";

interface QuickActionsProps {
  onOpenFolder?: () => void;
  onDownloadZip?: () => void;
  onRetryFailed?: () => void;
  onStartOver: () => void;
  hasFailures?: boolean;
  isDesktop?: boolean;
  className?: string;
}

export function QuickActions({
  onOpenFolder,
  onDownloadZip,
  onRetryFailed,
  onStartOver,
  hasFailures = false,
  isDesktop = false,
  className,
}: QuickActionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-3 justify-center", className)}>
      {/* Open output folder (desktop only) */}
      {isDesktop && onOpenFolder && (
        <Button onClick={onOpenFolder} size="lg">
          <FolderOpenIcon className="w-4 h-4 mr-2" />
          Open Output Folder
        </Button>
      )}

      {/* Download ZIP (web) */}
      {!isDesktop && onDownloadZip && (
        <Button onClick={onDownloadZip} size="lg">
          <DownloadIcon className="w-4 h-4 mr-2" />
          Download ZIP
        </Button>
      )}

      {/* Retry failed (if any failures) */}
      {hasFailures && onRetryFailed && (
        <Button variant="outline" onClick={onRetryFailed}>
          <RetryIcon className="w-4 h-4 mr-2" />
          Retry Failed
        </Button>
      )}

      {/* Start over */}
      <Button variant="outline" onClick={onStartOver}>
        <RefreshIcon className="w-4 h-4 mr-2" />
        Start Over
      </Button>
    </div>
  );
}

// Icons
function FolderOpenIcon({ className }: { className?: string }) {
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
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
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

function RefreshIcon({ className }: { className?: string }) {
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
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}
