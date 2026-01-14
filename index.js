import express from "express";
import"./src/app/Config/cloudinary.js"; 
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./src/app/connection/db.js"; // import connection
import productRoutes from "./src/app/route/ProductRoute.js";
import categoryRoutes from "./src/app/route/CategoryRoute.js";
import StoreRoute from "./src/app/route/StoreRoute.js";
import tagRoutes from "./src/app/route/tagRoute.js";
import reviewRoutes from "./src/app/route/ReviewRoute.js";
import userRoute from "./src/app/route/UserRute.js";
import cartRoute from "./src/app/route/cartRoute.js";
import orderRoutes from "./src/app/route/orderRoutes.js";
import riderRoutes from "./src/app/route/ReviewRoute.js";
import wishlistRoutes from "./src/app/route/wishlistRoutes.js"


import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/app/Config/swagger.js";

import cors from "cors";
dotenv.config();
const app = express();
const allowedOrigins = ["https://www.babaganionline.com", "https://babaganionline.vercel.app", "http://localhost:3000","http://localhost:3001","https://sellercenter-buybot.vercel.app","http://localhost:3002","https://buybotadmin-nine.vercel.app"];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

connectDB();
app.use(express.json({ limit: "100mb" }));

// CORS
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.get("/", (req, res) => {
  res.json({ message: "E-commerce API Running on railway", uptime: process.uptime() });
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

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
