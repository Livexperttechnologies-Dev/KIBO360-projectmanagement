import { Request, Response, NextFunction } from "express";

const STATUS_TO_CODE: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "RATE_LIMITED",
  500: "INTERNAL_SERVER_ERROR",
};

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (process.env.NODE_ENV !== "test") {
    console.error("Unhandled Error:", err);
  }

  const status =
    ("statusCode" in err && typeof (err as any).statusCode === "number"
      ? (err as any).statusCode
      : "status" in err && typeof (err as any).status === "number"
      ? (err as any).status
      : 500);

  const rawCode = (err as any).code;
  const code =
    typeof rawCode === "string" && !rawCode.startsWith("P") // Ignore Prisma raw internal codes in production
      ? rawCode
      : STATUS_TO_CODE[status] || "INTERNAL_SERVER_ERROR";

  // Sanitize 500 internal errors in production
  const message =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "An unexpected internal server error occurred. Please try again later."
      : err.message || "Internal server error";

  const details = (err as any).details;

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
    },
  });
}
