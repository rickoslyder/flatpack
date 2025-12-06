/**
 * CurrentFile component
 * Displays the currently processing file
 */

import { cn } from "../../lib/cn.js";
import { Badge } from "../badge.js";

interface CurrentFileProps {
  filePath: string | null;
  action?: "keep" | "convert" | "merge" | "chunk" | "ocr";
  className?: string;
}

export function CurrentFile({ filePath, action, className }: CurrentFileProps) {
  if (!filePath) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-muted/50 border",
        className
      )}
    >
      <FileIcon className="w-5 h-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{getFileName(filePath)}</span>
          {action && (
            <Badge variant={action} className="text-[10px] shrink-0">
              {action}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{filePath}</p>
      </div>
      <LoadingDots />
    </div>
  );
}

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

function LoadingDots() {
  return (
    <div className="flex gap-1">
      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
    </div>
  );
}

function FileIcon({ className }: { className?: string }) {
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
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
