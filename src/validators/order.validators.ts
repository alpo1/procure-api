import { z } from "zod";

export const orderItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  unit_price: z.number().nonnegative("Unit price must not be negative"),
});

export const createOrderSchema = z.object({
  supplier_id: z.number().int().positive("supplier_id must be a positive integer"),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(["draft", "approved", "cancelled"]),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
