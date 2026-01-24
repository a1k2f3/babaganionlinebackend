import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";

import "./src/app/Config/cloudinary.js";
import connectDB from "./src/app/connection/db.js";

// Routes
import productRoutes from "./src/app/route/ProductRoute.js";
import categoryRoutes from "./src/app/route/CategoryRoute.js";
import StoreRoute from "./src/app/route/StoreRoute.js";
import tagRoutes from "./src/app/route/tagRoute.js";
import reviewRoutes from "./src/app/route/ReviewRoute.js";
import userRoute from "./src/app/route/UserRute.js";
import cartRoute from "./src/app/route/cartRoute.js";
import orderRoutes from "./src/app/route/orderRoutes.js";
import wishlistRoutes from "./src/app/route/wishlistRoutes.js";
import riderRoutes from "./src/app/route/riderRoute.js";

// Swagger
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/app/Config/swagger.js";

dotenv.config();

const app = express();

/* ------------------ Middleware ------------------ */
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const allowedOrigins = [
  "https://www.babaganionline.com",
  "https://babaganionline.vercel.app",
  "https://sellercenter-buybot.vercel.app",
  "https://buybotadmin-nine.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

/* ------------------ Routes ------------------ */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.json({
    message: "E-commerce API Running on Railway",
    uptime: process.uptime(),
  });
});

app.use("/api/categories", categoryRoutes);
app.use("/api/store", StoreRoute);
app.use("/api/tags", tagRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/users", userRoute);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoute);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/riders", riderRoutes);

/* ------------------ Error Handler ------------------ */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ------------------ Start Server ------------------ */
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 Server running on port ${PORT}`)
  );
});
