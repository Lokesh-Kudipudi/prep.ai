import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, rows = 4, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[13px] font-semibold text-text mb-[6px]"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={cn(
            "bg-surface border border-border-strong rounded-md px-[13px] py-[10px] text-[14px] text-text placeholder-text-subtle transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/22 focus:outline-none disabled:opacity-50 disabled:pointer-events-none min-h-[96px] leading-[1.5] resize-y",
            error && "border-danger focus:border-danger focus:ring-danger-soft",
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-[12px] text-danger-text font-semibold mt-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
