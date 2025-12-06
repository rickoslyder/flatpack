/**
 * PreviewSummary component
 * Statistics display for the processing plan
 */

import { cn } from "../../lib/cn.js";
import { Card, CardContent, CardHeader, CardTitle } from "../card.js";
import { Progress } from "../progress.js";

export interface PreviewStats {
  totalFiles: number;
  totalSize: number;
  totalWords: number;
  outputSources: number;
  maxSources: number;
  actions: {
    keep: number;
    convert: number;
    merge: number;
    chunk: number;
    ocr: number;
    fail: number;
  };
}

interface PreviewSummaryProps {
  stats: PreviewStats;
  className?: string;
}

export function PreviewSummary({ stats, className }: PreviewSummaryProps) {
  const sourceUsagePercent = (stats.outputSources / stats.maxSources) * 100;
  const isOverLimit = stats.outputSources > stats.maxSources;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Processing Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source count with progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Output Sources</span>
            <span
              className={cn(
                "font-medium",
                isOverLimit && "text-red-600 dark:text-red-400"
              )}
            >
              {stats.outputSources} / {stats.maxSources}
            </span>
          </div>
          <Progress
            value={Math.min(sourceUsagePercent, 100)}
            className={cn(isOverLimit && "[&>div]:bg-red-500")}
          />
          {isOverLimit && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Exceeds limit! Enable bundling to reduce count.
            </p>
          )}
        </div>

        {/* File stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Files" value={stats.totalFiles} />
          <StatBox label="Total Size" value={formatBytes(stats.totalSize)} />
          <StatBox label="Words" value={formatNumber(stats.totalWords)} />
        </div>

        {/* Action breakdown */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Processing Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ActionStat label="Keep" count={stats.actions.keep} color="bg-green-500" />
            <ActionStat label="Convert" count={stats.actions.convert} color="bg-blue-500" />
            <ActionStat label="Merge" count={stats.actions.merge} color="bg-purple-500" />
            <ActionStat label="Chunk" count={stats.actions.chunk} color="bg-orange-500" />
            <ActionStat label="OCR" count={stats.actions.ocr} color="bg-cyan-500" />
            <ActionStat label="Fail" count={stats.actions.fail} color="bg-red-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatBoxProps {
  label: string;
  value: string | number;
}

function StatBox({ label, value }: StatBoxProps) {
  return (
    <div className="text-center p-2 rounded-md bg-muted/50">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

interface ActionStatProps {
  label: string;
  count: number;
  color: string;
}

function ActionStat({ label, count, color }: ActionStatProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{count}</span>
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

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}
