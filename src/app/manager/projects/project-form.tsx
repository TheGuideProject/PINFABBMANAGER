"use client";

import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import {
  DateField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/server/actions/projects";

const PROJECT_TYPES = [
  "INSTALLATION",
  "SERVICE",
  "DRYDOCK_WORKS",
  "INSPECTION",
  "WARRANTY",
] as const;
const PROJECT_STATUSES = [
  "PLANNED",
  "MOBILIZING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

export type Option = { value: string; label: string };

export type ProjectFormData = {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  complexity: number;
  vesselId: string;
  clientId: string;
  locationId: string;
  startDate: Date;
  endDate: Date;
  description: string | null;
};

export type ProjectFormOptions = {
  vessels: Option[];
  clients: Option[];
  locations: Option[];
};

function ProjectFields({
  project,
  options,
}: {
  project?: ProjectFormData;
  options: ProjectFormOptions;
}) {
  const tEntities = useTranslations("entities");
  const tEnums = useTranslations("enums");

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="code"
          label={tEntities("code")}
          defaultValue={project?.code}
          placeholder="PF-2026-001"
          required
        />
        <SelectField
          name="status"
          label={tEntities("status")}
          defaultValue={project?.status ?? "PLANNED"}
          options={PROJECT_STATUSES.map((value) => ({
            value,
            label: tEnums(`ProjectStatus.${value}`),
          }))}
          required
        />
      </div>
      <TextField name="title" label={tEntities("title")} defaultValue={project?.title} required />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          name="type"
          label={tEntities("type")}
          defaultValue={project?.type ?? "SERVICE"}
          options={PROJECT_TYPES.map((value) => ({
            value,
            label: tEnums(`ProjectType.${value}`),
          }))}
          required
        />
        <TextField
          name="complexity"
          label={tEntities("complexity")}
          type="number"
          min={1}
          max={5}
          defaultValue={project?.complexity ?? 3}
          required
        />
      </div>
      <SelectField
        name="vesselId"
        label={tEntities("vessel")}
        defaultValue={project?.vesselId}
        options={options.vessels}
        placeholder=""
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          name="clientId"
          label={tEntities("client")}
          defaultValue={project?.clientId}
          options={options.clients}
          placeholder=""
          required
        />
        <SelectField
          name="locationId"
          label={tEntities("location")}
          defaultValue={project?.locationId}
          options={options.locations}
          placeholder=""
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DateField
          name="startDate"
          label={tEntities("startDate")}
          defaultValue={project?.startDate}
          required
        />
        <DateField
          name="endDate"
          label={tEntities("endDate")}
          defaultValue={project?.endDate}
          required
        />
      </div>
      <TextareaField
        name="description"
        label={tEntities("description")}
        defaultValue={project?.description}
      />
    </>
  );
}

export function NewProjectButton({ options }: { options: ProjectFormOptions }) {
  const t = useTranslations("pages.projects");
  return (
    <FormDialog
      title={t("newProject")}
      action={createProject}
      trigger={
        <Button size="sm">
          <Plus className="size-4" aria-hidden /> {t("newProject")}
        </Button>
      }
    >
      <ProjectFields options={options} />
    </FormDialog>
  );
}

export function EditProjectButton({
  project,
  options,
}: {
  project: ProjectFormData;
  options: ProjectFormOptions;
}) {
  const t = useTranslations("pages.projects");
  return (
    <FormDialog
      title={t("editProject")}
      action={updateProject.bind(null, project.id)}
      trigger={
        <Button variant="outline" size="sm">
          <Pencil className="size-4" aria-hidden /> {t("editProject")}
        </Button>
      }
    >
      <ProjectFields project={project} options={options} />
    </FormDialog>
  );
}

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const tForms = useTranslations("forms");
  return (
    <ConfirmDelete
      action={deleteProject.bind(null, projectId)}
      trigger={
        <Button variant="outline" size="sm">
          <Trash2 className="size-4 text-red-500" aria-hidden /> {tForms("delete")}
        </Button>
      }
    />
  );
}
