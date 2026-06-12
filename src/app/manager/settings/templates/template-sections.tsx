"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { SelectField, TextField, TextareaField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  addTemplateSection,
  deleteTemplateSection,
  moveTemplateSection,
  updateTemplateSection,
} from "@/server/actions/templates";
import { sectionTitle, type TemplateSection } from "@/lib/report-template";

const KINDS = ["text", "table", "measurements", "photos", "signatures"] as const;

function SectionFields({ section }: { section?: TemplateSection }) {
  const t = useTranslations("templates");

  return (
    <>
      <TextField
        name="key"
        label={t("key")}
        defaultValue={section?.key}
        placeholder="work_summary"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="titleEn" label={t("titleEn")} defaultValue={section?.titleEn} required />
        <TextField name="titleIt" label={t("titleIt")} defaultValue={section?.titleIt} required />
      </div>
      <SelectField
        name="kind"
        label={t("kind")}
        defaultValue={section?.kind ?? "text"}
        options={KINDS.map((kind) => ({ value: kind, label: t(`kinds.${kind}`) }))}
        required
      />
      <TextareaField name="aiHint" label={t("aiHint")} defaultValue={section?.aiHint} />
    </>
  );
}

export function TemplateSections({ sections }: { sections: TemplateSection[] }) {
  const t = useTranslations("templates");
  const tForms = useTranslations("forms");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  const move = (key: string, direction: "up" | "down") => {
    startTransition(async () => {
      const result = await moveTemplateSection(key, direction);
      if (!result.ok) toast.error(tForms(`errors.${result.error}`));
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <FormDialog
          title={t("addSection")}
          action={addTemplateSection}
          trigger={
            <Button size="sm">
              <Plus className="size-4" aria-hidden /> {t("addSection")}
            </Button>
          }
        >
          <SectionFields />
        </FormDialog>
      </div>

      <ul className="space-y-2">
        {sections.map((section, index) => (
          <li
            key={section.key}
            className="flex items-center gap-3 rounded-lg border bg-white p-3"
          >
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending || index === 0}
                onClick={() => move(section.key, "up")}
                aria-label={t("moveUp")}
              >
                <ArrowUp className="size-3.5" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending || index === sections.length - 1}
                onClick={() => move(section.key, "down")}
                aria-label={t("moveDown")}
              >
                <ArrowDown className="size-3.5" aria-hidden />
              </Button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">
                {sectionTitle(section, locale)}
              </div>
              <div className="text-xs text-muted-foreground">
                <code>{section.key}</code>
                {section.aiHint ? ` — ${section.aiHint}` : ""}
              </div>
            </div>

            <Badge variant="secondary" className="shrink-0">
              {t(`kinds.${section.kind}`)}
            </Badge>

            <div className="flex shrink-0 gap-1">
              <FormDialog
                title={t("editSection")}
                action={updateTemplateSection.bind(null, section.key)}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={t("editSection")}>
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                }
              >
                <SectionFields section={section} />
              </FormDialog>
              <ConfirmDelete
                action={deleteTemplateSection.bind(null, section.key)}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={tForms("delete")}>
                    <Trash2 className="size-4 text-red-500" aria-hidden />
                  </Button>
                }
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
