"use client";

import { useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { DateField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addMilestone,
  deleteMilestone,
  toggleMilestone,
} from "@/server/actions/projects";
import { cn } from "@/lib/utils";

type MilestoneData = {
  id: string;
  name: string;
  dueDate: Date;
  done: boolean;
};

export function Milestones({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: MilestoneData[];
}) {
  const t = useTranslations("pages.projects");
  const tEntities = useTranslations("entities");
  const tForms = useTranslations("forms");
  const format = useFormatter();
  const [, startTransition] = useTransition();

  const onToggle = (id: string) => {
    startTransition(async () => {
      const result = await toggleMilestone(id);
      if (!result.ok) toast.error(tForms(`errors.${result.error}`));
    });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteMilestone(id);
      if (!result.ok) toast.error(tForms(`errors.${result.error}`));
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("milestones")}</h3>
        <FormDialog
          title={t("addMilestone")}
          action={addMilestone}
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="size-4" aria-hidden /> {t("addMilestone")}
            </Button>
          }
        >
          <input type="hidden" name="projectId" value={projectId} />
          <TextField name="name" label={tEntities("name")} required />
          <DateField name="dueDate" label={tEntities("dueDate")} required />
        </FormDialog>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noMilestones")}</p>
      ) : (
        <ul className="space-y-2">
          {milestones.map((milestone) => (
            <li
              key={milestone.id}
              className="flex items-center gap-3 rounded-lg border bg-white p-3"
            >
              <Checkbox
                checked={milestone.done}
                onCheckedChange={() => onToggle(milestone.id)}
                aria-label={milestone.name}
              />
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "truncate text-sm font-medium",
                    milestone.done && "text-muted-foreground line-through",
                  )}
                >
                  {milestone.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format.dateTime(milestone.dueDate, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(milestone.id)}
                aria-label={tForms("delete")}
              >
                <Trash2 className="size-4 text-red-500" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
