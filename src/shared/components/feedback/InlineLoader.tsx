import type { CSSProperties } from "react";
import { SkeletonBlock } from "@/shared/components/skeleton/SkeletonBlock";


type InlineLoaderProps = {
  className?: string;
  size?: number;
};

export function InlineLoader({ className = "", size = 0.8 }: InlineLoaderProps) {
  const px = Math.max(24, Math.round(30 * size));

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-full max-w-xl space-y-4 px-4">
        <SkeletonBlock className="h-5 w-2/5 mx-auto" />
        <SkeletonBlock className="h-4 w-4/5 mx-auto" />
        <SkeletonBlock className="h-4 w-3/5 mx-auto" />
        <SkeletonBlock
          className="rounded-full mx-auto"
          style={{ width: px * 2, height: px * 2 } as CSSProperties}
        />
      </div>
    </div>
  );
}
