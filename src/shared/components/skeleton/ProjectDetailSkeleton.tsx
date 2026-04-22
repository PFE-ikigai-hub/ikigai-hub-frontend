import { SkeletonBlock, skeletonSurfaceClass } from "@/shared/components/skeleton/SkeletonBlock";

type ProjectDetailSkeletonProps = {
  showHistoryTab?: boolean;
};

export function ProjectDetailSkeleton({ showHistoryTab = true }: ProjectDetailSkeletonProps) {
  return (
    <div className="p-8 md:p-12 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-10 flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-4 w-28 rounded-md" />
          <div className="mt-4">
            <SkeletonBlock className="h-10 w-80 rounded-lg" />
          </div>
          <SkeletonBlock className="h-4 w-52 rounded-md mt-3" />
        </div>
      </div>

      <div className="mb-10">
        <SkeletonBlock className="h-3 w-28 rounded-md" />
        {showHistoryTab ? <SkeletonBlock className="h-3 w-20 rounded-md mt-2" /> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="p-6 bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-stone-200/60 dark:border-white/[0.10] shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <SkeletonBlock className="w-10 h-10 rounded-2xl shrink-0" />
                  <div className="space-y-2">
                    <SkeletonBlock className="h-3 w-24 rounded-md" />
                    <SkeletonBlock className="h-4 w-32 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-stone-100 dark:border-white/10 space-y-2">
              <SkeletonBlock className="h-3 w-28 rounded-md" />
              <SkeletonBlock className="h-4 w-full rounded-md" />
              <SkeletonBlock className="h-4 w-11/12 rounded-md" />
              <SkeletonBlock className="h-4 w-2/3 rounded-md" />
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-3 w-40 rounded-md" />
              <div className="flex-1 h-px bg-stone-100 dark:bg-white/[0.08] ml-4" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`${skeletonSurfaceClass} overflow-hidden`}
                >
                  <SkeletonBlock className="h-36 w-full rounded-none" />
                  <div className="p-4 space-y-3">
                    <SkeletonBlock className="h-5 w-24 rounded-md" />
                    <SkeletonBlock className="h-4 w-3/4 rounded-md" />
                    <SkeletonBlock className="h-3 w-1/2 rounded-md" />
                    <div className="flex items-center justify-between pt-1">
                      <SkeletonBlock className="h-3 w-16 rounded-md" />
                      <SkeletonBlock className="h-3 w-10 rounded-md" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-4 w-4 rounded" />
            <SkeletonBlock className="h-4 w-36 rounded-md" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-full flex items-center gap-4 p-4 bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-stone-200/60 dark:border-white/[0.10] shadow-sm"
              >
                <SkeletonBlock className="h-10 w-10 rounded-full shrink-0" />
                <div className="min-w-0 space-y-2 flex-1">
                  <SkeletonBlock className="h-4 w-3/4 rounded-md" />
                  <SkeletonBlock className="h-3 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
