import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/require-auth";
import { createOrderSchema, updateOrderStatusSchema } from "../validators/order.validators";
import {
  listOrders,
  getOrder,
  createOrderHandler,
  updateOrderStatusHandler,
} from "../controllers/order.controller";

export const ordersRouter = Router();

ordersRouter.get("/", requireAuth, asyncHandler(listOrders));
ordersRouter.get("/:id", requireAuth, asyncHandler(getOrder));

ordersRouter.post(
  "/",
  requireAuth,
  validateBody(createOrderSchema),
  asyncHandler(createOrderHandler)
);

ordersRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("admin"),
  validateBody(updateOrderStatusSchema),
  asyncHandler(updateOrderStatusHandler)
);
