/**
 * FileTree component
 * Displays directory structure with collapsible folders
 */

import * as React from "react";
import { cn } from "../lib/cn.js";
import { Badge } from "./badge.js";

/**
 * File tree node data
 */
export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
  size?: number;
  wordCount?: number;
  action?: "keep" | "convert" | "merge" | "chunk" | "fail" | "ocr";
  isSelected?: boolean;
}

interface FileTreeProps {
  data: FileTreeNode[];
  onSelect?: (node: FileTreeNode) => void;
  selectedPath?: string;
  className?: string;
  showActions?: boolean;
  showStats?: boolean;
}

/**
 * FileTree component
 */
export function FileTree({
  data,
  onSelect,
  selectedPath,
  className,
  showActions = true,
  showStats = false,
}: FileTreeProps) {
  return (
    <div className={cn("text-sm", className)}>
      {data.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          onSelect={onSelect}
          selectedPath={selectedPath}
          showActions={showActions}
          showStats={showStats}
          depth={0}
        />
      ))}
    </div>
  );
}

interface FileTreeItemProps {
  node: FileTreeNode;
  onSelect?: (node: FileTreeNode) => void;
  selectedPath?: string;
  showActions: boolean;
  showStats: boolean;
  depth: number;
}

function FileTreeItem({
  node,
  onSelect,
  selectedPath,
  showActions,
  showStats,
  depth,
}: FileTreeItemProps) {
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
          "flex items-center gap-2 py-1 px-2 cursor-pointer rounded hover:bg-accent",
          isSelected && "bg-accent"
        )}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse icon */}
        {node.isDirectory && (
          <span className="w-4 text-muted-foreground">
            {hasChildren ? (isOpen ? "▼" : "▶") : ""}
          </span>
        )}
        {!node.isDirectory && <span className="w-4" />}

        {/* File/Folder icon */}
        <span className="w-4">
          {node.isDirectory ? "📁" : "📄"}
        </span>

        {/* Name */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Stats */}
        {showStats && !node.isDirectory && node.wordCount !== undefined && (
          <span className="text-xs text-muted-foreground">
            {formatNumber(node.wordCount)} words
          </span>
        )}

        {/* Action badge */}
        {showActions && !node.isDirectory && node.action && (
          <Badge variant={node.action} className="text-[10px] px-1.5 py-0">
            {node.action}
          </Badge>
        )}
      </div>

      {/* Children */}
      {isOpen && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              showActions={showActions}
              showStats={showStats}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Format number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

