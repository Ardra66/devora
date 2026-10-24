const express = require("express");

const {
  createProject,
  getMyProjects,
} = require("../controllers/projectController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

console.log("Project routes loaded");

router.get("/", protect, getMyProjects);
router.post("/", protect, createProject);
router.get("/", (req, res, next) => {
  console.log("GET /api/projects route reached");
  next();
}, protect, getMyProjects);

module.exports = router;