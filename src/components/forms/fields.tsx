import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function TextField({
  name,
  label,
  defaultValue,
  required,
  type = "text",
  placeholder,
  className,
  step,
  min,
  max,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  placeholder?: string;
  className?: string;
  step?: string;
  min?: string | number;
  max?: string | number;
}) {
  return (
    <Field label={label} htmlFor={name} className={className}>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
      />
    </Field>
  );
}

export function TextareaField({
  name,
  label,
  defaultValue,
  rows = 3,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  rows?: number;
  className?: string;
}) {
  return (
    <Field label={label} htmlFor={name} className={className}>
      <Textarea id={name} name={name} defaultValue={defaultValue ?? ""} rows={rows} />
    </Field>
  );
}

/** Native select, styled to match Input — plays well with plain FormData forms. */
export function SelectField({
  name,
  label,
  defaultValue,
  options,
  required,
  className,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} htmlFor={name} className={className}>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

const toDateInput = (date: Date | null | undefined) =>
  date ? new Date(date).toISOString().slice(0, 10) : "";

export function DateField({
  name,
  label,
  defaultValue,
  required,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: Date | null;
  required?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} htmlFor={name} className={className}>
      <Input
        id={name}
        name={name}
        type="date"
        defaultValue={toDateInput(defaultValue)}
        required={required}
      />
    </Field>
  );
}
