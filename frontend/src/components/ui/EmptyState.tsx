import { ComponentType, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  className,
  icon: Icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 bg-surface rounded-lg border-[1.5px] border-dashed border-border-strong min-h-[300px]",
        className
      )}
      {...props}
    >
      {/* Icon Tile */}
      {Icon && (
        <div className="w-[56px] h-[56px] rounded-[16px] bg-primary-soft text-primary flex items-center justify-center mb-4 select-none">
          <Icon size={24} />
        </div>
      )}

      {/* Text Info */}
      <h3 className="text-h4 font-bold text-text mb-[6px]">{title}</h3>
      <p className="text-sm text-text-muted max-w-[360px] mb-6 leading-relaxed">
        {description}
      </p>

      {/* Action Button */}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
