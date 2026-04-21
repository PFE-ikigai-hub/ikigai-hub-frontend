import type { CSSProperties, ElementType } from "react";
import { cn } from "@/shared/utils/cn";

export const skeletonSurfaceClass =
  "bg-white rounded-2xl border border-stone-200/70 dark:bg-white/[0.04] dark:border-white/[0.10] dark:backdrop-blur-md dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

export const skeletonDividerClass = "divide-stone-100 dark:divide-white/[0.08]";

export const skeletonBorderClass = "border-stone-100 dark:border-white/[0.08]";

type SkeletonBlockProps = {
  as?: ElementType;
  className?: string;
  shimmer?: boolean;
  style?: CSSProperties;
};

export function SkeletonBlock({ as: Component = "div", className, shimmer = true, style }: SkeletonBlockProps) {
  return (
    <Component
      aria-hidden="true"
      style={style}
      className={cn(
        "relative overflow-hidden rounded-md bg-gray-200 dark:bg-white/[0.08] dark:border dark:border-white/[0.10] dark:backdrop-blur-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        className
      )}
    >
      {shimmer ? (
        <span className="skeleton-shimmer pointer-events-none absolute inset-0 rounded-[inherit]" />
      ) : null}
    </Component>
  );
}
