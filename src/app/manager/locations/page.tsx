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
import { LocationRowActions, NewLocationButton } from "./location-form";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations("pages.locations");
  const tEntities = await getTranslations("entities");
  const tEnums = await getTranslations("enums");
  const tForms = await getTranslations("forms");

  const locations = await prisma.location.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { projects: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <NewLocationButton />
      </div>
      <SearchInput placeholder={tForms("search")} />

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{tEntities("name")}</TableHead>
                <TableHead>{tEntities("type")}</TableHead>
                <TableHead>{tEntities("city")}</TableHead>
                <TableHead>{tEntities("country")}</TableHead>
                <TableHead className="text-center">Lat / Lng</TableHead>
                <TableHead className="pr-6 text-right">
                  {tEntities("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="pl-6 font-medium">
                      {location.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {tEnums(`LocationKind.${location.kind}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{location.city ?? tEntities("none")}</TableCell>
                    <TableCell>{location.country}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <LocationRowActions
                        location={{
                          id: location.id,
                          name: location.name,
                          kind: location.kind,
                          city: location.city,
                          country: location.country,
                          lat: location.lat,
                          lng: location.lng,
                          timezone: location.timezone,
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
