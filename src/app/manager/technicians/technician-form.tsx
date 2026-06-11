"use client";

import { useTranslations } from "next-intl";
import { Pencil, Plus, UserX, UserCheck } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { SelectField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import {
  createTechnician,
  deactivateTechnician,
  updateTechnician,
} from "@/server/actions/technicians";

type TechnicianData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  homeBase: string | null;
  locale: string;
  active: boolean;
};

function TechnicianFields({ technician }: { technician?: TechnicianData }) {
  const tEntities = useTranslations("entities");
  const tCommon = useTranslations("common");
  const isEdit = !!technician;

  return (
    <>
      <TextField name="name" label={tEntities("name")} defaultValue={technician?.name} required />
      <TextField
        name="email"
        label={tEntities("email")}
        type="email"
        defaultValue={technician?.email}
        required
      />
      <TextField
        name="password"
        label={isEdit ? tEntities("passwordKeep") : tEntities("password")}
        type="password"
        required={!isEdit}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="phone" label={tEntities("phone")} defaultValue={technician?.phone} />
        <TextField
          name="homeBase"
          label={tEntities("homeBase")}
          defaultValue={technician?.homeBase}
          placeholder="Genova, Italy"
        />
      </div>
      <SelectField
        name="locale"
        label={tEntities("language")}
        defaultValue={technician?.locale ?? "en"}
        options={[
          { value: "en", label: tCommon("english") },
          { value: "it", label: tCommon("italian") },
        ]}
        required
      />
      {isEdit ? (
        <input type="hidden" name="active" value={technician.active ? "true" : ""} />
      ) : null}
    </>
  );
}

export function NewTechnicianButton() {
  const t = useTranslations("pages.technicians");
  return (
    <FormDialog
      title={t("newTechnician")}
      action={createTechnician}
      trigger={
        <Button size="sm">
          <Plus className="size-4" aria-hidden /> {t("newTechnician")}
        </Button>
      }
    >
      <TechnicianFields />
    </FormDialog>
  );
}

export function TechnicianRowActions({ technician }: { technician: TechnicianData }) {
  const t = useTranslations("pages.technicians");
  const tForms = useTranslations("forms");
  const [pending, startTransition] = useTransition();

  const toggleActive = () => {
    startTransition(async () => {
      const result = await deactivateTechnician(technician.id);
      if (result.ok) toast.success(tForms("saved"));
      else toast.error(tForms(`errors.${result.error}`));
    });
  };

  return (
    <div className="flex justify-end gap-1">
      <FormDialog
        title={t("editTechnician")}
        action={updateTechnician.bind(null, technician.id)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t("editTechnician")}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        }
      >
        <TechnicianFields technician={technician} />
      </FormDialog>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleActive}
        disabled={pending}
        aria-label={technician.active ? t("deactivate") : t("activate")}
        title={technician.active ? t("deactivate") : t("activate")}
      >
        {technician.active ? (
          <UserX className="size-4 text-red-500" aria-hidden />
        ) : (
          <UserCheck className="size-4 text-emerald-600" aria-hidden />
        )}
      </Button>
    </div>
  );
}
