import { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "default" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "default",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-sm";
  
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-primary text-on-primary hover:bg-primary-hover border border-transparent",
    secondary: "bg-surface text-text border border-border-strong hover:bg-surface-2",
    ghost: "bg-transparent text-primary hover:bg-primary-soft border border-transparent shadow-none",
    danger: "bg-danger-soft text-danger-text hover:bg-[#f7d4d4] border border-transparent shadow-none",
  };

  const sizes: Record<ButtonSize, string> = {
    default: "px-[18px] py-[10px] text-[14px]",
    sm: "px-[13px] py-[7px] text-[13px]",
  };

  return (
    <button
      type={type}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
