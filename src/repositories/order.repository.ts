import { PoolClient } from "pg";
import { pool, query } from "../config/postgres";
import { AppError } from "../errors/app-error";
import { CreateOrderInput } from "../validators/order.validators";

export type OrderStatus = "draft" | "approved" | "cancelled";

export interface OrderRow {
  id: number;
  supplier_id: number;
  created_by: number;
  status: OrderStatus;
  // NUMERIC(12,2) comes back from `pg` as a string (no type parser is
  // configured for this app) — kept as a string end-to-end rather than
  // parseFloat'd, to avoid reintroducing float imprecision in the response.
  total: string;
  created_at: Date;
}

export interface OrderItemRow {
  id: number;
  order_id: number;
  description: string;
  quantity: number;
  unit_price: string; // same NUMERIC(12,2)-as-string reasoning as `total`
}

export interface OrderWithItems extends OrderRow {
  items: OrderItemRow[];
}

const SUPPLIER_FK_CONSTRAINT = "purchase_orders_supplier_id_fkey";

function isForeignKeyViolation(err: unknown, constraint: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23503" &&
    "constraint" in err &&
    (err as { constraint?: string }).constraint === constraint
  );
}

function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function computeTotal(items: CreateOrderInput["items"]): number {
  const sum = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  return roundToCents(sum);
}

export async function findAllOrders(): Promise<OrderRow[]> {
  const result = await query(
    "SELECT id, supplier_id, created_by, status, total, created_at FROM purchase_orders ORDER BY id"
  );
  return result.rows as OrderRow[];
}

export async function findOrderById(id: number): Promise<OrderRow | null> {
  const result = await query(
    "SELECT id, supplier_id, created_by, status, total, created_at FROM purchase_orders WHERE id = $1",
    [id]
  );
  return (result.rows[0] as OrderRow | undefined) ?? null;
}

export async function findOrderItems(orderId: number): Promise<OrderItemRow[]> {
  const result = await query(
    "SELECT id, order_id, description, quantity, unit_price FROM order_items WHERE order_id = $1 ORDER BY id",
    [orderId]
  );
  return result.rows as OrderItemRow[];
}

export async function findOrderWithItems(id: number): Promise<OrderWithItems | null> {
  const order = await findOrderById(id);
  if (!order) {
    return null;
  }
  const items = await findOrderItems(id);
  return { ...order, items };
}

// Creates an order and its items atomically. Uses a dedicated client so every
// statement runs against the same session/transaction — the shared query()
// helper in postgres.ts grabs an arbitrary pooled connection per call and
// must NOT be used here. On any failure the transaction is rolled back and
// the client is always released, whether it committed or not.
export async function createOrderWithItems(
  input: CreateOrderInput,
  createdBy: number
): Promise<OrderWithItems> {
  const total = computeTotal(input.items);

  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    let orderRow: OrderRow;
    try {
      const orderResult = await client.query(
        `INSERT INTO purchase_orders (supplier_id, created_by, total)
         VALUES ($1, $2, $3)
         RETURNING id, supplier_id, created_by, status, total, created_at`,
        [input.supplier_id, createdBy, total]
      );
      orderRow = orderResult.rows[0] as OrderRow;
    } catch (err) {
      if (isForeignKeyViolation(err, SUPPLIER_FK_CONSTRAINT)) {
        throw new AppError(400, "supplier_id does not reference an existing supplier");
      }
      throw err;
    }

    const items: OrderItemRow[] = [];
    for (const item of input.items) {
      const itemResult = await client.query(
        `INSERT INTO order_items (order_id, description, quantity, unit_price)
         VALUES ($1, $2, $3, $4)
         RETURNING id, order_id, description, quantity, unit_price`,
        [orderRow.id, item.description, item.quantity, item.unit_price]
      );
      items.push(itemResult.rows[0] as OrderItemRow);
    }

    await client.query("COMMIT");
    return { ...orderRow, items };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateOrderStatus(
  id: number,
  status: OrderStatus
): Promise<OrderRow | null> {
  const result = await query(
    `UPDATE purchase_orders
     SET status = $1
     WHERE id = $2
     RETURNING id, supplier_id, created_by, status, total, created_at`,
    [status, id]
  );
  return (result.rows[0] as OrderRow | undefined) ?? null;
}
