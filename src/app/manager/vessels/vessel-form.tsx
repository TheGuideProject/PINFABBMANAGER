"use client";

import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import {
  SelectField,
  TextField,
  TextareaField,
} from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import {
  createVessel,
  deleteVessel,
  updateVessel,
} from "@/server/actions/vessels";

type Option = { value: string; label: string };

type VesselData = {
  id: string;
  name: string;
  imoNumber: string | null;
  vesselType: string | null;
  flag: string | null;
  clientId: string | null;
  stabilizerModel: string | null;
  finCount: number | null;
  notes: string | null;
};

function VesselFields({
  vessel,
  clientOptions,
}: {
  vessel?: VesselData;
  clientOptions: Option[];
}) {
  const tEntities = useTranslations("entities");

  return (
    <>
      <TextField name="name" label={tEntities("name")} defaultValue={vessel?.name} required />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="imoNumber" label={tEntities("imo")} defaultValue={vessel?.imoNumber} />
        <TextField name="flag" label={tEntities("flag")} defaultValue={vessel?.flag} />
      </div>
      <SelectField
        name="clientId"
        label={tEntities("client")}
        defaultValue={vessel?.clientId}
        options={clientOptions}
        placeholder={tEntities("none")}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="vesselType"
          label={tEntities("vesselType")}
          defaultValue={vessel?.vesselType}
        />
        <TextField
          name="finCount"
          label={tEntities("finCount")}
          type="number"
          min={0}
          max={8}
          defaultValue={vessel?.finCount ?? 2}
        />
      </div>
      <TextField
        name="stabilizerModel"
        label={tEntities("stabilizerModel")}
        defaultValue={vessel?.stabilizerModel}
      />
      <TextareaField name="notes" label={tEntities("notes")} defaultValue={vessel?.notes} />
    </>
  );
}

export function NewVesselButton({ clientOptions }: { clientOptions: Option[] }) {
  const t = useTranslations("pages.vessels");
  return (
    <FormDialog
      title={t("newVessel")}
      action={createVessel}
      trigger={
        <Button size="sm">
          <Plus className="size-4" aria-hidden /> {t("newVessel")}
        </Button>
      }
    >
      <VesselFields clientOptions={clientOptions} />
    </FormDialog>
  );
}

export function VesselRowActions({
  vessel,
  clientOptions,
}: {
  vessel: VesselData;
  clientOptions: Option[];
}) {
  const t = useTranslations("pages.vessels");

  return (
    <div className="flex justify-end gap-1">
      <FormDialog
        title={t("editVessel")}
        action={updateVessel.bind(null, vessel.id)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t("editVessel")}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        }
      >
        <VesselFields vessel={vessel} clientOptions={clientOptions} />
      </FormDialog>
      <ConfirmDelete
        action={deleteVessel.bind(null, vessel.id)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Delete">
            <Trash2 className="size-4 text-red-500" aria-hidden />
          </Button>
        }
      />
    </div>
  );
}
