/**
 * ResultsSummary component
 * Success/warning/failure count display
 */

import { cn } from "../../lib/cn.js";
import { Card, CardContent } from "../card.js";

export interface ResultsStats {
  success: number;
  warnings: number;
  failures: number;
  totalFiles: number;
  outputSources: number;
  totalSize: number;
  totalWords: number;
  duration: number;
}

interface ResultsSummaryProps {
  stats: ResultsStats;
  className?: string;
}

export function ResultsSummary({ stats, className }: ResultsSummaryProps) {
  const isSuccess = stats.failures === 0;

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        {/* Main status */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {isSuccess ? (
            <>
              <SuccessIcon className="w-12 h-12 text-green-500" />
              <div>
                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
                  Processing Complete!
                </h2>
                <p className="text-muted-foreground">
                  All files processed successfully
                </p>
              </div>
            </>
          ) : (
            <>
              <WarningIcon className="w-12 h-12 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  Processing Finished
                </h2>
                <p className="text-muted-foreground">
                  Some files could not be processed
                </p>
              </div>
            </>
          )}
        </div>

        {/* Status counts */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatusCard
            label="Successful"
            count={stats.success}
            variant="success"
          />
          <StatusCard
            label="Warnings"
            count={stats.warnings}
            variant="warning"
          />
          <StatusCard
            label="Failed"
            count={stats.failures}
            variant="error"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
          <StatItem label="Output Sources" value={stats.outputSources.toString()} />
          <StatItem label="Total Files" value={stats.totalFiles.toString()} />
          <StatItem label="Total Size" value={formatBytes(stats.totalSize)} />
          <StatItem label="Duration" value={formatDuration(stats.duration)} />
        </div>
      </CardContent>
    </Card>
  );
}

interface StatusCardProps {
  label: string;
  count: number;
  variant: "success" | "warning" | "error";
}

function StatusCard({ label, count, variant }: StatusCardProps) {
  const colors = {
    success: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    error: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };

  return (
    <div className={cn("p-4 rounded-lg border text-center", colors[variant])}>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function SuccessIcon({ className }: { className?: string }) {
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

function WarningIcon({ className }: { className?: string }) {
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
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
