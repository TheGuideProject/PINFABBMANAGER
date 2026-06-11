"use client";

import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { SelectField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import {
  createLocation,
  deleteLocation,
  updateLocation,
} from "@/server/actions/locations";

const LOCATION_KINDS = ["SHIPYARD", "DRYDOCK", "PORT", "ANCHORAGE"] as const;

type LocationData = {
  id: string;
  name: string;
  kind: string;
  city: string | null;
  country: string;
  lat: number;
  lng: number;
  timezone: string | null;
};

function LocationFields({ location }: { location?: LocationData }) {
  const tEntities = useTranslations("entities");
  const tEnums = useTranslations("enums");

  return (
    <>
      <TextField name="name" label={tEntities("name")} defaultValue={location?.name} required />
      <SelectField
        name="kind"
        label={tEntities("type")}
        defaultValue={location?.kind ?? "SHIPYARD"}
        options={LOCATION_KINDS.map((value) => ({
          value,
          label: tEnums(`LocationKind.${value}`),
        }))}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="city" label={tEntities("city")} defaultValue={location?.city} />
        <TextField
          name="country"
          label={tEntities("country")}
          defaultValue={location?.country}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="lat"
          label={tEntities("lat")}
          type="number"
          step="any"
          min={-90}
          max={90}
          defaultValue={location?.lat}
          required
        />
        <TextField
          name="lng"
          label={tEntities("lng")}
          type="number"
          step="any"
          min={-180}
          max={180}
          defaultValue={location?.lng}
          required
        />
      </div>
      <TextField
        name="timezone"
        label={tEntities("timezone")}
        defaultValue={location?.timezone}
        placeholder="Europe/Rome"
      />
    </>
  );
}

export function NewLocationButton() {
  const t = useTranslations("pages.locations");
  return (
    <FormDialog
      title={t("newLocation")}
      action={createLocation}
      trigger={
        <Button size="sm">
          <Plus className="size-4" aria-hidden /> {t("newLocation")}
        </Button>
      }
    >
      <LocationFields />
    </FormDialog>
  );
}

export function LocationRowActions({ location }: { location: LocationData }) {
  const t = useTranslations("pages.locations");

  return (
    <div className="flex justify-end gap-1">
      <FormDialog
        title={t("editLocation")}
        action={updateLocation.bind(null, location.id)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t("editLocation")}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        }
      >
        <LocationFields location={location} />
      </FormDialog>
      <ConfirmDelete
        action={deleteLocation.bind(null, location.id)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Delete">
            <Trash2 className="size-4 text-red-500" aria-hidden />
          </Button>
        }
      />
    </div>
  );
}
