import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-semibold text-text mb-[6px]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "bg-surface border border-border-strong rounded-md px-[13px] py-[10px] text-[14px] text-text placeholder-text-subtle transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/22 focus:outline-none disabled:opacity-50 disabled:pointer-events-none",
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

Input.displayName = "Input";
