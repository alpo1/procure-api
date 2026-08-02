import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/require-auth";
import { createSupplierSchema, updateSupplierSchema } from "../validators/supplier.validators";
import {
  listSuppliers,
  getSupplier,
  createSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler,
  importCatalogHandler,
} from "../controllers/supplier.controller";

export const suppliersRouter = Router();

suppliersRouter.get("/", requireAuth, asyncHandler(listSuppliers));
suppliersRouter.get("/:id", requireAuth, asyncHandler(getSupplier));

suppliersRouter.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(createSupplierSchema),
  asyncHandler(createSupplierHandler)
);

suppliersRouter.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateBody(updateSupplierSchema),
  asyncHandler(updateSupplierHandler)
);

suppliersRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(deleteSupplierHandler)
);

// No validateBody here — the body is a raw CSV byte stream, not JSON, so
// there's nothing to run through the JSON-body zod middleware.
suppliersRouter.post(
  "/:id/catalog/import",
  requireAuth,
  requireRole("admin"),
  asyncHandler(importCatalogHandler)
);
