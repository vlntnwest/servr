require("dotenv").config({ path: "./.env" });

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
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

const isLocalhost = (req) =>
  req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1";

const isInternalRequest = (req) =>
  process.env.INTERNAL_API_SECRET &&
  req.headers["x-internal-secret"] === process.env.INTERNAL_API_SECRET;

const skipRateLimit = (req) =>
  process.env.NODE_ENV !== "production" || isLocalhost(req) || isInternalRequest(req);

// Rate limiting configuration
// Public/unauthenticated traffic — strict limit per IP (anti-abuse)
const unauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  message: { error: "Too many requests, please try again later." },
  handler: (req, res, _next, options) => {
    logger.warn({ ip: req.ip, xff: req.headers["x-forwarded-for"], url: req.url }, "Rate limit hit (unauth)");
    res.status(options.statusCode).json(options.message);
  },
});

// Authenticated traffic — generous (admin dashboards make many parallel calls)
const authedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  message: { error: "Too many requests, please try again later." },
});

// Picks the appropriate limiter based on whether the request carries a Bearer token
const globalLimiter = (req, res, next) =>
  req.headers.authorization
    ? authedLimiter(req, res, next)
    : unauthLimiter(req, res, next);

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many payment attempts, please try again later." },
  skip: (req) => req.path === "/webhook" || skipRateLimit(req),
});

// HTTP request logging with response time (pino-http)
app.use(
  pinoHttp({
    logger,
    autoLogging: false,
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

// CORS
const corsOption = {
  origin: process.env.CLIENT_URL,
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
  app.use(`${prefix}/user`, globalLimiter, userRoutes);
  app.use(`${prefix}/restaurants`, globalLimiter, restaurantRoutes);
  app.use(`${prefix}/menu`, globalLimiter, menuRoutes);
  app.use(prefix, globalLimiter, orderRoutes);
  app.use(prefix, globalLimiter, openingHourRoutes);
  app.use(prefix, globalLimiter, statsRoutes);
  app.use(prefix, globalLimiter, uploadRoutes);
  app.use(`${prefix}/checkout`, paymentLimiter, checkoutRoutes);
  app.use(prefix, globalLimiter, promoCodeRoutes);
  app.use(prefix, globalLimiter, exceptionalHourRoutes);
}

// Platform admin routes (not versioned, auth required)
app.use("/api/admin", adminRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
