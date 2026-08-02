import { Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { parseId } from "../utils/parse-id";
import {
  findAllSuppliers,
  findSupplierById,
  updateSupplier,
  deleteSupplier,
} from "../repositories/supplier.repository";
import { createSupplier } from "../services/supplier.service";
import { importCatalogCsv } from "../services/catalog.service";

export async function listSuppliers(_req: Request, res: Response): Promise<void> {
  const suppliers = await findAllSuppliers();
  res.status(200).json(suppliers);
}

export async function getSupplier(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const supplier = await findSupplierById(id);
  if (!supplier) {
    throw new AppError(404, "Supplier not found");
  }
  res.status(200).json(supplier);
}

export async function createSupplierHandler(req: Request, res: Response): Promise<void> {
  const supplier = await createSupplier(req.body, req.user!.id);
  res.status(201).json(supplier);
}

export async function updateSupplierHandler(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const supplier = await updateSupplier(id, req.body);
  if (!supplier) {
    throw new AppError(404, "Supplier not found");
  }
  res.status(200).json(supplier);
}

export async function deleteSupplierHandler(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const deleted = await deleteSupplier(id);
  if (!deleted) {
    throw new AppError(404, "Supplier not found");
  }
  res.status(204).send();
}

export async function importCatalogHandler(req: Request, res: Response): Promise<void> {
  const supplierId = parseId(req.params.id);
  // express.json() only consumes the body when Content-Type is
  // application/json; for any other Content-Type (clients must send e.g.
  // text/csv for this endpoint) it leaves `req` untouched, so `req` itself
  // is still the raw, fully-readable request byte stream here.
  const summary = await importCatalogCsv(supplierId, req, req.user!.id);
  res.status(200).json(summary);
}
