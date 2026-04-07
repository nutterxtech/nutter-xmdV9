import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { join } from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  origin: "*",
  methods: "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization,x-admin-token",
  credentials: false,
}));
// Explicitly handle OPTIONS preflight for all routes (pass RegExp — Express v5 + path-to-regexp v8
// no longer accept bare wildcards or unnamed capture groups in strings)
app.options(/(.*)/, cors({
  origin: "*",
  methods: "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization,x-admin-token",
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(join(process.cwd(), "public")));

app.use("/api", router);

// Global error handler — ensures every unhandled error returns JSON, never an empty body
// Must have 4 parameters for Express to recognise it as an error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled route error");
  const status = (err as { status?: number; statusCode?: number }).status
    ?? (err as { status?: number; statusCode?: number }).statusCode
    ?? 500;

  // Sanitise DB / internal errors — never leak SQL or stack traces to the client
  const isDrizzleError = err.message?.startsWith("Failed query:");
  const isInternalError = status >= 500 || isDrizzleError;
  const message = isInternalError
    ? "Service temporarily unavailable. Please try again."
    : (err.message || "Internal server error");

  res.status(isInternalError ? 503 : status).json({ error: message });
});

export default app;
