import { z } from "zod";

// One row parsed from the uploaded CSV by csv-parse with `columns: true`.
// Every field arrives as a string (CSV has no types) — numeric coercion and
// empty-string handling happen here, before a row is ever sent to the DB.
export const catalogRowSchema = z.object({
  sku: z.string().trim().min(1, "sku is required"),
  name: z.string().trim().min(1, "name is required"),
  unit_price: z.coerce.number().nonnegative("unit_price must not be negative"),
  // `columns: true` turns an empty CSV cell into "", not undefined — a bare
  // `.optional()` would accept "" as a valid (empty) string rather than
  // treating "not provided" as absent, so blank cells are normalized to
  // undefined before the base schema runs.
  unit: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().min(1).optional()
  ),
});
export type CatalogRowInput = z.infer<typeof catalogRowSchema>;
