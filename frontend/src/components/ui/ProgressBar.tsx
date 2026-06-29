import { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // Fraction between 0 and 1
}

export function ProgressBar({ className, value, ...props }: ProgressBarProps) {
  // Clamp value between 0 and 1
  const clampedValue = Math.min(Math.max(value, 0), 1);
  const percentage = `${clampedValue * 100}%`;

  return (
    <div
      className={cn(
        "w-full h-[6px] bg-surface-3 rounded-full overflow-hidden",
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(clampedValue * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
        style={{ width: percentage }}
      />
    </div>
  );
}
