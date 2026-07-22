import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.flatten() });
    return;
  }

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { statusCode: err.statusCode, details: err.details });
    }
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error("Unhandled error", { message, stack: err instanceof Error ? err.stack : undefined });
  res.status(500).json({ error: "Internal server error" });
}
