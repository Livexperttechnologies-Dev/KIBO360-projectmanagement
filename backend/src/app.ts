import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { apiLimiter } from "./middleware/rateLimiter";

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        origin === env.CORS_ORIGIN ||
        origin === env.FRONTEND_URL ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Production structured request logger
app.use((req, res, next) => {
  const start = Date.now();
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "-";
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "test") {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${clientIp} - ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Root ping
app.get("/", (_req, res) => {
  res.json({
    name: "KIBO360 Project Hub API",
    organization: "Livexpert Technologies Pvt. Ltd.",
    status: "running",
    version: "2.0.0",
    healthCheck: "/api/v1/health",
  });
});

// API v1 Routes
app.use("/api/v1", apiLimiter, apiRoutes);

// 404 & Error handlers
app.use(notFound);
app.use(errorHandler);

export default app;