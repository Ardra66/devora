
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });
const githubRoutes = require("./routes/githubRoutes");

const connectDB = require("./config/db");
const protect = require("./middleware/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const User = require("./models/User");
const projectRoutes = require("./routes/projectRoutes");
const codebaseRoutes = require("./routes/codebaseRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const projectChatRoutes = require("./routes/projectChatRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const app = express();
console.log("SERVER FILE:", __filename);
console.log("SERVER DIRECTORY:", process.cwd());

app.use(cors());
app.use(express.json());


connectDB();
app.use((req, res, next) => {
  console.log("INCOMING REQUEST:", req.method, req.originalUrl);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/codebase", codebaseRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/project-chat", projectChatRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/github", githubRoutes);

app.get("/api/auth/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Authenticated successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.get("/server-check", (req, res) => {
  console.log("SERVER-CHECK ROUTE REACHED");

  res.json({
    message: "Correct Devora server is running!",
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Devora API 🚀",
  });
});

const PORT = process.env.PORT || 5000;
console.log("ACTIVE DEVORA SERVER PID:", process.pid);

app.listen(PORT, () => {
  console.log(`Devora server running on port ${PORT}`);
});
