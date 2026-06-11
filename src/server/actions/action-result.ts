import { z } from "zod";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function fromZodError(error: z.ZodError): ActionResult {
  const flat = z.flattenError(error);
  return {
    ok: false,
    error: "validation",
    fieldErrors: flat.fieldErrors as Record<string, string[]>,
  };
}

export function failure(error: string): ActionResult {
  return { ok: false, error };
}

export const success: ActionResult = { ok: true };
