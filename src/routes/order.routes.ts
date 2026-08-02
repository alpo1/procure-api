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
  exportOrdersCsvHandler,
} from "../controllers/order.controller";

export const ordersRouter = Router();

ordersRouter.get("/", requireAuth, asyncHandler(listOrders));

// Registered BEFORE "/:id": Express matches routes in registration order and
// ":id" is an unconstrained path segment, so if "/:id" came first it would
// swallow "/export.csv" and parseId("export.csv") would throw a 400 before
// this handler is ever reached.
ordersRouter.get("/export.csv", requireAuth, asyncHandler(exportOrdersCsvHandler));

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
