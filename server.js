require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const authRoutes = require("./routes/authRoutes");
const petRoutes = require("./routes/petRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/pet', petRoutes);
app.use('/upload', uploadRoutes)
// health check (tuỳ chọn)
app.get("/", (req, res) => res.json({ message: "API running" }));

// error handler (tuỳ chọn)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "server error", error: err.message });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("Connection error:", err));
