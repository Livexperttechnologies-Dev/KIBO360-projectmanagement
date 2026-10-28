import React from "react";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div
    className={`rounded-2xl border border-violet-100/90 bg-white shadow-[0_2px_10px_rgba(78,35,112,0.045)] hover:shadow-[0_8px_24px_rgba(78,35,112,0.08)] transition-shadow duration-200 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div
    className={`flex flex-col space-y-1.5 p-5 pb-3 border-b border-violet-100/80 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <h3
    className={`text-base font-bold text-slate-900 tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <p className={`text-xs text-slate-500 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => <div className={`p-5 ${className}`} {...props}>{children}</div>;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div
    className={`flex items-center p-5 pt-3 border-t border-violet-100/80 text-xs text-slate-500 ${className}`}
    {...props}
  >
    {children}
  </div>
);
