import { app } from "./app";
import { env } from "./config/env";
import { connectMongo } from "./config/mongo";
import { pool } from "./config/postgres";

async function start(): Promise<void> {
  // Fail fast if a database is unreachable, before accepting traffic.
  await pool.query("SELECT 1");
  await connectMongo();

  app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
