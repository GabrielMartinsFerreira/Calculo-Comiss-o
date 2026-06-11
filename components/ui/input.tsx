import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-zinc-700/60 bg-zinc-900/80 px-3 py-1 text-sm text-zinc-100",
        "placeholder:text-zinc-600 shadow-sm transition-all duration-200",
        "focus-visible:outline-none focus-visible:border-cyan-500/70 focus-visible:ring-1 focus-visible:ring-cyan-500/40 focus-visible:bg-zinc-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
