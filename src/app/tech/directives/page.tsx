import { getTranslations } from "next-intl/server";
import { MessageSquareWarning } from "lucide-react";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { Card, CardContent } from "@/components/ui/card";
import { DirectiveList } from "./directive-list";

export default async function TechDirectives() {
  const session = await auth();
  const t = await getTranslations("directives");

  const directives = await prisma.directive.findMany({
    where: { toTechnician: { userId: session!.user.id } },
    include: {
      fromUser: { select: { name: true } },
      project: { select: { code: true } },
      criticality: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Opening the list marks SENT directives as READ (visible to the office).
  if (directives.some((directive) => directive.status === "SENT")) {
    await prisma.directive.updateMany({
      where: { toTechnician: { userId: session!.user.id }, status: "SENT" },
      data: { status: "READ" },
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>

      {directives.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <MessageSquareWarning className="size-8 text-slate-300" aria-hidden />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <DirectiveList
          directives={directives.map((directive) => ({
            id: directive.id,
            message: directive.message,
            status: directive.status === "SENT" ? "READ" : directive.status,
            createdAt: directive.createdAt,
            fromName: directive.fromUser.name,
            projectCode: directive.project.code,
            criticalityTitle: directive.criticality?.title ?? null,
          }))}
        />
      )}
    </div>
  );
}
