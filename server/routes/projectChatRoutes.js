
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

    // Validate the codebase ID.
    if (!mongoose.isValidObjectId(codebaseId)) {
      return res.status(400).json({
        message: "Invalid codebase ID.",
      });
    }

    // Validate the question.
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        message: "Please enter a question.",
      });
    }

    const cleanQuestion = question.trim();
    const questionLower = cleanQuestion.toLowerCase();

    // Find the codebase belonging to the authenticated user.
    const codebase = await Codebase.findOne({
      _id: codebaseId,
      owner: req.userId,
    });

    if (!codebase) {
      return res.status(404).json({
        message: "Codebase not found.",
      });
    }

    // Load source files belonging to this codebase and user.
    const files = await SourceFile.find({
      codebase: codebase._id,
      owner: req.userId,
    }).select("path extension content");

    if (!files.length) {
      return res.status(404).json({
        message: "No source files found in this project.",
      });
    }

    // Identify the type of question.
    const isTitleQuestion =
      /\b(title|browser tab|tab title|document title)\b/i.test(
        cleanQuestion
      );

    const isBodyQuestion =
      /\b(body|visible content|displayed on the webpage)\b/i.test(
        cleanQuestion
      );

    const isStructureQuestion =
      /\b(html page structure|document structure|page structure)\b/i.test(
        cleanQuestion
      );

    // Add related terms to improve general code search.
    const searchTerms = new Set(
      questionLower
        .split(/[^a-z0-9_]+/)
        .filter((word) => word.length > 2)
    );

    const relatedTerms = {
      login: ["auth", "authenticate", "password", "signin", "bcrypt", "token"],
      authentication: ["auth", "login", "password", "jwt", "token"],
      validation: ["validate", "required", "schema", "check", "error"],
      database: ["mongodb", "mongoose", "connect", "connection", "query"],
      submit: ["onsubmit", "submit", "handlesubmit", "preventdefault"],
      form: ["input", "submit", "onsubmit", "handlesubmit", "validation"],
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

    // Search source lines and score their relevance.
    for (const file of files) {
      const lines = file.content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase().trim();

        if (!lineLower) continue;

        let score = 0;

        const matchedWords = [...searchTerms].filter((word) =>
          lineLower.includes(word)
        );

        score += matchedWords.length;

        // Prioritize exact HTML elements for specific questions.
        if (isTitleQuestion) {
          if (/<title\b[^>]*>/i.test(line)) {
            score += 20;
          } else if (/<\/title\s*>/i.test(line)) {
            score += 15;
          } else {
            continue;
          }
        } else if (isBodyQuestion) {
          if (/<body\b[^>]*>/i.test(line)) {
            score += 20;
          } else if (/<\/body\s*>/i.test(line)) {
            score += 15;
          } else if (/<(?:h1|h2|h3|p|img|main|section|div)\b/i.test(line)) {
            score += 10;
          } else {
            continue;
          }
        } else if (isStructureQuestion) {
          if (/<!doctype\b/i.test(line)) {
            score += 15;
          } else if (/<html\b/i.test(line)) {
            score += 15;
          } else if (/<head\b|<\/head\s*>|<body\b|<\/body\s*>/i.test(line)) {
            score += 10;
          } else {
            continue;
          }
        } else if (matchedWords.length === 0) {
          continue;
        }

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

    // Rank the most relevant lines first.
    matches.sort((a, b) => b.score - a.score);

    // Remove duplicate file-and-line combinations.
    const seenLocations = new Set();

    const uniqueMatches = matches.filter((match) => {
      const key = `${match.fileName}:${match.lineNumber}`;

      if (seenLocations.has(key)) {
        return false;
      }

      seenLocations.add(key);
      return true;
    });

    // Show fewer results for specific questions.
    const limit = isTitleQuestion ? 1 : isBodyQuestion ? 5 : 5;

    const topMatches = uniqueMatches.slice(0, limit);

    // Give Gemini only the selected source snippets.
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
${cleanQuestion}

Relevant source locations:
${context}

Rules:
- Answer the user's question clearly and simply.
- Use only the supplied source snippets as evidence.
- Include exact file paths and line numbers when supported.
- Never invent file paths, line numbers, or code.
- Explain why the selected code is relevant.
- If the evidence is insufficient, say so honestly.
- Do not claim that a line contains information that was not supplied.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    return res.status(200).json({
      message: "Project question answered.",
      question: cleanQuestion,
      matches: topMatches,
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
