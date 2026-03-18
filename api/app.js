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
const memberRoutes = require("./routes/member.routes");
const statsRoutes = require("./routes/stats.routes");
const uploadRoutes = require("./routes/upload.routes");
const checkoutRoutes = require("./routes/checkout.routes");
const promoCodeRoutes = require("./routes/promoCode.routes");
const exceptionalHourRoutes = require("./routes/exceptionalHour.routes");
const swaggerUi = require("swagger-ui-express");
const openApiSpec = require("./docs/openapi.json");

const errorHandler = require("./middleware/error.middleware");
const requestId = require("./middleware/requestId.middleware");

const app = express();

const isLocalhost = (req) =>
  req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1";

// Rate limiting configuration
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocalhost,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocalhost,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many payment attempts, please try again later." },
  skip: (req) => req.path === "/webhook",
});

// Request ID (must be before other middleware)
app.use(requestId);

// Security headers
app.use(helmet());

// Webhook route FIRST - before CORS and JSON parsing to preserve raw body for signature verification
app.use("/api/checkout/webhook", express.raw({ type: "application/json" }));
app.use("/api/v1/checkout/webhook", express.raw({ type: "application/json" }));

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

// Apply global rate limiter to all routes
app.use(globalLimiter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Routes — mounted at both /api (v1 alias) and /api/v1
const V1_PREFIXES = ["/api", "/api/v1"];
for (const prefix of V1_PREFIXES) {
  app.use(`${prefix}/user`, authLimiter, userRoutes);
  app.use(`${prefix}/restaurants`, globalLimiter, restaurantRoutes);
  app.use(`${prefix}/menu`, globalLimiter, menuRoutes);
  app.use(prefix, globalLimiter, orderRoutes);
  app.use(prefix, globalLimiter, openingHourRoutes);
  app.use(prefix, globalLimiter, memberRoutes);
  app.use(prefix, globalLimiter, statsRoutes);
  app.use(prefix, globalLimiter, uploadRoutes);
  app.use(`${prefix}/checkout`, paymentLimiter, checkoutRoutes);
  app.use(prefix, globalLimiter, promoCodeRoutes);
  app.use(prefix, globalLimiter, exceptionalHourRoutes);
}

// Error handler
app.use(errorHandler);

module.exports = app;
