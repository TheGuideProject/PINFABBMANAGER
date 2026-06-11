import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileText, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  const sections = [
    {
      href: "/manager/settings/jobs",
      icon: ListChecks,
      title: t("jobs"),
      description: t("jobsDescription"),
    },
    {
      href: "/manager/settings/templates",
      icon: FileText,
      title: t("templates"),
      description: t("templatesDescription"),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="transition-colors hover:border-sky-300">
              <CardContent className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
