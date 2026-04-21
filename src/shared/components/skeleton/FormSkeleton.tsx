import { SkeletonBlock, skeletonSurfaceClass } from "@/shared/components/skeleton/SkeletonBlock";

type FormSkeletonProps = {
  fields?: number;
  withActions?: boolean;
};

export function FormSkeleton({ fields = 4, withActions = true }: FormSkeletonProps) {
  return (
    <div className={`${skeletonSurfaceClass} p-6 space-y-5`}>
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-48" />
        <SkeletonBlock className="h-3 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {withActions ? <div className="pt-2" /> : null}
    </div>
  );
}
