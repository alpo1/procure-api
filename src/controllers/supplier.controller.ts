import { Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { parseId } from "../utils/parse-id";
import {
  findAllSuppliers,
  findSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../repositories/supplier.repository";

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
  const supplier = await createSupplier(req.body);
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
