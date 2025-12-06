/**
 * ProcessingLog component
 * Scrollable log of processing events
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: "info" | "success" | "warning" | "error";
  message: string;
  filePath?: string;
}

interface ProcessingLogProps {
  entries: LogEntry[];
  maxHeight?: string;
  autoScroll?: boolean;
  className?: string;
}

export function ProcessingLog({
  entries,
  maxHeight = "300px",
  autoScroll = true,
  className,
}: ProcessingLogProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  React.useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "font-mono text-xs overflow-auto rounded-lg bg-muted/30 border p-3",
        className
      )}
      style={{ maxHeight }}
    >
      {entries.length === 0 ? (
        <div className="text-muted-foreground text-center py-4">
          Waiting for processing to start...
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <LogLine key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

interface LogLineProps {
  entry: LogEntry;
}

function LogLine({ entry }: LogLineProps) {
  const typeColors = {
    info: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
  };

  const typeIcons = {
    info: "○",
    success: "✓",
    warning: "⚠",
    error: "✗",
  };

  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="text-muted-foreground shrink-0 w-16">
        {formatTime(entry.timestamp)}
      </span>
      <span className={cn("shrink-0", typeColors[entry.type])}>
        {typeIcons[entry.type]}
      </span>
      <span className={cn("flex-1", typeColors[entry.type])}>
        {entry.message}
        {entry.filePath && (
          <span className="text-muted-foreground ml-2 truncate block">
            {entry.filePath}
          </span>
        )}
      </span>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
