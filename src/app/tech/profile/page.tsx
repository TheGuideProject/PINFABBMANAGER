import { getTranslations } from "next-intl/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default async function TechProfile() {
  const session = await auth();
  const t = await getTranslations("techHome");

  const technician = await prisma.technician.findUnique({
    where: { userId: session!.user.id },
    include: { user: true, skills: { include: { skill: true } } },
  });

  const name = technician?.user.name ?? session!.user.name ?? "";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">{t("profileTitle")}</h1>
      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-sky-100 text-lg font-semibold text-sky-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{name}</div>
            <div className="truncate text-sm text-muted-foreground">
              {technician?.user.email ?? session!.user.email}
            </div>
            {technician?.homeBase ? (
              <div className="text-xs text-muted-foreground">
                {technician.homeBase}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {technician && technician.skills.length > 0 ? (
        <Card>
          <CardContent className="flex flex-wrap gap-2">
            {technician.skills.map(({ skill, level }) => (
              <Badge key={skill.id} variant="secondary">
                {skill.name} · {level}/5
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
