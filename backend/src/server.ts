import { app } from "./app.js";
import { assertProductionDatabaseUrl, getSafeDatabaseUrlInfo } from "./config/database-url.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { appDataSource } from "./db/pool.js";

const start = async (): Promise<void> => {
  if (env.NODE_ENV === "production") {
    assertProductionDatabaseUrl(env.DATABASE_URL);
  }

  logger.info("Connecting to database", getSafeDatabaseUrlInfo(env.DATABASE_URL));
  await appDataSource.initialize();
  logger.info("Database connection initialized and migrations applied");

  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    if (appDataSource.isInitialized) {
      await appDataSource.destroy();
      logger.info("Database connection closed");
    }

    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
};

start().catch((error: unknown) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
