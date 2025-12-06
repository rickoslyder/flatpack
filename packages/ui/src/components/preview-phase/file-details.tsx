/**
 * FileDetails component
 * Displays detailed information about a selected file
 */

import { cn } from "../../lib/cn.js";
import { Card, CardContent, CardHeader, CardTitle } from "../card.js";
import { Badge } from "../badge.js";
import type { PreviewFileNode } from "./preview-file-tree.js";

interface FileDetailsProps {
  file: PreviewFileNode | null;
  className?: string;
}

export function FileDetails({ file, className }: FileDetailsProps) {
  if (!file) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="h-full flex items-center justify-center text-muted-foreground">
          Select a file to view details
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full overflow-auto", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="truncate">{file.name}</span>
          {file.action && (
            <Badge variant={file.action} className="text-[10px] shrink-0">
              {file.action}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Path */}
        <DetailRow label="Path" value={file.path} />

        {/* Type */}
        <DetailRow
          label="Type"
          value={file.isDirectory ? "Directory" : "File"}
        />

        {/* Size */}
        {file.size !== undefined && (
          <DetailRow label="Size" value={formatBytes(file.size)} />
        )}

        {/* Word count */}
        {file.wordCount !== undefined && (
          <DetailRow label="Word Count" value={formatNumber(file.wordCount)} />
        )}

        {/* Action explanation */}
        {file.action && (
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Action</span>
            <p className="text-sm">{getActionExplanation(file.action)}</p>
          </div>
        )}

        {/* Warning */}
        {file.warning && (
          <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 block mb-1">
              Warning
            </span>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              {file.warning}
            </p>
          </div>
        )}

        {/* Children count for directories */}
        {file.isDirectory && file.children && (
          <DetailRow
            label="Contents"
            value={`${file.children.length} items`}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div>
      <span className="text-xs text-muted-foreground block mb-0.5">{label}</span>
      <span className="text-sm break-all">{value}</span>
    </div>
  );
}

function getActionExplanation(action: string): string {
  switch (action) {
    case "keep":
      return "File will be copied as-is with path flattening";
    case "convert":
      return "File will be converted to plain text/markdown";
    case "merge":
      return "File will be merged with related files into a bundle";
    case "chunk":
      return "File is too large and will be split into multiple parts";
    case "ocr":
      return "Text will be extracted from image using OCR";
    case "fail":
      return "File cannot be processed (unsupported format)";
    default:
      return "Standard processing";
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}
