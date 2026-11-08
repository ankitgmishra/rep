import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    destructive: "bg-red-50 text-red-800 border-red-200",
    outline: "bg-white text-slate-700 border-slate-200",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] font-medium rounded-full",
    md: "px-2.5 py-0.5 text-xs font-medium rounded-full",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center border transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
