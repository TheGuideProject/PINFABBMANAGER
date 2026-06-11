"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

function FilterSelect({
  param,
  label,
  options,
}: {
  param: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("criticalities");

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(param, value);
    else params.delete(param);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {label}
      <select
        value={searchParams.get(param) ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="border-input h-8 rounded-md border bg-white px-2 text-sm text-foreground shadow-xs outline-none"
      >
        <option value="">{t("all")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CriticalityFilters() {
  const t = useTranslations("criticalities");
  const tEnums = useTranslations("enums");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterSelect
        param="status"
        label={t("filterStatus")}
        options={["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "DISMISSED"].map(
          (value) => ({ value, label: tEnums(`CriticalityStatus.${value}`) }),
        )}
      />
      <FilterSelect
        param="severity"
        label={t("filterSeverity")}
        options={["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((value) => ({
          value,
          label: tEnums(`Severity.${value}`),
        }))}
      />
      <FilterSelect
        param="source"
        label={t("filterSource")}
        options={["DAILY_LOG", "MEETING", "PHOTO", "MANUAL"].map((value) => ({
          value,
          label: tEnums(`CriticalitySource.${value}`),
        }))}
      />
    </div>
  );
}
