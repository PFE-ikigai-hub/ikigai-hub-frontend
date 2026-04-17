import { SkeletonBlock } from "@/shared/components/skeleton/SkeletonBlock";

export function DeliverableDetailSkeleton() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background dark:bg-[#0a0a0b] transition-colors duration-300">
      <header className="lg:hidden bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-b border-stone-200/50 dark:border-white/[0.10] px-6 py-3.5 z-20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex-1 lg:w-[62%] lg:flex-none lg:order-2 min-w-0 flex flex-col overflow-hidden bg-stone-50/30 dark:bg-white/[0.02]">
          <div className="bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border-b border-stone-100/30 dark:border-white/[0.08] px-6 py-2">
            <div className="flex items-center justify-center">
              <SkeletonBlock className="h-3 w-40 rounded-md" />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6 md:p-8 lg:p-12 flex items-center justify-center">
            <SkeletonBlock className="w-full max-w-4xl h-[62vh] rounded-2xl" />
          </div>
        </div>

        <div className="hidden lg:flex lg:order-1 w-[38%] min-w-0 flex-col bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border-r border-stone-200/40 dark:border-white/[0.10] shadow-xl shadow-stone-100/20 dark:shadow-none z-10 overflow-hidden">
          <div className="p-5 border-b border-stone-200/40 dark:border-white/[0.08] space-y-4">
            <SkeletonBlock className="h-4 w-28" />
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-3/4" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
          </div>

          <div className="p-5 border-b border-stone-200/40 dark:border-white/[0.08] space-y-3">
            <SkeletonBlock className="h-4 w-32" />
            <div className="space-y-2">
              <SkeletonBlock className="h-10 w-full rounded-xl" />
              <SkeletonBlock className="h-10 w-full rounded-xl" />
              <SkeletonBlock className="h-10 w-full rounded-xl" />
            </div>
          </div>

          <div className="flex-1 p-5 space-y-3 overflow-hidden">
            <SkeletonBlock className="h-4 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-stone-200/50 dark:border-white/[0.10] dark:bg-white/[0.03] backdrop-blur-sm p-3 space-y-2">
                <SkeletonBlock className="h-3 w-2/3" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
