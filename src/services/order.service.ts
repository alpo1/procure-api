import {
  createOrderWithItems as createOrderWithItemsRepo,
  updateOrderStatus as updateOrderStatusRepo,
  OrderStatus,
  OrderRow,
  OrderWithItems,
} from "../repositories/order.repository";
import { CreateOrderInput } from "../validators/order.validators";
import { recordAudit } from "./audit.service";

export async function createOrderWithItems(
  input: CreateOrderInput,
  createdBy: number
): Promise<OrderWithItems> {
  const order = await createOrderWithItemsRepo(input, createdBy);

  recordAudit({
    userId: createdBy,
    action: "order.created",
    entityType: "order",
    entityId: order.id,
    details: {
      supplier_id: order.supplier_id,
      total: order.total,
      itemCount: order.items.length,
    },
  });

  return order;
}

export async function updateOrderStatus(
  id: number,
  status: OrderStatus,
  userId: number
): Promise<OrderRow | null> {
  const order = await updateOrderStatusRepo(id, status);

  if (order) {
    recordAudit({
      userId,
      action: "order.status_changed",
      entityType: "order",
      entityId: order.id,
      details: { status: order.status },
    });
  }

  return order;
}
