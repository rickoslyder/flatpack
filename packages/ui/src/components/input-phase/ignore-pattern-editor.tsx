/**
 * IgnorePatternEditor component
 * Glob pattern editor for ignore rules
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";
import { Button } from "../button.js";
import { Input } from "../input.js";
import { Badge } from "../badge.js";

interface IgnorePatternEditorProps {
  patterns: string[];
  onChange: (patterns: string[]) => void;
  className?: string;
}

export function IgnorePatternEditor({
  patterns,
  onChange,
  className,
}: IgnorePatternEditorProps) {
  const [newPattern, setNewPattern] = React.useState("");

  const handleAdd = () => {
    const pattern = newPattern.trim();
    if (pattern && !patterns.includes(pattern)) {
      onChange([...patterns, pattern]);
      setNewPattern("");
    }
  };

  const handleRemove = (pattern: string) => {
    onChange(patterns.filter((p) => p !== pattern));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <label className="text-sm font-medium">Ignore Patterns</label>

      {/* Pattern list */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {patterns.length === 0 ? (
          <span className="text-sm text-muted-foreground">No patterns defined</span>
        ) : (
          patterns.map((pattern) => (
            <Badge
              key={pattern}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <code className="text-xs">{pattern}</code>
              <button
                type="button"
                onClick={() => handleRemove(pattern)}
                className="ml-1 hover:text-destructive"
                aria-label={`Remove ${pattern}`}
              >
                <XIcon className="w-3 h-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* Add pattern input */}
      <div className="flex gap-2">
        <Input
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., node_modules/**, *.log"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!newPattern.trim()}
        >
          Add
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Use glob patterns to exclude files. Examples: **/*.log, node_modules/**, .git/**
      </p>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
