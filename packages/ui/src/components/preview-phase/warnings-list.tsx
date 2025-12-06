/**
 * WarningsList component
 * Displays processing warnings
 */

import { cn } from "../../lib/cn.js";
import { Card, CardContent, CardHeader, CardTitle } from "../card.js";

export interface Warning {
  id: string;
  type: "size" | "count" | "format" | "conversion" | "general";
  message: string;
  details?: string;
  filePath?: string;
}

interface WarningsListProps {
  warnings: Warning[];
  onWarningClick?: (warning: Warning) => void;
  className?: string;
}

export function WarningsList({ warnings, onWarningClick, className }: WarningsListProps) {
  if (warnings.length === 0) {
    return null;
  }

  const groupedWarnings = groupWarningsByType(warnings);

  return (
    <Card className={cn("border-yellow-500/50", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <WarningIcon className="w-4 h-4" />
          {warnings.length} Warning{warnings.length !== 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(groupedWarnings).map(([type, typeWarnings]) => (
          <div key={type}>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
              {getTypeLabel(type as Warning["type"])}
            </h4>
            <ul className="space-y-1">
              {typeWarnings.map((warning) => (
                <li
                  key={warning.id}
                  className={cn(
                    "text-sm p-2 rounded-md bg-yellow-500/5 hover:bg-yellow-500/10",
                    onWarningClick && "cursor-pointer"
                  )}
                  onClick={() => onWarningClick?.(warning)}
                >
                  <p className="text-yellow-600 dark:text-yellow-400">{warning.message}</p>
                  {warning.details && (
                    <p className="text-xs text-muted-foreground mt-1">{warning.details}</p>
                  )}
                  {warning.filePath && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                      {warning.filePath}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function groupWarningsByType(warnings: Warning[]): Record<string, Warning[]> {
  return warnings.reduce((acc, warning) => {
    const type = warning.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(warning);
    return acc;
  }, {} as Record<string, Warning[]>);
}

function getTypeLabel(type: Warning["type"]): string {
  switch (type) {
    case "size":
      return "Size Limits";
    case "count":
      return "Source Count";
    case "format":
      return "File Format";
    case "conversion":
      return "Conversion";
    case "general":
    default:
      return "General";
  }
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
