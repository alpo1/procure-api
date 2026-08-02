import {
  createSupplier as createSupplierRepo,
  CreateSupplierData,
  SupplierRow,
} from "../repositories/supplier.repository";
import { recordAudit } from "./audit.service";

export async function createSupplier(
  data: CreateSupplierData,
  userId: number
): Promise<SupplierRow> {
  const supplier = await createSupplierRepo(data);

  recordAudit({
    userId,
    action: "supplier.created",
    entityType: "supplier",
    entityId: supplier.id,
    details: {
      name: supplier.name,
      country: supplier.country,
      category: supplier.category,
    },
  });

  return supplier;
}
