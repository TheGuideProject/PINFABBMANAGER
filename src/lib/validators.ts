import { z } from "zod";

// Shared coercers: HTML form fields arrive as strings.
const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

const requiredDate = z.coerce.date();
const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : new Date(value)))
  .nullable()
  .optional();

export const clientSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["SHIPOWNER", "SHIPYARD", "OPERATOR", "OTHER"]),
  country: optionalString,
  notes: optionalString,
});

export const vesselSchema = z.object({
  name: z.string().trim().min(1),
  imoNumber: optionalString,
  vesselType: optionalString,
  flag: optionalString,
  clientId: optionalString,
  stabilizerModel: optionalString,
  finCount: z.coerce.number().int().min(0).max(8).optional(),
  notes: optionalString,
});

export const locationSchema = z.object({
  name: z.string().trim().min(1),
  kind: z.enum(["SHIPYARD", "DRYDOCK", "PORT", "ANCHORAGE"]),
  city: optionalString,
  country: z.string().trim().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  timezone: optionalString,
});

export const projectSchema = z
  .object({
    code: z.string().trim().min(1),
    title: z.string().trim().min(1),
    type: z.enum(["INSTALLATION", "SERVICE", "DRYDOCK_WORKS", "INSPECTION", "WARRANTY"]),
    status: z.enum(["PLANNED", "MOBILIZING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]),
    complexity: z.coerce.number().int().min(1).max(5),
    vesselId: z.string().min(1),
    clientId: z.string().min(1),
    locationId: z.string().min(1),
    startDate: requiredDate,
    endDate: requiredDate,
    description: optionalString,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "endBeforeStart",
    path: ["endDate"],
  });

export const technicianSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8).optional().or(z.literal("")),
  phone: optionalString,
  homeBase: optionalString,
  locale: z.enum(["it", "en"]),
  active: z.coerce.boolean().optional(),
});

export const assignmentSchema = z
  .object({
    projectId: z.string().min(1),
    technicianId: z.string().min(1),
    role: z.enum(["LEAD", "TECHNICIAN", "SUPPORT"]),
    status: z.enum(["PLANNED", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"]),
    startDate: requiredDate,
    endDate: requiredDate,
    travelOutDate: optionalDate,
    travelReturnDate: optionalDate,
    notes: optionalString,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "endBeforeStart",
    path: ["endDate"],
  });

export const milestoneSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1),
  dueDate: requiredDate,
});

export type ClientInput = z.infer<typeof clientSchema>;
export type VesselInput = z.infer<typeof vesselSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type TechnicianInput = z.infer<typeof technicianSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
