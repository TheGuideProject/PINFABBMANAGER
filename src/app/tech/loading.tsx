import { Skeleton } from "@/components/ui/skeleton";

export default function TechLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-36" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}
