import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import aiRouter from "../routes/aiRoutes.js";
import connectCloudinary from "../configs/cloudinary.js";
import userRouter from "../routes/userRoutes.js";

const app = express();

connectCloudinary().catch(err => console.error("Cloudinary connection error:", err));

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.get("/", (req, res) => {
    res.send("Server is Live !!");
});

// Your protected routes
app.use("/api/ai", requireAuth(), aiRouter);
app.use("/api/user", requireAuth(), userRouter);

// Only listen locally
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Local server running on port ${PORT}`));
}

export default app;
