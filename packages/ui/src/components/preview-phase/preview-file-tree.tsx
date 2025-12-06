/**
 * PreviewFileTree component
 * File tree for preview phase with action badges
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";
import { Badge } from "../badge.js";

export interface PreviewFileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: PreviewFileNode[];
  size?: number;
  wordCount?: number;
  action?: "keep" | "convert" | "merge" | "chunk" | "fail" | "ocr";
  warning?: string;
}

interface PreviewFileTreeProps {
  data: PreviewFileNode[];
  selectedPath?: string;
  onSelect?: (node: PreviewFileNode) => void;
  className?: string;
}

export function PreviewFileTree({
  data,
  selectedPath,
  onSelect,
  className,
}: PreviewFileTreeProps) {
  return (
    <div className={cn("text-sm overflow-auto", className)}>
      {data.map((node) => (
        <PreviewFileTreeItem
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  );
}

interface PreviewFileTreeItemProps {
  node: PreviewFileNode;
  selectedPath?: string;
  onSelect?: (node: PreviewFileNode) => void;
  depth: number;
}

function PreviewFileTreeItem({
  node,
  selectedPath,
  onSelect,
  depth,
}: PreviewFileTreeItemProps) {
  const [isOpen, setIsOpen] = React.useState(depth < 2);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.isDirectory && node.children && node.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDirectory) {
      setIsOpen(!isOpen);
    }
    onSelect?.(node);
  };

  const indent = depth * 16;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 cursor-pointer rounded hover:bg-accent",
          isSelected && "bg-accent",
          node.warning && "text-yellow-600 dark:text-yellow-400"
        )}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse icon */}
        {node.isDirectory ? (
          <span className="w-4 text-muted-foreground">
            {hasChildren ? (isOpen ? "▼" : "▶") : ""}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* File/Folder icon */}
        <span className="w-4">{node.isDirectory ? "📁" : getFileIcon(node)}</span>

        {/* Name */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Word count */}
        {!node.isDirectory && node.wordCount !== undefined && (
          <span className="text-xs text-muted-foreground">
            {formatNumber(node.wordCount)} words
          </span>
        )}

        {/* Action badge */}
        {!node.isDirectory && node.action && (
          <Badge variant={node.action} className="text-[10px] px-1.5 py-0">
            {node.action}
          </Badge>
        )}

        {/* Warning indicator */}
        {node.warning && (
          <span className="text-yellow-500" title={node.warning}>
            ⚠
          </span>
        )}
      </div>

      {/* Children */}
      {isOpen && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <PreviewFileTreeItem
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getFileIcon(node: PreviewFileNode): string {
  switch (node.action) {
    case "convert":
      return "📄";
    case "ocr":
      return "🖼️";
    case "fail":
      return "⚠️";
    default:
      return "📄";
  }
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}
