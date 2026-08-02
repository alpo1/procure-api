import { query } from "../config/postgres";
import { CatalogRowInput } from "../validators/catalog.validators";

export interface CatalogItemRow {
  id: number;
  supplier_id: number;
  sku: string;
  name: string;
  unit_price: string; // NUMERIC(12,2) comes back from `pg` as a string — same convention as OrderRow.total
  unit: string | null;
  created_at: Date;
}

const COLUMNS_PER_ROW = 5; // supplier_id, sku, name, unit_price, unit

// Batch upsert: a single parameterized multi-row INSERT per call, one round
// trip per batch instead of per row. `ON CONFLICT (supplier_id, sku) DO
// UPDATE` treats a re-import as a catalog refresh (updated price/name/unit
// for an existing SKU) rather than a hard failure — the realistic behavior
// for "import a supplier's catalog" as opposed to a generic bulk insert.
// Because it's an upsert (never DO NOTHING), every row in the batch is
// guaranteed to come back via RETURNING, so the caller can safely treat
// `result.rows.length` as the number of rows successfully written from
// this batch.
export async function insertCatalogItemsBatch(
  supplierId: number,
  rows: CatalogRowInput[]
): Promise<CatalogItemRow[]> {
  if (rows.length === 0) {
    return [];
  }

  const values: unknown[] = [];
  const placeholders: string[] = [];

  rows.forEach((row, i) => {
    const base = i * COLUMNS_PER_ROW;
    placeholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`
    );
    values.push(supplierId, row.sku, row.name, row.unit_price, row.unit ?? null);
  });

  const result = await query(
    `INSERT INTO catalog_items (supplier_id, sku, name, unit_price, unit)
     VALUES ${placeholders.join(", ")}
     ON CONFLICT (supplier_id, sku)
     DO UPDATE SET name = EXCLUDED.name, unit_price = EXCLUDED.unit_price, unit = EXCLUDED.unit
     RETURNING id, supplier_id, sku, name, unit_price, unit, created_at`,
    values
  );

  return result.rows as CatalogItemRow[];
}
