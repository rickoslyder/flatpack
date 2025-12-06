/**
 * AppShell component
 * Main application layout wrapper
 */

import * as React from "react";
import { cn } from "../../lib/cn.js";
import { Header } from "./header.js";
import { useTheme } from "../../stores/index.js";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
  onSettingsClick?: () => void;
}

export function AppShell({ children, className, onSettingsClick }: AppShellProps) {
  const [theme] = useTheme();

  // Apply theme class to document
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    // Handle "system" theme
    const effectiveTheme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    root.classList.add(effectiveTheme);
  }, [theme]);

  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <Header onSettingsClick={onSettingsClick} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
