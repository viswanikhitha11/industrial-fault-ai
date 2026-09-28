import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/industrial-fault-ai";
  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected:", uri);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    console.error(
      "The server will keep running, but any endpoint that touches the database will fail until MongoDB is reachable."
    );
  }
}
