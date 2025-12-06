/**
 * PhaseManager component
 * Manages phase transitions with visual feedback
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";

export type AppPhase = "input" | "preview" | "processing" | "results";

interface PhaseManagerProps {
  currentPhase: AppPhase;
  children: React.ReactNode;
  className?: string;
}

const PHASES: AppPhase[] = ["input", "preview", "processing", "results"];

const PHASE_LABELS: Record<AppPhase, string> = {
  input: "Select Input",
  preview: "Preview Plan",
  processing: "Processing",
  results: "Results",
};

export function PhaseManager({ currentPhase, children, className }: PhaseManagerProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Phase indicator */}
      <PhaseIndicator currentPhase={currentPhase} />

      {/* Phase content */}
      <div className="flex-1 overflow-hidden">
        <div
          className="h-full transition-opacity duration-200"
          key={currentPhase}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

interface PhaseIndicatorProps {
  currentPhase: AppPhase;
}

function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentIndex = PHASES.indexOf(currentPhase);

  return (
    <div className="flex items-center justify-center gap-2 py-4 border-b bg-muted/30">
      {PHASES.map((phase, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <React.Fragment key={phase}>
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary/20 text-primary",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-sm hidden sm:inline transition-colors",
                  isActive && "font-medium text-foreground",
                  isCompleted && "text-muted-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {PHASE_LABELS[phase]}
              </span>
            </div>

            {/* Connector line */}
            {index < PHASES.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 transition-colors",
                  index < currentIndex ? "bg-primary/50" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
