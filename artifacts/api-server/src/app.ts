import express, { type Express } from "express";
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

export default app;
