"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deletePhoto } from "@/server/actions/daily-logs";

export type PhotoItem = {
  id: string;
  storageKey: string;
  category: string;
  caption: string | null;
};

export function PhotoGrid({
  photos,
  canDelete = false,
}: {
  photos: PhotoItem[];
  canDelete?: boolean;
}) {
  const t = useTranslations("techJobs");
  const tEnums = useTranslations("enums");
  const tForms = useTranslations("forms");
  const [selected, setSelected] = useState<PhotoItem | null>(null);
  const [, startTransition] = useTransition();

  const onDelete = (photoId: string) => {
    startTransition(async () => {
      const result = await deletePhoto(photoId);
      if (result.ok) toast.success(tForms("deleted"));
      else toast.error(tForms(`errors.${result.error}`));
    });
  };

  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noPhotos")}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative">
            <button
              type="button"
              onClick={() => setSelected(photo)}
              className="block aspect-square w-full overflow-hidden rounded-lg border bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- app-proxied/signed URLs */}
              <img
                src={`/api/files/${photo.storageKey}`}
                alt={photo.caption ?? photo.category}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
            {canDelete ? (
              <Button
                variant="destructive"
                size="icon-sm"
                className="absolute right-1 top-1 opacity-80"
                onClick={() => onDelete(photo.id)}
                aria-label={tForms("delete")}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl p-3">
          {selected ? (
            <div className="space-y-2">
              <DialogTitle className="sr-only">
                {selected.caption ?? selected.category}
              </DialogTitle>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${selected.storageKey}`}
                alt={selected.caption ?? selected.category}
                className="max-h-[75dvh] w-full rounded-lg object-contain"
              />
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">
                  {tEnums(`PhotoCategory.${selected.category}`)}
                </Badge>
                {selected.caption ? (
                  <span className="text-muted-foreground">{selected.caption}</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
