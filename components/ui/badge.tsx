import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:    "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25",
        secondary:  "bg-zinc-800 text-zinc-400 border border-zinc-700",
        destructive:"bg-red-500/15 text-red-400 border border-red-500/25",
        outline:    "text-zinc-300 border border-zinc-700",
        success:    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
        warning:    "bg-purple-500/15 text-purple-400 border border-purple-500/25",
        info:       "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
}

function Badge({ className, variant, pulse = false, children, ...props }: BadgeProps) {
  const dotColor =
    variant === "success" ? "bg-emerald-400" :
    variant === "warning" ? "bg-purple-400" :
    variant === "destructive" ? "bg-red-400" : "bg-cyan-400";

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {pulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotColor)} />
          <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColor)} />
        </span>
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
