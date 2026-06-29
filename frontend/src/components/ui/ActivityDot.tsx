import { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type ActivityState = "passed" | "retry" | "pending";

export interface ActivityDotProps extends HTMLAttributes<HTMLSpanElement> {
  state: ActivityState;
}

export function ActivityDot({ className, state, ...props }: ActivityDotProps) {
  const stateColors: Record<ActivityState, string> = {
    passed: "bg-success",
    retry: "bg-warning",
    pending: "bg-surface-3",
  };

  const stateLabels: Record<ActivityState, string> = {
    passed: "Passed",
    retry: "Retry required",
    pending: "Pending",
  };

  return (
    <span
      className={cn(
        "inline-block w-[9px] h-[9px] rounded-full shrink-0",
        stateColors[state],
        className
      )}
      title={stateLabels[state]}
      aria-label={stateLabels[state]}
      role="status"
      {...props}
    />
  );
}
