import { Clock } from "lucide-react";
import type { ApiProjectHistoryEvent } from "@/types/index";

type ProjectHistoryTimelineProps = {
  items: ApiProjectHistoryEvent[];
  emptyLabel: string;
};

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const absSeconds = Math.round(Math.abs(diffMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSeconds < 60) return rtf.format(-Math.round(diffMs / 1000), "second");
  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) return rtf.format(-Math.round(diffMs / 60000), "minute");
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return rtf.format(-Math.round(diffMs / 3600000), "hour");
  const absDays = Math.round(absHours / 24);
  if (absDays < 30) return rtf.format(-Math.round(diffMs / 86400000), "day");

  return date.toLocaleString();
}

export function ProjectHistoryTimeline({ items, emptyLabel }: ProjectHistoryTimelineProps) {
  if (!items.length) {
    return <div className="py-20 text-center text-stone-400 italic text-sm">{emptyLabel}</div>;
  }

  return (
    <div className="relative space-y-8 before:absolute before:inset-y-0 before:left-5 before:w-px before:bg-stone-100 dark:before:bg-stone-800/60">
      {items.map((event) => (
        <div key={event.id} className="relative flex gap-10 pl-16 group">
          <div className="absolute left-0 w-10 h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex items-center justify-center z-10 shadow-sm group-hover:border-stone-900 dark:group-hover:border-white transition-all duration-300">
            <Clock className="w-4 h-4 text-stone-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2 gap-3">
              <span className="text-sm font-bold text-stone-900 dark:text-white">
                {event.role}:{event.name}
              </span>
              <span className="text-[10px] font-black text-stone-400 dark:text-stone-600 uppercase tracking-widest whitespace-nowrap">
                {formatRelativeDate(event.createdAt)}
              </span>
            </div>
            <p className="text-[13px] text-stone-500 dark:text-stone-400 leading-relaxed max-w-2xl">
              {event.message}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
