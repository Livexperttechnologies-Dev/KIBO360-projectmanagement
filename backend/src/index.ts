import app from "./app";
import { env } from "./config/env";
import { schedulerService } from "./services/scheduler.service";
import { closePersistence, initializePersistence, persistStore } from "./lib/persistence";

let server: ReturnType<typeof app.listen> | undefined;

async function startServer() {
  await initializePersistence();
  server = app.listen(env.PORT, () => {
    console.log(`🚀 KIBO360 Hub API server listening on http://localhost:${env.PORT}`);
    console.log(`📡 Health Check endpoint available at http://localhost:${env.PORT}/api/v1/health`);
    console.log(`🏢 Organization: Livexpert Technologies Pvt. Ltd.`);
    console.log(`⚙️  Environment: ${env.NODE_ENV}`);

    schedulerService.start();
    console.log(`⏰ Background Scheduler & Job Queue Service active`);
  });
}

async function shutdown(exitCode = 0) {
  schedulerService.stop();
  if (!server) {
    await closePersistence();
    process.exit(exitCode);
    return;
  }

  server.close(() => {
    void persistStore()
      .then(() => closePersistence())
      .then(() => process.exit(exitCode))
      .catch((error) => {
        console.error("Error while saving data during shutdown:", error);
        process.exit(1);
      });
  });
}

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  void shutdown(1);
});

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));

startServer().catch((error) => {
  console.error("Unable to start backend with PostgreSQL persistence:", error);
  console.error("Check backend/.env and run npx prisma db push if the database schema is missing.");
  process.exit(1);
});
