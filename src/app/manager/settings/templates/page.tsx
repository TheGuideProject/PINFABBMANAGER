import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { parseStructure } from "@/lib/report-template";
import { TemplateSections } from "./template-sections";

export default async function TemplatesPage() {
  const t = await getTranslations("templates");

  const template = await prisma.reportTemplate.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        {template ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
            {t("activeTemplate")}: {template.name} v{template.version}
          </Badge>
        ) : null}
      </div>

      {!template ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            —
          </CardContent>
        </Card>
      ) : (
        <TemplateSections sections={parseStructure(template.structure)} />
      )}
    </div>
  );
}
