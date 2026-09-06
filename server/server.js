// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { requireAuth, requireAdmin } from "./middleware/auth.js";
import cron from "node-cron";
import { checkExpiredInstallments } from "./lib/wallet.js";

import organizerRouter from "./routes/organizer.js";
import adminRouter from "./routes/admin.js";
import usersRouter from "./routes/users.js";
import paymentsRouter from "./routes/payments.js";
import ordersRouter from "./routes/orders.js";
import contactRouter from "./routes/contact.js";
import geocodeRouter from "./routes/geocode.js";
import ticketsRouter from "./routes/tickets.js";
import refundRoutes from "./routes/refunds.js";
import analyticsRoutes from "./routes/analytics.js";
import promoCodeRoutes from "./routes/promoCodes.js";
import emailMarketingRoutes from "./routes/emailMarketing.js";
import waitlistRoutes from "./routes/waitlist.js";
import reviewRoutes from "./routes/reviews.js";
import securityRoutes from "./routes/security.js";
import walletRoutes from "./routes/wallet.js";
import payoutRoutes from "./routes/payouts.js";
import authOTPRouter from "./routes/authOTP.js";

import uploadRoutes from "./routes/upload.js";
import authRouter from "./routes/auth.js";
import eventsRouter from "./routes/events.js";

dotenv.config();

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────
const corsOptions = {
  origin: process.env.CLIENT_ORIGINS
    ? process.env.CLIENT_ORIGINS.split(',')
    : 'http://localhost:5173',
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// ─── Body parsing (with raw body for webhooks) ────────────────────
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(cookieParser());

// ─── Health check ──────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
);

// ─── Public routes ──────────────────────────────────────────────────
app.use("/api/contact", contactRouter);
app.use("/api/geocode", geocodeRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/payments", paymentsRouter);            // ✅ CHANGED: removed "/webhook"
app.use("/auth", authRouter);
app.use("/api/events", eventsRouter);

// ─── Authenticated routes ──────────────────────────────────────────
app.use("/api/orders", requireAuth, ordersRouter);
app.use("/api/wallet", requireAuth, walletRoutes);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/organizer", requireAuth, organizerRouter);
app.use("/api/refunds", requireAuth, refundRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);
app.use("/api/promos", requireAuth, promoCodeRoutes);
app.use("/api/email", requireAuth, emailMarketingRoutes);
app.use("/api/waitlist", requireAuth, waitlistRoutes);
app.use("/api/reviews", requireAuth, reviewRoutes);
app.use("/api/payouts", requireAuth, payoutRoutes);
app.use("/api/auth", authOTPRouter);
app.use("/api/uploads", requireAuth, uploadRoutes);

// ─── Admin routes ──────────────────────────────────────────────────
app.use("/api/admin", requireAuth, requireAdmin, adminRouter);
app.use("/api/security", requireAuth, requireAdmin, securityRoutes);

// ─── Serve static files (uploaded images) ──────────────────────────
app.use("/uploads", express.static("uploads"));

// ─── Scheduled task: check expired installments ────────────────────
cron.schedule("0 * * * *", async () => {
  console.log("⏰ Running scheduled task: checkExpiredInstallments");
  try {
    await checkExpiredInstallments();
  } catch (error) {
    console.error("❌ Failed to check expired installments:", error);
  }
});

// ─── Error handling middleware ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── 404 handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ─── Start server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Sahm TicketHub API listening on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Client origins: ${process.env.CLIENT_ORIGINS || "http://localhost:5173"}`);
});