import { SkeletonBlock, skeletonSurfaceClass } from "@/shared/components/skeleton/SkeletonBlock";

export function DeliverableDetailSkeleton() {
  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-[1300px] mx-auto min-h-screen space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-9 w-72 max-w-[80vw]" />
          <SkeletonBlock className="h-4 w-96 max-w-[85vw]" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-36 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className={`${skeletonSurfaceClass} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-4 w-8" />
          </div>

          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-full p-3 rounded-xl border border-stone-100 dark:border-white/[0.08] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <SkeletonBlock className="h-4 w-16" />
                  <SkeletonBlock className="h-4 w-4 rounded-full" />
                </div>
                <SkeletonBlock className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>

        <div className={`${skeletonSurfaceClass} p-5`}>
          <div className="space-y-5">
            <SkeletonBlock className="h-6 w-48" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="h-5 w-40 max-w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
