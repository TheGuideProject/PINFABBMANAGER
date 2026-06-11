"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { DateField, SelectField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createAssignment,
  deleteAssignment,
  updateAssignment,
} from "@/server/actions/assignments";

const ASSIGNMENT_ROLES = ["LEAD", "TECHNICIAN", "SUPPORT"] as const;
const ASSIGNMENT_STATUSES = [
  "PLANNED",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

type Option = { value: string; label: string };

type AssignmentData = {
  id: string;
  technicianId: string;
  technicianName: string;
  role: string;
  status: string;
  startDate: Date;
  endDate: Date;
  travelOutDate: Date | null;
  travelReturnDate: Date | null;
};

function AssignmentFields({
  projectId,
  assignment,
  technicianOptions,
}: {
  projectId: string;
  assignment?: AssignmentData;
  technicianOptions: Option[];
}) {
  const tEntities = useTranslations("entities");
  const tEnums = useTranslations("enums");

  return (
    <>
      <input type="hidden" name="projectId" value={projectId} />
      <SelectField
        name="technicianId"
        label={tEntities("technician")}
        defaultValue={assignment?.technicianId}
        options={technicianOptions}
        placeholder=""
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          name="role"
          label={tEntities("role")}
          defaultValue={assignment?.role ?? "TECHNICIAN"}
          options={ASSIGNMENT_ROLES.map((value) => ({
            value,
            label: tEnums(`AssignmentRole.${value}`),
          }))}
          required
        />
        <SelectField
          name="status"
          label={tEntities("status")}
          defaultValue={assignment?.status ?? "PLANNED"}
          options={ASSIGNMENT_STATUSES.map((value) => ({
            value,
            label: tEnums(`AssignmentStatus.${value}`),
          }))}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DateField
          name="startDate"
          label={tEntities("startDate")}
          defaultValue={assignment?.startDate}
          required
        />
        <DateField
          name="endDate"
          label={tEntities("endDate")}
          defaultValue={assignment?.endDate}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DateField
          name="travelOutDate"
          label={tEntities("travelOut")}
          defaultValue={assignment?.travelOutDate}
        />
        <DateField
          name="travelReturnDate"
          label={tEntities("travelReturn")}
          defaultValue={assignment?.travelReturnDate}
        />
      </div>
    </>
  );
}

export function ProjectTeam({
  projectId,
  assignments,
  technicianOptions,
}: {
  projectId: string;
  assignments: AssignmentData[];
  technicianOptions: Option[];
}) {
  const t = useTranslations("pages.projects");
  const tEntities = useTranslations("entities");
  const tEnums = useTranslations("enums");
  const format = useFormatter();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("team")}</h3>
        <FormDialog
          title={t("addAssignment")}
          action={createAssignment}
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="size-4" aria-hidden /> {t("addAssignment")}
            </Button>
          }
        >
          <AssignmentFields
            projectId={projectId}
            technicianOptions={technicianOptions}
          />
        </FormDialog>
      </div>

      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noTeam")}</p>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{tEntities("technician")}</TableHead>
                <TableHead>{tEntities("role")}</TableHead>
                <TableHead>{tEntities("status")}</TableHead>
                <TableHead>{t("dates")}</TableHead>
                <TableHead className="pr-4 text-right">
                  {tEntities("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="pl-4 font-medium">
                    {assignment.technicianName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {tEnums(`AssignmentRole.${assignment.role}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tEnums(`AssignmentStatus.${assignment.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format.dateTimeRange(assignment.startDate, assignment.endDate, {
                      day: "numeric",
                      month: "short",
                    })}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-1">
                      <FormDialog
                        title={t("addAssignment")}
                        action={updateAssignment.bind(null, assignment.id)}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Edit">
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                        }
                      >
                        <AssignmentFields
                          projectId={projectId}
                          assignment={assignment}
                          technicianOptions={technicianOptions}
                        />
                      </FormDialog>
                      <ConfirmDelete
                        action={deleteAssignment.bind(null, assignment.id)}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Delete">
                            <Trash2 className="size-4 text-red-500" aria-hidden />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
