import { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type BadgeVariant = "violet" | "sky" | "success" | "warning" | "danger" | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showDot?: boolean;
}

export function Badge({
  className,
  variant = "violet",
  showDot = false,
  children,
  ...props
}: BadgeProps) {
  const badgeStyles: Record<BadgeVariant, string> = {
    violet: "bg-primary-soft text-primary-hover",
    sky: "bg-sky-soft text-sky-text",
    success: "bg-success-soft text-success-text",
    warning: "bg-warning-soft text-warning-text",
    danger: "bg-danger-soft text-danger-text",
    neutral: "bg-surface-3 text-text-muted",
  };

  const dotStyles: Record<Exclude<BadgeVariant, "neutral">, string> = {
    violet: "bg-primary",
    sky: "bg-sky",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[6px] rounded-full px-[10px] py-[3px] text-[12px] font-semibold select-none",
        badgeStyles[variant],
        className
      )}
      {...props}
    >
      {showDot && variant !== "neutral" && (
        <span
          className={cn("w-[6px] h-[6px] rounded-full shrink-0", dotStyles[variant])}
        />
      )}
      {children}
    </span>
  );
}
