const express = require("express");
const mongoose = require("mongoose");

const protect = require("../middleware/authMiddleware");
const Codebase = require("../models/Codebase");
const SourceFile = require("../models/SourceFile");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

router.post("/:codebaseId", protect, async (req, res) => {
  try {
    const { question } = req.body;
    const { codebaseId } = req.params;

    if (!mongoose.isValidObjectId(codebaseId)) {
      return res.status(400).json({
        message: "Invalid codebase ID.",
      });
    }

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        message: "Please enter a question.",
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

    const files = await SourceFile.find({
      codebase: codebase._id,
      owner: req.userId,
    }).select("path extension content");

    if (!files.length) {
      return res.status(404).json({
        message: "No source files found in this project.",
      });
    }

    const questionWords = question
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((word) => word.length > 2);

    const matches = [];

    for (const file of files) {
      const lines = file.content.split(/\r?\n/);
      let matchedLines = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const matchedWords = questionWords.filter((word) =>
          line.toLowerCase().includes(word)
        );

        if (matchedWords.length > 0) {
          matches.push({
            fileName: file.path,
            extension: file.extension,
            lineNumber: i + 1,
            code: line,
            matchedWords,
          });

          matchedLines++;
        }

        if (matches.length >= 40) break;
      }

      if (matches.length >= 40) break;
    }

    const context = matches.length
      ? matches
          .map(
            (match) =>
              `File: ${match.fileName}\nLine: ${match.lineNumber}\nCode: ${match.code}`
          )
          .join("\n\n")
      : "No direct keyword matches were found in the uploaded source files.";

    const prompt = `
You are Devora AI, a programming assistant that answers questions
about a user's uploaded codebase.

User question:
${question}

Candidate source locations found by searching the uploaded files:
${context}

Rules:
- Answer the user's question clearly and simply.
- Use only the supplied source snippets as evidence.
- If a snippet is relevant, include its exact file path and line number.
- Never invent file paths or line numbers.
- Candidate matches are not proof that a line implements the requested feature.
- If the evidence is insufficient, say so honestly.
- Suggest which file the user should inspect next when appropriate.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    return res.status(200).json({
      message: "Project question answered.",
      question,
      matches,
      answer: response.text || "No answer was returned.",
    });
  } catch (error) {
    console.error("Project chat error:", error);

    return res.status(500).json({
      message: "Unable to answer the project question right now.",
    });
  }
});

module.exports = router;