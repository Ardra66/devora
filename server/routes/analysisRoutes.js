
const express = require("express");
const mongoose = require("mongoose");
const protect = require("../middleware/authMiddleware");
const Codebase = require("../models/Codebase");
const SourceFile = require("../models/SourceFile");

const router = express.Router();

// Analyze a selected source file
router.post("/:codebaseId/:fileId", protect, async (req, res) => {
  try {
    const { codebaseId, fileId } = req.params;

    if (
      !mongoose.isValidObjectId(codebaseId) ||
      !mongoose.isValidObjectId(fileId)
    ) {
      return res.status(400).json({
        message: "Invalid codebase or file ID.",
      });
    }

    const codebase = await Codebase.findOne({
      _id: codebaseId,
      owner: req.userId,
    });

    if (!codebase) {
      return res.status(404).json({
        message: "Codebase not found.",
      });
    }

    const file = await SourceFile.findOne({
      _id: fileId,
      codebase: codebase._id,
      owner: req.userId,
    }).select("path extension content");

    if (!file) {
      return res.status(404).json({
        message: "Source file not found.",
      });
    }

    // Temporary analysis until an AI model is connected
    const lines = file.content.split("\n");

    return res.status(200).json({
      message: "Basic code analysis completed.",
      analysis: {
        fileName: file.path,
        language: file.extension,
        totalLines: lines.length,
        totalCharacters: file.content.length,
        emptyLines: lines.filter((line) => !line.trim()).length,
        note: "This is basic code analysis, not AI-generated analysis yet.",
      },
    });
  } catch (error) {
    console.error("Code analysis error:", error);

    return res.status(500).json({
      message: "Failed to analyze source code.",
    });
  }
});

module.exports = router;

