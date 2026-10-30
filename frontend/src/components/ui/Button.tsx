import React from "react";
import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gradient";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs font-medium rounded-lg",
      md: "px-4 py-2.5 text-sm font-semibold rounded-xl",
      lg: "px-5 py-3 text-base font-semibold rounded-xl",
    };

    const variantClasses = {
      primary:
        "bg-[#7200A5] text-white hover:bg-[#62008F] shadow-sm shadow-[#7200A5]/20 focus-visible:ring-2 focus-visible:ring-[#7200A5] focus-visible:ring-offset-2 active:scale-[0.99]",
      gradient:
        "bg-[#7200A5] text-white hover:bg-[#62008F] shadow-md shadow-[#7200A5]/25 focus-visible:ring-2 focus-visible:ring-[#7200A5] active:scale-[0.99]",
      secondary:
        "bg-[#f5eafa] text-[#7200A5] hover:bg-[#edddf5] border border-[#7200A5]/20 focus-visible:ring-2 focus-visible:ring-[#7200A5]",
      outline:
        "bg-white text-slate-700 hover:bg-[#fcf6fa] border border-[#ead9e8] hover:border-[#d7b8ce] focus-visible:ring-2 focus-visible:ring-[#bb3b78]",
      ghost:
        "bg-transparent text-slate-600 hover:text-[#9e2d67] hover:bg-[#fcf4f9]",
      danger:
        "bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20 focus-visible:ring-2 focus-visible:ring-rose-500",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 transition-all duration-150 outline-none select-none disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <Spinner
            size={size === "sm" ? "sm" : "md"}
            variant={variant === "secondary" || variant === "ghost" || variant === "outline" ? "brand" : "white"}
          />
        )}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
