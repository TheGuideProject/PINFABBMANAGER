import type {
  ProjectStatus,
  Severity,
} from "@/generated/prisma/enums";

export const PROJECT_STATUS_BADGE: Record<ProjectStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700 border-slate-200",
  MOBILIZING: "bg-amber-100 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-sky-100 text-sky-800 border-sky-200",
  ON_HOLD: "bg-orange-100 text-orange-800 border-orange-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

export const SEVERITY_BADGE: Record<Severity, string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

export const SEVERITY_DOT: Record<Severity, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};
