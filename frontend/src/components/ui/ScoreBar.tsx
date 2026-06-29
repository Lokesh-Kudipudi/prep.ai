import { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type ScoreState = "good" | "mid" | "bad";

export interface ScoreBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // Fraction between 0 and 1
  state?: ScoreState;
}

export function ScoreBar({ className, value, state, ...props }: ScoreBarProps) {
  // Clamp value between 0 and 1
  const clampedValue = Math.min(Math.max(value, 0), 1);
  const percentage = `${clampedValue * 100}%`;

  // Determine state automatically if not provided
  const resolvedState = state ?? (
    clampedValue >= 0.85 ? "good" : clampedValue >= 0.6 ? "mid" : "bad"
  );

  const fillColors: Record<ScoreState, string> = {
    good: "bg-success",
    mid: "bg-warning",
    bad: "bg-danger",
  };

  return (
    <div
      className={cn(
        "w-full h-[8px] bg-surface-3 rounded-full overflow-hidden",
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(clampedValue * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300 ease-out",
          fillColors[resolvedState]
        )}
        style={{ width: percentage }}
      />
    </div>
  );
}
