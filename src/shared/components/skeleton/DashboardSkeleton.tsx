import { CardSkeleton } from "@/shared/components/skeleton/CardSkeleton";
import { SkeletonBlock } from "@/shared/components/skeleton/SkeletonBlock";
import { TableSkeleton } from "@/shared/components/skeleton/TableSkeleton";


type DashboardSkeletonProps = {
  cardsCount?: number;
  withTable?: boolean;
};

export function DashboardSkeleton({ cardsCount = 4, withTable = false }: DashboardSkeletonProps) {
  return (
    <div className="p-8 md:p-12 max-w-[1600px] mx-auto min-h-screen space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-10 w-72 rounded-lg" />
          <SkeletonBlock className="h-4 w-44 rounded-md" />
        </div>
      </div>

      <div className="space-y-4">
        <SkeletonBlock className="h-14 w-full rounded-2xl" />
        <SkeletonBlock className="h-4 w-56 rounded-md" />
      </div>

      {withTable ? <TableSkeleton rows={4} /> : <CardSkeleton count={cardsCount} />}
    </div>
  );
}
