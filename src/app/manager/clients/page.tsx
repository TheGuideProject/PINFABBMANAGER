import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/forms/search-input";
import { ClientRowActions, NewClientButton } from "./client-form";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations("pages.clients");
  const tEntities = await getTranslations("entities");
  const tEnums = await getTranslations("enums");
  const tForms = await getTranslations("forms");

  const clients = await prisma.client.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    include: { _count: { select: { vessels: true, projects: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <NewClientButton />
      </div>
      <SearchInput placeholder={tForms("search")} />

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{tEntities("name")}</TableHead>
                <TableHead>{tEntities("type")}</TableHead>
                <TableHead>{tEntities("country")}</TableHead>
                <TableHead className="text-center">{t("vessels")}</TableHead>
                <TableHead className="text-center">{t("projects")}</TableHead>
                <TableHead className="pr-6 text-right">
                  {tEntities("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="pl-6 font-medium">{client.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {tEnums(`ClientType.${client.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{client.country ?? tEntities("none")}</TableCell>
                    <TableCell className="text-center">
                      {client._count.vessels}
                    </TableCell>
                    <TableCell className="text-center">
                      {client._count.projects}
                    </TableCell>
                    <TableCell className="pr-6">
                      <ClientRowActions
                        client={{
                          id: client.id,
                          name: client.name,
                          type: client.type,
                          country: client.country,
                          notes: client.notes,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
