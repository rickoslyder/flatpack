/**
 * StatsBreakdown component
 * Detailed stats by action type
 */

import { cn } from "../../lib/cn.js";
import { Card, CardContent, CardHeader, CardTitle } from "../card.js";

interface ActionStats {
  keep: number;
  convert: number;
  merge: number;
  chunk: number;
  ocr: number;
}

interface StatsBreakdownProps {
  actions: ActionStats;
  className?: string;
}

export function StatsBreakdown({ actions, className }: StatsBreakdownProps) {
  const total = Object.values(actions).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const items = [
    { key: "keep", label: "Kept As-Is", color: "bg-green-500" },
    { key: "convert", label: "Converted", color: "bg-blue-500" },
    { key: "merge", label: "Merged", color: "bg-purple-500" },
    { key: "chunk", label: "Chunked", color: "bg-orange-500" },
    { key: "ocr", label: "OCR Extracted", color: "bg-cyan-500" },
  ] as const;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Processing Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(({ key, label, color }) => {
          const count = actions[key];
          if (count === 0) return null;
          const percentage = (count / total) * 100;

          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", color)} />
                  <span>{label}</span>
                </div>
                <span className="font-medium">{count}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", color)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
