// Ce fichier gere une partie du frontend.
import {

  SkeletonBlock,
  skeletonBorderClass,
  skeletonDividerClass,
  skeletonSurfaceClass,
} from "@/shared/components/skeleton/SkeletonBlock";

type TableSkeletonProps = {
  rows?: number;
};

export function TableSkeleton({ rows = 4 }: TableSkeletonProps) {
  return (
    <div className={`${skeletonSurfaceClass} overflow-hidden`}>
      <div className="hidden lg:block overflow-x-auto">
        <div className={`border-b ${skeletonBorderClass} px-5 py-3.5`}>
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-3 rounded-sm" />
            ))}
          </div>
        </div>
        <div className={`divide-y ${skeletonDividerClass}`}>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="px-5 py-3.5">
              <div className="grid grid-cols-6 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-9 w-9 rounded-full" />
                  <div className="w-full">
                    <SkeletonBlock className="h-3 w-3/4" />
                  </div>
                </div>
                <SkeletonBlock className="h-3 w-11/12" />
                <SkeletonBlock className="h-3 w-10/12" />
                <SkeletonBlock className="h-3 w-8/12" />
                <SkeletonBlock className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`lg:hidden divide-y ${skeletonDividerClass}`}>
        {Array.from({ length: Math.max(2, Math.floor(rows / 2)) }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 space-y-3">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}