import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectDatabase } from "./config/database";
import { initRealtime } from "./sockets/realtime";

async function main() {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Cymor Messaging API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  initRealtime(server);

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Fatal startup error", { error: err instanceof Error ? err.message : err });
  process.exit(1);
});
