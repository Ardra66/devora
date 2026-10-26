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

    const questionLower = question.toLowerCase();

    const searchTerms = new Set(
      questionLower
        .split(/[^a-z0-9_]+/)
        .filter((word) => word.length > 2)
    );

    // Add related programming terms to improve search results.
    const relatedTerms = {
      login: ["auth", "authenticate", "password", "signin", "bcrypt", "token"],
      authentication: ["auth", "login", "password", "jwt", "token"],
      validation: ["validate", "required", "schema", "check", "error"],
      database: ["mongodb", "mongoose", "connect", "connection", "query"],
      submit: ["onsubmit", "submit", "handleSubmit", "preventDefault"],
      form: ["input", "submit", "onsubmit", "handleSubmit", "validation"],
      api: ["router", "route", "endpoint", "fetch", "axios", "request"],
      structure: ["html", "head", "body", "doctype", "main"],
      navbar: ["nav", "navigation", "header", "menu"],
      styling: ["css", "class", "style", "stylesheet"],
      image: ["img", "src", "alt", "image"],
    };

    for (const [term, related] of Object.entries(relatedTerms)) {
      if (searchTerms.has(term)) {
        related.forEach((word) => searchTerms.add(word));
      }
    }

    const matches = [];

    for (const file of files) {
      const lines = file.content.split(/\r?\n/);
      const filePath = file.path.toLowerCase();

      // Give filenames a chance to match the user's question.
      const pathMatches = [...searchTerms].filter((word) =>
        filePath.includes(word)
      );

      // Score each line based on matching terms.
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();

        const matchedWords = [...searchTerms].filter((word) =>
          lineLower.includes(word)
        );

        const score =
          matchedWords.length +
          (pathMatches.length > 0 ? 2 : 0);

        if (score > 0) {
          matches.push({
            fileName: file.path,
            extension: file.extension,
            lineNumber: i + 1,
            code: line,
            matchedWords,
            score,
          });
        }
      }
    }

    // Rank the strongest matches first.
    matches.sort((a, b) => b.score - a.score);

    // Keep the response focused.
    const topMatches = matches.slice(0, 40);

    const context = topMatches.length
      ? topMatches
          .map(
            (match) =>
              `File: ${match.fileName}\nLine: ${match.lineNumber}\nCode: ${match.code}`
          )
          .join("\n\n")
      : "No relevant source-code matches were found.";

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