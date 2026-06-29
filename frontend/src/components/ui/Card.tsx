import { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  clickable?: boolean;
  inset?: boolean;
}

export function Card({
  className,
  clickable = false,
  inset = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-[22px] border transition-all duration-180",
        inset
          ? "bg-surface-2 border-border shadow-none"
          : "bg-surface border-border shadow-sm",
        clickable && [
          "cursor-pointer hover:shadow-md hover:border-border-strong hover:-translate-y-[2px]"
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
