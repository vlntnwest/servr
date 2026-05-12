require("dotenv").config({ path: "./.env" });

const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const menuRoutes = require("./routes/menu.routes");
const userRoutes = require("./routes/user.routes");
const restaurantRoutes = require("./routes/restaurant.routes");
const orderRoutes = require("./routes/order.routes");
const openingHourRoutes = require("./routes/openingHour.routes");
const statsRoutes = require("./routes/stats.routes");
const uploadRoutes = require("./routes/upload.routes");
const checkoutRoutes = require("./routes/checkout.routes");
const promoCodeRoutes = require("./routes/promoCode.routes");
const exceptionalHourRoutes = require("./routes/exceptionalHour.routes");
const adminRoutes = require("./routes/admin.routes");
const swaggerUi = require("swagger-ui-express");
const openApiSpec = require("./docs/openapi.json");

const errorHandler = require("./middleware/error.middleware");
const requestId = require("./middleware/requestId.middleware");
const prisma = require("./lib/prisma");
const supabase = require("./lib/supabase");
const checkAuth = require("./middleware/auth.middleware");
const logger = require("./logger");
const pinoHttp = require("pino-http");

const app = express();

// Hostinger sits behind a reverse proxy/LB — trust one hop so req.ip reflects the real client IP
app.set("trust proxy", 1);

// HTTP request logging with response time (pino-http)
app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "silent";
    },
    redact: ["req.headers.authorization", "req.headers.cookie"],
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);

// Request ID (must be before other middleware)
app.use(requestId);

// Security headers
app.use(helmet());

// Webhook route FIRST - before CORS and JSON parsing to preserve raw body for signature verification
app.use(
  "/api/checkout/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
);
app.use(
  "/api/v1/checkout/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
);

// CORS — CLIENT_URL peut contenir plusieurs origines séparées par des virgules
const allowedOrigins = (process.env.CLIENT_URL ?? "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

const corsOption = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin not allowed — ${origin}`));
  },
  credentials: true,
  allowedHeaders: ["sessionId", "Content-Type", "Authorization"],
  exposedHeaders: ["sessionId"],
  methods: "GET, HEAD, PUT, PATCH, POST, DELETE",
  preflightContinue: false,
};

// Apply CORS to all routes EXCEPT webhook
app.use((req, res, next) => {
  if (req.path.endsWith("/checkout/webhook")) {
    return next();
  }
  cors(corsOption)(req, res, next);
});

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Health check — verifies Postgres and Supabase Auth connectivity
app.get("/health", async (req, res) => {
  const result = { status: "ok", db: "ok", auth: "ok" };
  let statusCode = 200;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    result.db = "error";
    result.status = "degraded";
    statusCode = 503;
  }

  try {
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  } catch {
    result.auth = "error";
    result.status = "degraded";
    statusCode = 503;
  }

  res.status(statusCode).json(result);
});

// Stripe health check — protected, OWNER-level (checks platform API key only)
app.get("/health/stripe", checkAuth, async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res
      .status(503)
      .json({ status: "error", detail: "Stripe not configured" });
  }
  try {
    const Stripe = require("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    await stripe.balance.retrieve();
    return res.status(200).json({ status: "ok" });
  } catch {
    return res
      .status(503)
      .json({ status: "error", detail: "Stripe unreachable" });
  }
});

// API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Routes — mounted at both /api (v1 alias) and /api/v1
const V1_PREFIXES = ["/api", "/api/v1"];
for (const prefix of V1_PREFIXES) {
  app.use(`${prefix}/user`, userRoutes);
  app.use(`${prefix}/restaurants`, restaurantRoutes);
  app.use(`${prefix}/menu`, menuRoutes);
  app.use(prefix, orderRoutes);
  app.use(prefix, openingHourRoutes);
  app.use(prefix, statsRoutes);
  app.use(prefix, uploadRoutes);
  app.use(`${prefix}/checkout`, checkoutRoutes);
  app.use(prefix, promoCodeRoutes);
  app.use(prefix, exceptionalHourRoutes);
}

// Platform admin routes (not versioned, auth required)
app.use("/api/admin", adminRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
