import { Request, Response } from "express";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { AppError } from "../errors/app-error";
import { parseId } from "../utils/parse-id";
import { csvRow } from "../utils/csv";
import { findAllOrders, findOrderWithItems } from "../repositories/order.repository";
import { createOrderWithItems, updateOrderStatus } from "../services/order.service";

export async function listOrders(_req: Request, res: Response): Promise<void> {
  const orders = await findAllOrders();
  res.status(200).json(orders);
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const order = await findOrderWithItems(id);
  if (!order) {
    throw new AppError(404, "Order not found");
  }
  res.status(200).json(order);
}

export async function createOrderHandler(req: Request, res: Response): Promise<void> {
  const order = await createOrderWithItems(req.body, req.user!.id);
  res.status(201).json(order);
}

export async function updateOrderStatusHandler(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  const order = await updateOrderStatus(id, req.body.status, req.user!.id);
  if (!order) {
    throw new AppError(404, "Order not found");
  }
  res.status(200).json(order);
}

const EXPORT_COLUMNS = ["id", "supplier_id", "created_by", "status", "total", "created_at"] as const;

export async function exportOrdersCsvHandler(_req: Request, res: Response): Promise<void> {
  // findAllOrders() still does one buffered pool.query() — the full result
  // set is loaded into a JS array in memory before this handler runs; that
  // is an inherent limitation of the `pg` driver without pg-query-stream /
  // pg-cursor, which cannot be added under the no-new-dependency constraint.
  // What IS genuinely streamed is the serialization below: rows are turned
  // into CSV lines and written to `res` one at a time via `pipeline`, so no
  // single giant string is ever built and `res`'s backpressure (a slow
  // client) is correctly respected.
  const orders = await findAllOrders();

  res.status(200);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="orders.csv"');

  const rows = Readable.from(orders, { objectMode: true });

  async function* toCsvLines(
    source: AsyncIterable<(typeof orders)[number]>
  ): AsyncGenerator<string> {
    yield csvRow([...EXPORT_COLUMNS]);
    for await (const order of source) {
      yield csvRow(EXPORT_COLUMNS.map((col) => order[col]));
    }
  }

  await pipeline(rows, toCsvLines, res);
}
