// Must be the very first import: loads backend/.env into process.env before
// any other module (like aiService.js) is evaluated.
import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import { connectDB } from "./config/db.js";
import faultRoutes from "./routes/faultRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Your frontend calls the API using the full VITE_API_URL (e.g. http://localhost:5000),
// not a dev-server proxy, so CORS must explicitly allow the frontend's origin.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json());

// Serve uploaded images statically at /uploads/<filename>
app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/faults", faultRoutes);

// Centralized error handler (also catches Multer errors like "file too large")
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Unexpected server error." });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Industrial Fault AI backend running on http://localhost:${PORT}`);
  });
});
