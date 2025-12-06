/**
 * SettingsPanel component
 * Settings sidebar with ignore patterns, PDF handling, and other options
 */

import { cn } from "../../lib/cn.js";
import { Card, CardContent, CardHeader, CardTitle } from "../card.js";
import { Switch } from "../switch.js";
import { Select } from "../select.js";
import { TierSelector } from "./tier-selector.js";
import { IgnorePatternEditor } from "./ignore-pattern-editor.js";
import { useConfig } from "../../stores/index.js";
import type { PathSeparator } from "@flatpack/core";

interface SettingsPanelProps {
  className?: string;
}

export function SettingsPanel({ className }: SettingsPanelProps) {
  const [config, setConfig] = useConfig();

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Tier selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Output Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <TierSelector />
        </CardContent>
      </Card>

      {/* PDF handling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">PDF Handling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Convert PDFs to text</label>
              <p className="text-xs text-muted-foreground">
                Extract text from PDFs instead of preserving original
              </p>
            </div>
            <Switch
              checked={config.pdfHandling === "convert"}
              onCheckedChange={(checked) =>
                setConfig({ pdfHandling: checked ? "convert" : "preserve" })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Separator options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Path Flattening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Separator Style</label>
            <Select
              value={config.pathSeparator}
              onChange={(e) => setConfig({ pathSeparator: e.target.value as PathSeparator })}
              options={[
                { value: "underscore", label: "Underscore (path_to_file)" },
                { value: "hyphen", label: "Hyphen (path-to-file)" },
                { value: "dot", label: "Dot (path.to.file)" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ignore patterns */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Exclusions</CardTitle>
        </CardHeader>
        <CardContent>
          <IgnorePatternEditor
            patterns={config.customIgnorePatterns}
            onChange={(patterns) => setConfig({ customIgnorePatterns: patterns })}
          />
        </CardContent>
      </Card>

      {/* Advanced options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Advanced</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Create ZIP output</label>
              <p className="text-xs text-muted-foreground">
                Package output files into a ZIP archive
              </p>
            </div>
            <Switch
              checked={config.createZip}
              onCheckedChange={(checked) => setConfig({ createZip: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
