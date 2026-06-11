"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import imageCompression from "browser-image-compression";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/forms/fields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIES = [
  "FIN_CONDITION",
  "HULL_OPENING",
  "SEAL",
  "ACTUATOR",
  "HYDRAULICS",
  "DAMAGE",
  "GENERAL",
  "DOCUMENT",
] as const;

export function PhotoCapture({
  projectId,
  dailyLogId,
}: {
  projectId: string;
  dailyLogId: string;
}) {
  const t = useTranslations("techJobs");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length > 0) setFiles(picked);
    event.target.value = "";
  };

  const onConfirm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const category = String(formData.get("category") ?? "GENERAL");
    const caption = String(formData.get("caption") ?? "");

    setUploading(true);
    try {
      for (const file of files) {
        // Shrink phone photos (~1600px, JPEG) before they leave the dock's 3G.
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 1600,
          maxSizeMB: 1.5,
          useWebWorker: true,
        });
        const body = new FormData();
        body.set(
          "file",
          new File([compressed], file.name, { type: compressed.type }),
        );
        body.set("projectId", projectId);
        body.set("dailyLogId", dailyLogId);
        body.set("category", category);
        if (caption) body.set("caption", caption);

        const response = await fetch("/api/uploads", { method: "POST", body });
        if (!response.ok) throw new Error("upload");
      }
      setFiles([]);
      router.refresh();
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={onPick}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="size-4" aria-hidden /> {t("addPhoto")}
      </Button>

      <Dialog open={files.length > 0} onOpenChange={(open) => !open && setFiles([])}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("addPhoto")} ({files.length})
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onConfirm} className="space-y-4">
            <div className="flex gap-2 overflow-x-auto">
              {files.map((file, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={index}
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="size-20 shrink-0 rounded-lg border object-cover"
                />
              ))}
            </div>
            <SelectField
              name="category"
              label={t("category")}
              defaultValue="GENERAL"
              options={CATEGORIES.map((value) => ({
                value,
                label: tEnums(`PhotoCategory.${value}`),
              }))}
              required
            />
            <TextField name="caption" label={t("caption")} />
            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />{" "}
                  {t("uploading")}
                </>
              ) : (
                t("addPhoto")
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
