import { Request, Response, NextFunction } from "express";
import prometheus from "prom-client";

const register = new prometheus.Registry();

prometheus.collectDefaultMetrics({ register });

const httpRequestDuration = new prometheus.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export function requestDurationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.path === "/health" || req.path === "/metrics") {
    next();
    return;
  }

  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const route = req.route?.path
      ? req.route.path.replace(/\/api/, "")
      : "unmatched";
    end({ method: req.method, route, status_code: res.statusCode });
  });

  next();
}

export async function metricsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  res.setHeader("Content-Type", register.contentType);
  res.end(await register.metrics());
}
