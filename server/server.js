import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import aiRouter from "./routes/aiRoutes.js";
import userRouter from "./routes/userRoutes.js";
import connectCloudinary from "./configs/cloudinary.js";
import serverless from "serverless-http";

const app = express();

// Connect Cloudinary
connectCloudinary().catch(err => console.error("Cloudinary connection error:", err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware()); // Clerk auth

// Test route
app.get("/", (req, res) => {
  res.send("Server is Live !!");
});

// Protected routes
app.use("/api/ai", requireAuth(), aiRouter);
app.use("/api/user", requireAuth(), userRouter);

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Export handler for Vercel serverless function
export const handler = serverless(app);
