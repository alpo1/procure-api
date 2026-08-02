import { Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { parseId } from "../utils/parse-id";
import {
  findAllOrders,
  findOrderWithItems,
  createOrderWithItems,
  updateOrderStatus,
} from "../repositories/order.repository";

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
  const order = await updateOrderStatus(id, req.body.status);
  if (!order) {
    throw new AppError(404, "Order not found");
  }
  res.status(200).json(order);
}
