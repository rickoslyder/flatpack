/**
 * TierSelector component
 * Free/Pro tier selection UI
 */

import { cn } from "../../lib/cn.js";
import { useTier } from "../../stores/index.js";

interface TierSelectorProps {
  className?: string;
}

export function TierSelector({ className }: TierSelectorProps) {
  const [tier, setTier] = useTier();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <label className="text-sm font-medium">NotebookLM Tier</label>
      <div className="flex gap-2">
        <TierOption
          value="free"
          label="Free"
          description="50 sources max"
          isSelected={tier === "free"}
          onSelect={() => setTier("free")}
        />
        <TierOption
          value="pro"
          label="Pro"
          description="300 sources max"
          isSelected={tier === "pro"}
          onSelect={() => setTier("pro")}
        />
      </div>
    </div>
  );
}

interface TierOptionProps {
  value: string;
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}

function TierOption({ label, description, isSelected, onSelect }: TierOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-muted hover:border-muted-foreground/50"
      )}
    >
      <span className={cn("font-medium", isSelected && "text-primary")}>{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
