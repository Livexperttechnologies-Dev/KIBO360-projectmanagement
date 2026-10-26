import app from "./app";
import { env } from "./config/env";
import { schedulerService } from "./services/scheduler.service";

const server = app.listen(env.PORT, () => {
  console.log(`🚀 KIBO360 Hub API server listening on http://localhost:${env.PORT}`);
  console.log(`📡 Health Check endpoint available at http://localhost:${env.PORT}/api/v1/health`);
  console.log(`🏢 Organization: Livexpert Technologies Pvt. Ltd.`);
  console.log(`⚙️  Environment: ${env.NODE_ENV}`);

  // Start background scheduler
  schedulerService.start();
  console.log(`⏰ Background Scheduler & Job Queue Service active`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

export default server;
