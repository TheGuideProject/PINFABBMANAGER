"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, SelectField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  addMeasurement,
  deleteMeasurement,
} from "@/server/actions/daily-logs";
import { cn } from "@/lib/utils";

const MEASUREMENT_TYPES = [
  "TOLERANCE",
  "CLEARANCE",
  "OIL_LEVEL",
  "OIL_CHANGE",
  "PRESSURE",
  "TEMPERATURE",
  "TORQUE",
  "OTHER",
] as const;

export type StandardOption = {
  id: string;
  name: string;
  unit: string;
  minValue: number | null;
  maxValue: number | null;
};

export type MeasurementItem = {
  id: string;
  name: string;
  value: number;
  unit: string;
  finPosition: string | null;
  withinSpec: boolean | null;
};

function rangeLabel(standard: StandardOption) {
  if (standard.minValue !== null && standard.maxValue !== null) {
    return `${standard.minValue}–${standard.maxValue} ${standard.unit}`;
  }
  if (standard.minValue !== null) return `≥ ${standard.minValue} ${standard.unit}`;
  if (standard.maxValue !== null) return `≤ ${standard.maxValue} ${standard.unit}`;
  return standard.unit;
}

export function Measurements({
  logId,
  editable,
  measurements,
  standards,
}: {
  logId: string;
  editable: boolean;
  measurements: MeasurementItem[];
  standards: StandardOption[];
}) {
  const t = useTranslations("techJobs");
  const tEnums = useTranslations("enums");
  const tForms = useTranslations("forms");
  const [standardId, setStandardId] = useState<string>(standards[0]?.id ?? "");
  const [, startTransition] = useTransition();

  const onDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteMeasurement(id);
      if (result.ok) toast.success(tForms("deleted"));
      else toast.error(tForms(`errors.${result.error}`));
    });
  };

  const selectedStandard = standards.find((standard) => standard.id === standardId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("measurements")}</h2>
        {editable ? (
          <FormDialog
            title={t("addMeasurement")}
            action={addMeasurement.bind(null, logId)}
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="size-4" aria-hidden /> {t("addMeasurement")}
              </Button>
            }
          >
            <Field label={t("fromStandard")} htmlFor="standardId">
              <select
                id="standardId"
                name="standardId"
                value={standardId}
                onChange={(event) => setStandardId(event.target.value)}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="">{t("freeEntry")}</option>
                {standards.map((standard) => (
                  <option key={standard.id} value={standard.id}>
                    {standard.name} ({rangeLabel(standard)})
                  </option>
                ))}
              </select>
            </Field>

            {!selectedStandard ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    name="type"
                    label={t("type")}
                    defaultValue="CLEARANCE"
                    options={MEASUREMENT_TYPES.map((value) => ({
                      value,
                      label: tEnums(`MeasurementType.${value}`),
                    }))}
                    required
                  />
                  <TextField name="unit" label={t("unit")} required placeholder="mm" />
                </div>
                <TextField name="name" label={t("measurementName")} required />
              </>
            ) : (
              <>
                {/* Standard chosen: server resolves type/name/unit from it */}
                <input type="hidden" name="type" value="OTHER" />
                <input type="hidden" name="name" value={selectedStandard.name} />
                <input type="hidden" name="unit" value={selectedStandard.unit} />
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <TextField
                name="value"
                label={
                  selectedStandard
                    ? `${t("value")} (${selectedStandard.unit})`
                    : t("value")
                }
                type="number"
                step="any"
                required
              />
              <SelectField
                name="finPosition"
                label={t("finPosition")}
                defaultValue=""
                options={[
                  { value: "PORT", label: tEnums("FinPosition.PORT") },
                  { value: "STARBOARD", label: tEnums("FinPosition.STARBOARD") },
                ]}
                placeholder="—"
              />
            </div>
            <TextField name="notes" label={t("notes")} />
          </FormDialog>
        ) : null}
      </div>

      {measurements.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noMeasurements")}</p>
      ) : (
        <ul className="space-y-2">
          {measurements.map((measurement) => (
            <li
              key={measurement.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-white p-3",
                measurement.withinSpec === false && "border-red-300 bg-red-50",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {measurement.name}
                  {measurement.finPosition ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({tEnums(`FinPosition.${measurement.finPosition}`)})
                    </span>
                  ) : null}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">
                    {measurement.value} {measurement.unit}
                  </span>
                  {measurement.withinSpec !== null ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-2 text-[10px]",
                        measurement.withinSpec
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-red-300 bg-red-100 text-red-700",
                      )}
                    >
                      {measurement.withinSpec ? t("withinSpec") : t("outOfSpec")}
                    </Badge>
                  ) : null}
                </div>
              </div>
              {editable ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(measurement.id)}
                  aria-label={tForms("delete")}
                >
                  <Trash2 className="size-4 text-red-500" aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
