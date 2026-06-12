"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import SignaturePad from "signature_pad";
import { Eraser, PenLine } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/forms/fields";
import { addSignature } from "@/server/actions/reports";
import type { ActionResult } from "@/server/actions/action-result";

export function SignatureDialog({
  reportId,
  kinds,
  triggerLabel,
  onDone,
}: {
  reportId: string;
  kinds: ("TECHNICIAN" | "INSPECTOR" | "CLIENT" | "MANAGER")[];
  triggerLabel: string;
  onDone?: () => void;
}) {
  const t = useTranslations("reports");
  const tEnums = useTranslations("enums");
  const tForms = useTranslations("forms");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (!open) return;
    // Wait for the dialog to mount the canvas.
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current = new SignaturePad(canvas, {
        backgroundColor: "rgba(255,255,255,0)",
        penColor: "#1e293b",
      });
    }, 50);
    return () => {
      clearTimeout(timer);
      padRef.current?.off();
      padRef.current = null;
    };
  }, [open]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      toast.error(tForms("errors.validation"));
      return;
    }
    const formData = new FormData(event.currentTarget);
    formData.set("imageDataUrl", pad.toDataURL("image/png"));

    startTransition(async () => {
      const result: ActionResult = await addSignature(reportId, formData);
      if (result.ok) {
        toast.success(tForms("saved"));
        setOpen(false);
        onDone?.();
      } else {
        toast.error(tForms(`errors.${result.error}`));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PenLine className="size-4" aria-hidden /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("signCanvas")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField name="signerName" label={t("signerName")} required />
            <TextField name="signerTitle" label={t("signerTitle")} />
          </div>
          <SelectField
            name="kind"
            label={t("signatureKind")}
            defaultValue={kinds[0]}
            options={kinds.map((kind) => ({
              value: kind,
              label: tEnums(`SignatureKind.${kind}`),
            }))}
            required
          />
          <div className="space-y-1.5">
            <div className="rounded-lg border-2 border-dashed bg-white">
              <canvas
                ref={canvasRef}
                className="h-44 w-full touch-none"
                aria-label={t("signCanvas")}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => padRef.current?.clear()}
            >
              <Eraser className="size-4" aria-hidden /> {t("clearSignature")}
            </Button>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? tForms("saving") : t("applySignature")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
