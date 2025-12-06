/**
 * ResultsPhase component
 * Complete results phase layout
 */

import { cn } from "../../lib/cn.js";
import { ResultsSummary, type ResultsStats } from "./results-summary.js";
import { StatsBreakdown } from "./stats-breakdown.js";
import { QuickActions } from "./quick-actions.js";
import { FailuresList, type FailedFile } from "./failures-list.js";
import { ManifestViewer } from "./manifest-viewer.js";

interface ResultsPhaseProps {
  stats: ResultsStats;
  actions: {
    keep: number;
    convert: number;
    merge: number;
    chunk: number;
    ocr: number;
  };
  failures: FailedFile[];
  manifest: object | null;
  onOpenFolder?: () => void;
  onDownloadZip?: () => void;
  onRetryFailed?: () => void;
  onStartOver: () => void;
  isDesktop?: boolean;
  className?: string;
}

export function ResultsPhase({
  stats,
  actions,
  failures,
  manifest,
  onOpenFolder,
  onDownloadZip,
  onRetryFailed,
  onStartOver,
  isDesktop = false,
  className,
}: ResultsPhaseProps) {
  return (
    <div className={cn("flex flex-col h-full overflow-auto p-6", className)}>
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Summary */}
        <ResultsSummary stats={stats} />

        {/* Quick actions */}
        <QuickActions
          onOpenFolder={onOpenFolder}
          onDownloadZip={onDownloadZip}
          onRetryFailed={onRetryFailed}
          onStartOver={onStartOver}
          hasFailures={failures.length > 0}
          isDesktop={isDesktop}
        />

        {/* Detailed breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <StatsBreakdown actions={actions} />

          {/* Failures list if any */}
          {failures.length > 0 && (
            <FailuresList failures={failures} />
          )}
        </div>

        {/* Manifest preview */}
        <ManifestViewer manifest={manifest} />
      </div>
    </div>
  );
}
