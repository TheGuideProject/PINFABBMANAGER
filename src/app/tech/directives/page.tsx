import { getTranslations } from "next-intl/server";
import { MessageSquareWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function TechDirectives() {
  const t = await getTranslations("techHome");

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">
        {t("directivesTitle")}
      </h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageSquareWarning className="size-8 text-slate-300" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("directivesEmpty")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
