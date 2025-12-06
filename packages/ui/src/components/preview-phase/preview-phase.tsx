/**
 * PreviewPhase component
 * Complete preview phase layout
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";
import { PreviewFileTree, type PreviewFileNode } from "./preview-file-tree.js";
import { FileDetails } from "./file-details.js";
import { WarningsList, type Warning } from "./warnings-list.js";
import { PreviewSummary, type PreviewStats } from "./preview-summary.js";
import { ProcessingConfirm } from "./processing-confirm.js";

interface PreviewPhaseProps {
  files: PreviewFileNode[];
  stats: PreviewStats;
  warnings: Warning[];
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function PreviewPhase({
  files,
  stats,
  warnings,
  onConfirm,
  onCancel,
  className,
}: PreviewPhaseProps) {
  const [selectedFile, setSelectedFile] = React.useState<PreviewFileNode | null>(null);

  const handleFileSelect = (node: PreviewFileNode) => {
    setSelectedFile(node);
  };

  const handleWarningClick = (warning: Warning) => {
    // Find and select the file associated with the warning
    if (warning.filePath) {
      const file = findFileByPath(files, warning.filePath);
      if (file) {
        setSelectedFile(file);
      }
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree panel */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="p-3 border-b bg-muted/30">
            <h2 className="text-sm font-medium">Processing Plan</h2>
            <p className="text-xs text-muted-foreground">
              {stats.totalFiles} files will be processed
            </p>
          </div>
          <PreviewFileTree
            data={files}
            selectedPath={selectedFile?.path}
            onSelect={handleFileSelect}
            className="flex-1 p-2"
          />
        </div>

        {/* Details and summary panel */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* File details */}
          <div className="flex-1 p-4 overflow-auto">
            <FileDetails file={selectedFile} />
          </div>

          {/* Summary and warnings */}
          <div className="border-t p-4 space-y-4 overflow-auto max-h-[40%]">
            <PreviewSummary stats={stats} />
            {warnings.length > 0 && (
              <WarningsList warnings={warnings} onWarningClick={handleWarningClick} />
            )}
          </div>
        </div>
      </div>

      {/* Confirmation bar */}
      <ProcessingConfirm
        onConfirm={onConfirm}
        onCancel={onCancel}
        warningCount={warnings.length}
        isDisabled={stats.outputSources > stats.maxSources}
      />
    </div>
  );
}

function findFileByPath(files: PreviewFileNode[], path: string): PreviewFileNode | null {
  for (const file of files) {
    if (file.path === path) {
      return file;
    }
    if (file.children) {
      const found = findFileByPath(file.children, path);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
