"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import itLocale from "@fullcalendar/core/locales/it";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  color?: string;
  url?: string;
  display?: "background" | "auto";
};

export function PlanningCalendar({ events }: { events: CalendarEvent[] }) {
  const locale = useLocale();
  const router = useRouter();

  return (
    <div className="rounded-xl border bg-white p-3 [&_.fc]:text-sm">
      <FullCalendar
        plugins={[dayGridPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,listWeek",
        }}
        locales={[itLocale]}
        locale={locale === "it" ? "it" : "en"}
        events={events}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          if (info.event.url) router.push(info.event.url);
        }}
        height="auto"
        firstDay={1}
        dayMaxEventRows={4}
      />
    </div>
  );
}
