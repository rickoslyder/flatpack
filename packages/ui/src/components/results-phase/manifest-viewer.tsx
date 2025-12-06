/**
 * ManifestViewer component
 * Optional preview of the generated manifest
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";
import { Card, CardContent, CardHeader, CardTitle } from "../card.js";
import { Button } from "../button.js";

interface ManifestViewerProps {
  manifest: object | null;
  className?: string;
}

export function ManifestViewer({ manifest, className }: ManifestViewerProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!manifest) {
    return null;
  }

  const jsonString = JSON.stringify(manifest, null, 2);
  const lines = jsonString.split("\n");
  const previewLines = isExpanded ? lines : lines.slice(0, 15);
  const hasMore = lines.length > 15;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileIcon className="w-4 h-4" />
            FLATPACK_MANIFEST.json
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(jsonString)}
          >
            <CopyIcon className="w-4 h-4 mr-1" />
            Copy
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre
          className={cn(
            "text-xs font-mono bg-muted/50 p-3 rounded-md overflow-x-auto",
            !isExpanded && hasMore && "max-h-[300px]"
          )}
        >
          <code>{previewLines.join("\n")}</code>
          {!isExpanded && hasMore && (
            <span className="text-muted-foreground">...</span>
          )}
        </pre>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show less" : `Show all (${lines.length} lines)`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
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

function CopyIcon({ className }: { className?: string }) {
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
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
