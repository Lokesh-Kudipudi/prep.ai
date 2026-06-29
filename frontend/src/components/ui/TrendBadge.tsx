import { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface TrendBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  value: number | string;
  isUp?: boolean;
}

export function TrendBadge({ className, value, isUp, ...props }: TrendBadgeProps) {
  // Determine if it is a positive/up trend
  const resolvedIsUp = isUp ?? (
    typeof value === "number" ? value >= 0 : !value.trim().startsWith("-")
  );

  // Format the visual text value (e.g., ensure it has + if positive and number)
  const formattedValue = typeof value === "number"
    ? `${resolvedIsUp ? "+" : ""}${value}`
    : value;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[4px] rounded-full px-[8px] py-[2px] text-[12px] font-bold select-none",
        resolvedIsUp
          ? "bg-success-soft text-success-text"
          : "bg-danger-soft text-danger-text",
        className
      )}
      {...props}
    >
      <span className="text-[10px]" aria-hidden="true">
        {resolvedIsUp ? "▲" : "▼"}
      </span>
      {formattedValue}
    </span>
  );
}
