// Ce fichier gere une partie du frontend.
import { SkeletonBlock, skeletonSurfaceClass } from "@/shared/components/skeleton/SkeletonBlock";


export function DeliverableDetailSkeleton() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background dark:bg-[#0a0a0b]">
      <div className="lg:hidden bg-white/70 dark:bg-[#0d0d0f]/70 border-b border-stone-200/50 dark:border-stone-800/40 px-6 py-3.5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="space-y-2 min-w-0 flex-1">
            <SkeletonBlock className="h-4 w-40 max-w-full" />
            <SkeletonBlock className="h-3 w-28" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex-1 lg:w-[62%] lg:flex-none lg:order-2 min-w-0 flex flex-col overflow-hidden bg-stone-50/30 dark:bg-[#0c0c0e]">
          <div className="flex-1 overflow-auto p-6 md:p-8 lg:p-12 flex items-center justify-center">
            <div className={`${skeletonSurfaceClass} w-full max-w-4xl h-[62vh] rounded-2xl p-6`}>
              <SkeletonBlock className="h-full w-full rounded-xl" />
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:order-1 w-[38%] min-w-0 flex-col bg-white/60 dark:bg-[#0d0d0f]/60 border-r border-stone-200/40 dark:border-stone-800/30 overflow-hidden">
          <div className="p-5 border-b border-stone-200/40 dark:border-stone-800/30 space-y-4">
            <SkeletonBlock className="h-4 w-28" />
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-48 max-w-full" />
              <SkeletonBlock className="h-3 w-36" />
            </div>

            <SkeletonBlock className="h-4 w-52" />
          </div>

          <div className="flex-1 p-4 space-y-6 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-36" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}