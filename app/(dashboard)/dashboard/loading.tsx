import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <Skeleton className="h-38 w-full rounded-md" />

      {/* Date bar skeleton */}
      <Skeleton className="h-14 w-full rounded-md" />

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-line bg-surface p-6 shadow-card"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-3 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-line bg-surface p-6 shadow-card"
          >
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-1.5 h-3 w-32" />
            <Skeleton className="mt-4 h-70 w-full rounded-sm" />
          </div>
        ))}
        <div className="lg:col-span-2 rounded-md border border-line bg-surface p-6 shadow-card">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-1.5 h-3 w-64" />
          <Skeleton className="mt-4 h-75 w-full rounded-sm" />
        </div>
      </div>
    </div>
  );
}
