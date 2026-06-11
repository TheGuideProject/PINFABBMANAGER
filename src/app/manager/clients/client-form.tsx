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
  createClient,
  deleteClient,
  updateClient,
} from "@/server/actions/clients";

const CLIENT_TYPES = ["SHIPOWNER", "SHIPYARD", "OPERATOR", "OTHER"] as const;

type ClientData = {
  id: string;
  name: string;
  type: string;
  country: string | null;
  notes: string | null;
};

function ClientFields({ client }: { client?: ClientData }) {
  const tEntities = useTranslations("entities");
  const tEnums = useTranslations("enums");

  return (
    <>
      <TextField name="name" label={tEntities("name")} defaultValue={client?.name} required />
      <SelectField
        name="type"
        label={tEntities("type")}
        defaultValue={client?.type ?? "SHIPOWNER"}
        options={CLIENT_TYPES.map((value) => ({
          value,
          label: tEnums(`ClientType.${value}`),
        }))}
        required
      />
      <TextField name="country" label={tEntities("country")} defaultValue={client?.country} />
      <TextareaField name="notes" label={tEntities("notes")} defaultValue={client?.notes} />
    </>
  );
}

export function NewClientButton() {
  const t = useTranslations("pages.clients");
  return (
    <FormDialog
      title={t("newClient")}
      action={createClient}
      trigger={
        <Button size="sm">
          <Plus className="size-4" aria-hidden /> {t("newClient")}
        </Button>
      }
    >
      <ClientFields />
    </FormDialog>
  );
}

export function ClientRowActions({ client }: { client: ClientData }) {
  const t = useTranslations("pages.clients");

  return (
    <div className="flex justify-end gap-1">
      <FormDialog
        title={t("editClient")}
        action={updateClient.bind(null, client.id)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t("editClient")}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        }
      >
        <ClientFields client={client} />
      </FormDialog>
      <ConfirmDelete
        action={deleteClient.bind(null, client.id)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Delete">
            <Trash2 className="size-4 text-red-500" aria-hidden />
          </Button>
        }
      />
    </div>
  );
}
