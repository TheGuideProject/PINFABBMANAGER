"use client";

import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { divIcon } from "leaflet";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_BADGE } from "@/lib/status";
import type { ProjectStatus } from "@/generated/prisma/enums";
import "leaflet/dist/leaflet.css";

export type MapLocation = {
  id: string;
  name: string;
  city: string | null;
  country: string;
  lat: number;
  lng: number;
  projects: {
    id: string;
    code: string;
    title: string;
    status: ProjectStatus;
  }[];
};

// Marker color follows the most urgent status at the location.
const STATUS_PRIORITY: ProjectStatus[] = [
  "ON_HOLD",
  "IN_PROGRESS",
  "MOBILIZING",
  "PLANNED",
  "COMPLETED",
  "CANCELLED",
];
const STATUS_COLOR: Record<ProjectStatus, string> = {
  PLANNED: "#94a3b8",
  MOBILIZING: "#f59e0b",
  IN_PROGRESS: "#0ea5e9",
  ON_HOLD: "#f97316",
  COMPLETED: "#10b981",
  CANCELLED: "#cbd5e1",
};

function markerIcon(location: MapLocation) {
  const top = STATUS_PRIORITY.find((status) =>
    location.projects.some((project) => project.status === status),
  );
  const color = top ? STATUS_COLOR[top] : "#cbd5e1";
  const count = location.projects.length;

  return divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};color:white;font-size:12px;font-weight:700;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)">${count || ""}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function WorldMap({ locations }: { locations: MapLocation[] }) {
  const t = useTranslations("pages.map");
  const tEnums = useTranslations("enums");

  return (
    <MapContainer
      center={[30, 10]}
      zoom={2}
      minZoom={2}
      scrollWheelZoom
      className="h-full w-full rounded-xl"
      worldCopyJump
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((location) => (
        <Marker
          key={location.id}
          position={[location.lat, location.lng]}
          icon={markerIcon(location)}
        >
          <Popup minWidth={230}>
            <div className="space-y-2">
              <div>
                <div className="font-semibold">{location.name}</div>
                <div className="text-xs text-slate-500">
                  {location.city ? `${location.city}, ` : ""}
                  {location.country} ·{" "}
                  {t("activeProjects", { count: location.projects.length })}
                </div>
              </div>
              {location.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/manager/projects/${project.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 no-underline hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-sky-700">
                      {project.code}
                    </span>
                    <span className="block max-w-44 truncate text-xs text-slate-600">
                      {project.title}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className={`${PROJECT_STATUS_BADGE[project.status]} shrink-0 text-[10px]`}
                  >
                    {tEnums(`ProjectStatus.${project.status}`)}
                  </Badge>
                </Link>
              ))}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
