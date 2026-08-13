const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
require("dotenv").config();
const connectDB = require("./src/config/database");

// Route imports
const authRoutes = require("./src/routes/authRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const { apiLimiter } = require("./src/middleware/rateLimiter");

const app = express();

// Connect to database
connectDB();

// Security Middleware
app.use(helmet()); // Set security HTTP headers
app.use(mongoSanitize()); // Sanitize data against NoSQL query injection

// CORS configuration — cookies need an explicit origin, not *
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "https://crossval-assignment-ukee.vercel.app",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: "10mb" })); // Limit body size to prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Global rate limiting for all API routes
app.use("/api", apiLimiter);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the Orders & Settlements API",
    health: "/api/health",
    app: "https://crossval-assignment-ukee.vercel.app",
  });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Orders & Settlements API is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

// Only start server if not in Vercel (serverless) environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

// Export for Vercel serverless functions
module.exports = app;