const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const protect = require ("./middleware/authMiddleware")
const authRoutes = require("./routes/authRoutes");
const User = require("./models/User");
const projectRoutes = require("./routes/projectRoutes");

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes)
app.use("/api/projects", projectRoutes);



app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Devora API 🚀",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Devora server running on port ${PORT}`);
});

app.get("/api/auth/me", protect, async (req, res)=>{
  try{
    const User = require("./models/User")


    const user = await User.findById(req.userId).select("-password")

    if(!user){
      return res.status(404).json({
        message: "User not found"
      })
    }
    res.status(200).json({
      message: "Authenticated succesfully",
      user,
    })
  }catch(error){
    res.status(500).json({
      meassage: "Server Error"
    })
  }
})
