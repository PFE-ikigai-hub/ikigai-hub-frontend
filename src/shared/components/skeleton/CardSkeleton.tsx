import { SkeletonBlock, skeletonDividerClass, skeletonSurfaceClass } from "@/shared/components/skeleton/SkeletonBlock";

type CardSkeletonProps = {
  count?: number;
  layout?: "grid" | "list";
};

export function CardSkeleton({ count = 8, layout = "grid" }: CardSkeletonProps) {
  if (layout === "list") {
    return (
      <div className={`${skeletonSurfaceClass} overflow-hidden`}>
        <div className={`divide-y ${skeletonDividerClass}`}>
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="px-5 py-4 flex items-center gap-4">
              <SkeletonBlock className="h-12 w-14 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <SkeletonBlock className="h-3.5 w-2/5" />
                <SkeletonBlock className="h-3 w-1/4" />
              </div>
              <SkeletonBlock className="h-6 w-14 rounded-md shrink-0" />
              <SkeletonBlock className="h-6 w-16 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${skeletonSurfaceClass} overflow-hidden`}
        >
          <SkeletonBlock className="h-36 w-full rounded-none" />
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-5 w-24 rounded-md" />
              <SkeletonBlock className="h-5 w-14 rounded-full" />
            </div>
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
            <div className="flex items-center justify-between pt-1">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-3 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
