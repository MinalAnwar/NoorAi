"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "glass";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none",
          
          // Custom beautiful variants
          {
            // Primary Emerald Action Button
            "bg-emerald-600 text-emerald-50 shadow-md hover:bg-emerald-500 hover:shadow-emerald-950/20 active:translate-y-[1px]":
              variant === "default",
            
            // Secondary neutral dark
            "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:translate-y-[1px]":
              variant === "secondary",
            
            // Outline border
            "border border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-850 hover:text-zinc-100":
              variant === "outline",
            
            // Glassmorphic buttons
            "glass-panel text-emerald-100 hover:bg-emerald-500/10 active:translate-y-[1px] border-white/10 hover:border-emerald-500/30":
              variant === "glass",
            
            // Subtle ghost
            "hover:bg-zinc-850 text-zinc-400 hover:text-zinc-100":
              variant === "ghost",
            
            // Destructive danger
            "bg-red-950/50 text-red-200 border border-red-900/50 hover:bg-red-900/50":
              variant === "destructive",
            
            // Minimal text link
            "text-emerald-500 underline-offset-4 hover:underline":
              variant === "link",
          },
          
          // Responsive sizing
          {
            "h-10 px-5 py-2 rounded-lg": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-12 rounded-xl px-8 text-base": size === "lg",
            "h-10 w-10 rounded-lg": size === "icon",
          },
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button };
