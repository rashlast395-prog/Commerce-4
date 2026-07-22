import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { initFirebaseAdmin } from "./config/firebase.js";
import { logger } from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.js";
import { analyticsRouter } from "./routes/analytics.js";
import { conversationsRouter } from "./routes/conversations.js";
import { healthRouter } from "./routes/health.js";
import { notificationsRouter } from "./routes/notifications.js";
import { ordersRouter } from "./routes/orders.js";
import { paymentsRouter } from "./routes/payments.js";
import { reservationsRouter } from "./routes/reservations.js";
import { restaurantsRouter } from "./routes/restaurants.js";
import { reviewsRouter } from "./routes/reviews.js";
import { ridersRouter } from "./routes/riders.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { createWebSocketServer } from "./ws/server.js";

initFirebaseAdmin();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  }),
);
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Webhooks need the raw request body for signature verification, so they're
// mounted BEFORE the global express.json() parser — mounting order matters
// here, not just route matching.
app.use("/webhooks", webhooksRouter);

app.use(express.json());

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/restaurants", restaurantsRouter);
app.use("/orders", ordersRouter);
app.use("/riders", ridersRouter);
app.use("/payments", paymentsRouter);
app.use("/notifications", notificationsRouter);
app.use("/conversations", conversationsRouter);
app.use("/reservations", reservationsRouter);
app.use("/reviews", reviewsRouter);
app.use("/analytics", analyticsRouter);

// Inventory tracking wasn't prioritized — see docs/ASSUMPTIONS.md

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
const server = http.createServer(app);
createWebSocketServer(server);

server.listen(port, () => {
  logger.info(`Backend listening on port ${port}`, { port });
});
