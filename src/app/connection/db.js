// db/connectDB.js
import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
dotenv.config();

dns.setDefaultResultOrder("ipv4first");

const connectDB = async () => {
  try {
    // Reuse existing connection (important for nodemon & serverless)
    if (mongoose.connection.readyState === 1) {
      console.log("Using existing MongoDB connection");
      return;
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // stop hanging
      socketTimeoutMS: 45000,
    });

    console.log("MongoDB Connected Successfully");
  } catch (err) {
    console.error("MongoDB Connection Failed:", err.message);
    throw err; // let app decide what to do
  }
};

export default connectDB;
