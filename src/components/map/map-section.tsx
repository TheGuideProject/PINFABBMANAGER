"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapLocation } from "./world-map";

// Leaflet touches `window` — load client-side only.
const WorldMap = dynamic(() => import("./world-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

export function MapSection({ locations }: { locations: MapLocation[] }) {
  return (
    <div className="h-[calc(100dvh-13rem)] min-h-96 w-full overflow-hidden rounded-xl border">
      <WorldMap locations={locations} />
    </div>
  );
}
