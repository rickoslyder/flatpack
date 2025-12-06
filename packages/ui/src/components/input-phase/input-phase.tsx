/**
 * InputPhase component
 * Complete input phase layout
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";
import { DropZone } from "./drop-zone.js";
import { SettingsPanel } from "./settings-panel.js";

interface InputPhaseProps {
  onFolderSelect?: () => void;
  onZipSelect?: () => void;
  onDrop?: (items: DataTransferItemList) => void;
  isLoading?: boolean;
  className?: string;
}

export function InputPhase({
  onFolderSelect,
  onZipSelect,
  onDrop,
  isLoading = false,
  className,
}: InputPhaseProps) {
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <div className={cn("flex h-full", className)}>
      {/* Main content area */}
      <div className="flex-1 flex flex-col p-6">
        <div className="flex-1 flex items-center justify-center">
          <DropZone
            onFolderSelect={onFolderSelect}
            onZipSelect={onZipSelect}
            onDrop={onDrop}
            isLoading={isLoading}
            className="max-w-xl w-full"
          />
        </div>

        {/* Mobile settings toggle */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="lg:hidden text-sm text-muted-foreground hover:text-foreground mt-4 text-center"
        >
          {showSettings ? "Hide settings" : "Show settings"}
        </button>
      </div>

      {/* Settings sidebar - visible on large screens or when toggled */}
      <aside
        className={cn(
          "w-80 border-l bg-muted/20 overflow-y-auto p-4",
          "hidden lg:block",
          showSettings && "block fixed inset-y-0 right-0 z-40 lg:relative"
        )}
      >
        <SettingsPanel />
      </aside>

      {/* Overlay for mobile settings */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
