import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  country: z.string().trim().min(1, "Country must not be empty").optional(),
  category: z.string().trim().min(1, "Category must not be empty").optional(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z.object({
  name: z.string().trim().min(1, "Name must not be empty").optional(),
  country: z.string().trim().min(1, "Country must not be empty").optional(),
  category: z.string().trim().min(1, "Category must not be empty").optional(),
});
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
