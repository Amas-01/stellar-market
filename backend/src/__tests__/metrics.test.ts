import express, { Request, Response } from "express";
import request from "supertest";
import { requestDurationMiddleware } from "../lib/metrics";
import prometheus from "prom-client";

jest.mock("../lib/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
  installRequestIdConsolePatch: jest.fn(),
}));

describe("Metrics Middleware", () => {
  let app: express.Application;
  let register: prometheus.Registry;

  beforeEach(() => {
    // Create a new registry for each test to avoid conflicts
    register = new prometheus.Registry();

    app = express();
    app.use(express.json());
    app.use(requestDurationMiddleware);
  });

  afterEach(async () => {
    register.clear();
  });

  describe("Route Labeling", () => {
    it("should use route path for matched routes", async () => {
      app.get("/api/users/:id", (_req: Request, res: Response) => {
        res.status(200).json({ id: "123" });
      });

      await request(app).get("/api/users/123");

      const metrics = await prometheus.register.metrics();

      // Should use the route pattern, not the actual path with ID
      expect(metrics).toContain('route="/users/:id"');
      expect(metrics).not.toContain('route="/api/users/123"');
    });

    it("should use 'unmatched' label for 404 routes", async () => {
      app.get("/api/existing", (_req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      // Request a path that doesn't exist
      await request(app).get("/api/nonexistent-route-12345");

      const metrics = await prometheus.register.metrics();

      // Should use fixed 'unmatched' label, not the actual path
      expect(metrics).toContain('route="unmatched"');
      expect(metrics).not.toContain('route="/api/nonexistent-route-12345"');
    });

    it("should not create unbounded time series for scanning traffic", async () => {
      const scannedPaths = [
        "/wp-admin/login.php",
        "/phpmyadmin/index.php",
        "/.env",
        "/admin/config.php",
        "/../../etc/passwd",
        "/api/v1/../../../../etc/shadow",
        "/random-path-" + Math.random(),
        "/probe-" + Date.now(),
      ];

      // Simulate scanning traffic
      for (const path of scannedPaths) {
        await request(app).get(path);
      }

      const metrics = await prometheus.register.metrics();

      // All unmatched routes should share the same 'unmatched' label
      const unmatchedCount = (metrics.match(/route="unmatched"/g) || []).length;
      expect(unmatchedCount).toBeGreaterThan(0);

      // Should NOT contain any of the actual scanned paths
      for (const path of scannedPaths) {
        expect(metrics).not.toContain(`route="${path}"`);
      }
    });

    it("should preserve matched route metrics", async () => {
      app.get("/api/products/:id", (_req: Request, res: Response) => {
        res.status(200).json({ id: "product-1" });
      });

      app.post("/api/orders", (_req: Request, res: Response) => {
        res.status(201).json({ orderId: "order-123" });
      });

      // Make requests to matched routes
      await request(app).get("/api/products/123");
      await request(app).post("/api/orders");

      const metrics = await prometheus.register.metrics();

      // Should have distinct labels for each matched route
      expect(metrics).toContain('route="/products/:id"');
      expect(metrics).toContain('route="/orders"');
    });

    it("should handle multiple 404s efficiently", async () => {
      // Create many different 404 requests
      const promises = Array.from({ length: 100 }, (_, i) =>
        request(app).get(`/nonexistent-path-${i}`)
      );

      await Promise.all(promises);

      const metrics = await prometheus.register.metrics();

      // All 404s should be aggregated under 'unmatched'
      expect(metrics).toContain('route="unmatched"');

      // Should not contain any of the individual paths
      for (let i = 0; i < 100; i++) {
        expect(metrics).not.toContain(`route="/nonexistent-path-${i}"`);
      }
    });
  });

  describe("Status Code Recording", () => {
    it("should record status code for matched routes", async () => {
      app.get("/api/test", (_req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      await request(app).get("/api/test");

      const metrics = await prometheus.register.metrics();
      expect(metrics).toContain('status_code="200"');
    });

    it("should record status code for unmatched routes", async () => {
      await request(app).get("/this-does-not-exist");

      const metrics = await prometheus.register.metrics();
      expect(metrics).toContain('status_code="404"');
      expect(metrics).toContain('route="unmatched"');
    });

    it("should record different status codes correctly", async () => {
      app.get("/api/success", (_req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      app.get("/api/created", (_req: Request, res: Response) => {
        res.status(201).json({ created: true });
      });

      app.get("/api/bad-request", (_req: Request, res: Response) => {
        res.status(400).json({ error: "Bad request" });
      });

      await request(app).get("/api/success");
      await request(app).get("/api/created");
      await request(app).get("/api/bad-request");

      const metrics = await prometheus.register.metrics();
      expect(metrics).toContain('status_code="200"');
      expect(metrics).toContain('status_code="201"');
      expect(metrics).toContain('status_code="400"');
    });
  });

  describe("Health and Metrics Paths", () => {
    it("should skip /health path", async () => {
      app.get("/health", (_req: Request, res: Response) => {
        res.status(200).json({ status: "ok" });
      });

      await request(app).get("/health");

      const metrics = await prometheus.register.metrics();

      // Should not record metrics for /health
      expect(metrics).not.toContain('route="/health"');
    });

    it("should skip /metrics path", async () => {
      app.get("/metrics", (_req: Request, res: Response) => {
        res.status(200).send("metrics");
      });

      await request(app).get("/metrics");

      const metrics = await prometheus.register.metrics();

      // Should not record metrics for /metrics
      expect(metrics).not.toContain('route="/metrics"');
    });
  });

  describe("Method Recording", () => {
    it("should record different HTTP methods", async () => {
      app.get("/api/resource", (_req: Request, res: Response) => {
        res.status(200).json({ method: "GET" });
      });

      app.post("/api/resource", (_req: Request, res: Response) => {
        res.status(201).json({ method: "POST" });
      });

      app.delete("/api/resource", (_req: Request, res: Response) => {
        res.status(204).send();
      });

      await request(app).get("/api/resource");
      await request(app).post("/api/resource");
      await request(app).delete("/api/resource");

      const metrics = await prometheus.register.metrics();
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('method="DELETE"');
    });
  });
});
