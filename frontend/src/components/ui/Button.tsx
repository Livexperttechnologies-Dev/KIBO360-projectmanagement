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
        "bg-[#690BA8] text-white hover:bg-[#340771] shadow-sm shadow-[#690BA8]/20 focus-visible:ring-2 focus-visible:ring-[#690BA8] focus-visible:ring-offset-2 active:scale-[0.99]",
      gradient:
        "bg-gradient-to-r from-[#690BA8] via-[#E81778] to-[#F16A65] text-white hover:opacity-95 shadow-md shadow-[#690BA8]/25 focus-visible:ring-2 focus-visible:ring-[#E81778] active:scale-[0.99]",
      secondary:
        "bg-[#F5EFFB] text-[#690BA8] hover:bg-[#ede0f7] border border-[#690BA8]/20 focus-visible:ring-2 focus-visible:ring-[#690BA8]",
      outline:
        "bg-white text-slate-700 hover:bg-[#FBF7FF] border border-violet-200 hover:border-violet-300 focus-visible:ring-2 focus-visible:ring-[#690BA8]",
      ghost:
        "bg-transparent text-slate-600 hover:text-[#690BA8] hover:bg-violet-50/80",
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
