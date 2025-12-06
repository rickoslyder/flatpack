/**
 * FailuresList component
 * List of failed files with reasons
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";
import { Card, CardContent, CardHeader, CardTitle } from "../card.js";

export interface FailedFile {
  path: string;
  reason: string;
  details?: string;
}

interface FailuresListProps {
  failures: FailedFile[];
  className?: string;
}

export function FailuresList({ failures, className }: FailuresListProps) {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

  if (failures.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-red-500/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
          <ErrorIcon className="w-4 h-4" />
          {failures.length} Failed File{failures.length !== 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {failures.map((failure, index) => (
            <li
              key={failure.path}
              className="rounded-md bg-red-500/5 border border-red-500/20 overflow-hidden"
            >
              <button
                type="button"
                className="w-full p-3 text-left flex items-start gap-3 hover:bg-red-500/10 transition-colors"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <ChevronIcon
                  className={cn(
                    "w-4 h-4 mt-0.5 shrink-0 transition-transform text-muted-foreground",
                    expandedIndex === index && "rotate-90"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getFileName(failure.path)}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">{failure.reason}</p>
                </div>
              </button>

              {expandedIndex === index && (
                <div className="px-3 pb-3 pt-0 pl-10">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-mono truncate">{failure.path}</p>
                    {failure.details && (
                      <p className="mt-2 text-red-600/80 dark:text-red-400/80">
                        {failure.details}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function getFileName(path: string): string {
  return path.split("/").pop() || path;
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

function ChevronIcon({ className }: { className?: string }) {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
