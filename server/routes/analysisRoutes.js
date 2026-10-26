
const express = require("express");
const mongoose = require("mongoose");
const protect = require("../middleware/authMiddleware");
const Codebase = require("../models/Codebase");
const SourceFile = require("../models/SourceFile");
const { analyzeCode } = require("../services/geminiService");
const router = express.Router();

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
    console.log("Starting Gemini analysis for:", file.path);
    
    const analysis = await analyzeCode(file.content, file.path);
    console.log("Gemini analysis completed:", Boolean(analysis));

    return res.status(200).json({
      message: "AI code analysis completed successfully.",
      analysis: {
        fileName: file.path,
        language: file.extension,
        result: analysis,
      },
    });
  } catch (error) {
    console.error("AI code analysis error:", error);

    return res.status(500).json({
      message: "AI code analysis failed. Please try again.",
    });
  }
});

module.exports = router;
