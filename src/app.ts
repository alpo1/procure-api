import express, { Request, Response, NextFunction } from "express";
import pinoHttp from "pino-http";

// The Express app is built here (routes + middleware) but NOT started.
// server.ts is responsible for connecting to the databases and listening.
// Keeping them separate lets tests import `app` without opening a port.
export const app = express();

app.use(express.json());
app.use(pinoHttp());

// Health check — lets Docker / monitoring confirm the service is alive.
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Feature routers will be mounted here as we build them:
// app.use("/auth", authRouter);
// app.use("/suppliers", suppliersRouter);
// app.use("/orders", ordersRouter);

// 404 for anything unmatched.
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler — one place that turns thrown errors into responses.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
