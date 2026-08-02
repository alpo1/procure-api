import { query } from "../config/postgres";

export interface SupplierRow {
  id: number;
  name: string;
  country: string | null;
  category: string | null;
  created_at: Date;
}

export interface CreateSupplierData {
  name: string;
  country?: string;
  category?: string;
}

export interface UpdateSupplierData {
  name?: string;
  country?: string;
  category?: string;
}

const SUPPLIER_COLUMNS = ["name", "country", "category"] as const;

export async function findAllSuppliers(): Promise<SupplierRow[]> {
  const result = await query(
    "SELECT id, name, country, category, created_at FROM suppliers ORDER BY id"
  );
  return result.rows as SupplierRow[];
}

export async function findSupplierById(id: number): Promise<SupplierRow | null> {
  const result = await query(
    "SELECT id, name, country, category, created_at FROM suppliers WHERE id = $1",
    [id]
  );
  return (result.rows[0] as SupplierRow | undefined) ?? null;
}

export async function createSupplier(data: CreateSupplierData): Promise<SupplierRow> {
  const result = await query(
    `INSERT INTO suppliers (name, country, category)
     VALUES ($1, $2, $3)
     RETURNING id, name, country, category, created_at`,
    [data.name, data.country ?? null, data.category ?? null]
  );
  return result.rows[0] as SupplierRow;
}

export async function updateSupplier(
  id: number,
  data: UpdateSupplierData
): Promise<SupplierRow | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const column of SUPPLIER_COLUMNS) {
    const value = data[column];
    if (value !== undefined) {
      values.push(value);
      setClauses.push(`${column} = $${values.length}`);
    }
  }

  if (setClauses.length === 0) {
    return findSupplierById(id);
  }

  values.push(id);
  const idPlaceholder = `$${values.length}`;

  const result = await query(
    `UPDATE suppliers
     SET ${setClauses.join(", ")}
     WHERE id = ${idPlaceholder}
     RETURNING id, name, country, category, created_at`,
    values
  );

  return (result.rows[0] as SupplierRow | undefined) ?? null;
}

export async function deleteSupplier(id: number): Promise<boolean> {
  const result = await query("DELETE FROM suppliers WHERE id = $1 RETURNING id", [id]);
  return result.rows.length > 0;
}
