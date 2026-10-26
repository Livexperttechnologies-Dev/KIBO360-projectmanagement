import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "magenta" | "coral" | "lavender" | "success" | "warning" | "neutral" | "outline";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
}) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-medium",
    md: "px-2.5 py-1 text-xs font-semibold",
  };

  const variantClasses = {
    primary: "bg-[#F5EFFB] text-[#690BA8] border border-[#690BA8]/15",
    magenta: "bg-pink-50 text-[#E81778] border border-[#E81778]/20",
    coral: "bg-orange-50 text-[#F16A65] border border-[#F16A65]/20",
    lavender: "bg-[#F5EFFB] text-[#340771] border border-purple-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    neutral: "bg-slate-100 text-slate-700 border border-slate-200",
    outline: "bg-transparent text-slate-600 border border-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};