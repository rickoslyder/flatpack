/**
 * DropZone component
 * Main drag-and-drop zone for folder/ZIP input
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";
import { Button } from "../button.js";

interface DropZoneProps {
  onFolderSelect?: () => void;
  onZipSelect?: () => void;
  onDrop?: (items: DataTransferItemList) => void;
  isLoading?: boolean;
  className?: string;
}

export function DropZone({
  onFolderSelect,
  onZipSelect,
  onDrop,
  isLoading = false,
  className,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (onDrop && e.dataTransfer.items.length > 0) {
      onDrop(e.dataTransfer.items);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-colors",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        isLoading && "pointer-events-none opacity-50",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Icon */}
      <div className="mb-6">
        <FolderIcon
          className={cn(
            "w-16 h-16 transition-colors",
            isDragOver ? "text-primary" : "text-muted-foreground"
          )}
        />
      </div>

      {/* Text */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {isDragOver ? "Drop to add files" : "Select input source"}
        </h2>
        <p className="text-muted-foreground">
          Drag and drop a folder or ZIP file, or use the buttons below
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button onClick={onFolderSelect} disabled={isLoading} variant="default">
          <FolderOpenIcon className="w-4 h-4 mr-2" />
          Select Folder
        </Button>
        <Button onClick={onZipSelect} disabled={isLoading} variant="outline">
          <ArchiveIcon className="w-4 h-4 mr-2" />
          Select ZIP
        </Button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner className="w-8 h-8" />
            <span className="text-sm text-muted-foreground">Scanning files...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FolderOpenIcon({ className }: { className?: string }) {
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
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
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
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin", className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
