import { CardSkeleton } from "@/shared/components/skeleton/CardSkeleton";
import { DashboardSkeleton } from "@/shared/components/skeleton/DashboardSkeleton";
import { TableSkeleton } from "@/shared/components/skeleton/TableSkeleton";


type PageLoaderVariant = "cards" | "table" | "detail";

type PageLoaderProps = {
  minHeightClassName?: string;
  variant?: PageLoaderVariant;
};

export function PageLoader({ minHeightClassName = "min-h-[60vh]", variant = "cards" }: PageLoaderProps) {
  if (variant === "table") {
    return (
      <div className={`${minHeightClassName} w-full`}>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={`${minHeightClassName} w-full`}>
        <DashboardSkeleton withTable />
      </div>
    );
  }

  return (
    <div className={`${minHeightClassName} w-full`}>
      <CardSkeleton count={4} />
    </div>
  );
}
