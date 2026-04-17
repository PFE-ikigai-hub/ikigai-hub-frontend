import {
  SkeletonBlock,
  skeletonBorderClass,
  skeletonDividerClass,
  skeletonSurfaceClass,
} from "@/shared/components/skeleton/SkeletonBlock";

type TableSkeletonProps = {
  rows?: number;
};

export function TableSkeleton({ rows = 7 }: TableSkeletonProps) {
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
                  <div className="space-y-2 w-full">
                    <SkeletonBlock className="h-3 w-3/4" />
                    <SkeletonBlock className="h-3 w-1/2" />
                  </div>
                </div>
                <SkeletonBlock className="h-3 w-11/12" />
                <SkeletonBlock className="h-3 w-10/12" />
                <SkeletonBlock className="h-6 w-20 rounded-full" />
                <SkeletonBlock className="h-6 w-16 rounded-full" />
                <SkeletonBlock className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`lg:hidden divide-y ${skeletonDividerClass}`}>
        {Array.from({ length: Math.max(4, Math.floor(rows / 2)) }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-5 w-20 rounded-full" />
            </div>
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
