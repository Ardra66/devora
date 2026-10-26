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

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        message: "Please enter a question.",
      });
    }

    const cleanQuestion = question.trim();
    const questionLower = cleanQuestion.toLowerCase();

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
    })
      .select("path extension content")
      .sort({ path: 1 });

    if (!files.length) {
      return res.status(404).json({
        message: "No source files found in this project.",
      });
    }

    const isTitleQuestion =
      /\b(title|browser tab|tab title|document title)\b/i.test(
        cleanQuestion
      );

    const isBodyQuestion =
      /\b(body|visible content|displayed on the webpage)\b/i.test(
        cleanQuestion
      );

    const isStructureQuestion =
      /\b(structure|architecture|folder structure|file structure|project layout|directory structure)\b/i.test(
        cleanQuestion
      );

    const fileInventory = files
      .map((file) => file.path)
      .join("\n");

    let context = "";
    let topMatches = [];

    if (isStructureQuestion) {
      const MAX_CONTEXT_CHARS = 60000;
      let usedChars = 0;

      for (const file of files) {
        const header = `\n\nFILE: ${file.path}\n`;
        const availableChars =
          MAX_CONTEXT_CHARS - usedChars - header.length;

        if (availableChars <= 0) {
          break;
        }

        const content = file.content.slice(0, availableChars);
        const fileContext = header + content;

        context += fileContext;
        usedChars += fileContext.length;

        const lines = file.content.split(/\r?\n/);
        const maxLinesPerFile = 2;

        for (
          let i = 0;
          i < lines.length && i < maxLinesPerFile;
          i++
        ) {
          if (!lines[i].trim()) continue;

          topMatches.push({
            fileName: file.path,
            extension: file.extension,
            lineNumber: i + 1,
            code: lines[i],
            matchedWords: ["project structure"],
            score: 1,
          });
        }
      }
    } else {
      const searchTerms = new Set(
        questionLower
          .split(/[^a-z0-9_]+/)
          .filter((word) => word.length > 2)
      );

      const relatedTerms = {
        login: [
          "auth",
          "authenticate",
          "password",
          "signin",
          "bcrypt",
          "token",
        ],
        authentication: [
          "auth",
          "login",
          "password",
          "jwt",
          "token",
        ],
        validation: [
          "validate",
          "required",
          "schema",
          "check",
          "error",
        ],
        database: [
          "mongodb",
          "mongoose",
          "connect",
          "connection",
          "query",
        ],
        submit: [
          "onsubmit",
          "submit",
          "handlesubmit",
          "preventdefault",
        ],
        form: [
          "input",
          "submit",
          "onsubmit",
          "handlesubmit",
          "validation",
        ],
        api: [
          "router",
          "route",
          "endpoint",
          "fetch",
          "axios",
          "request",
        ],
        navbar: [
          "nav",
          "navigation",
          "header",
          "menu",
        ],
        styling: [
          "css",
          "class",
          "style",
          "stylesheet",
        ],
        image: [
          "img",
          "src",
          "alt",
          "image",
        ],
      };

      for (const [term, related] of Object.entries(relatedTerms)) {
        if (searchTerms.has(term)) {
          related.forEach((word) => searchTerms.add(word));
        }
      }

      const matches = [];

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
            } else if (
              /<(h1|h2|h3|p|img|main|section|div)\b/i.test(line)
            ) {
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

      matches.sort((a, b) => b.score - a.score);

      const seenLocations = new Set();

      const uniqueMatches = matches.filter((match) => {
        const key = `${match.fileName}:${match.lineNumber}`;

        if (seenLocations.has(key)) {
          return false;
        }

        seenLocations.add(key);
        return true;
      });

      const limit = isTitleQuestion ? 1 : isBodyQuestion ? 5 : 5;

      topMatches = uniqueMatches.slice(0, limit);

      context = topMatches.length
        ? topMatches
            .map(
              (match) =>
                `File: ${match.fileName}\nLine: ${match.lineNumber}\nCode: ${match.code}`
            )
            .join("\n\n")
        : "No relevant source-code matches were found.";
    }

    const prompt = `
You are Devora AI, a programming assistant that explains uploaded projects.

PROJECT NAME:
${codebase.name}

PROJECT FILE INVENTORY:
${fileInventory}

USER QUESTION:
${cleanQuestion}

SOURCE CODE CONTEXT:
${context}

RULES:
- Answer clearly and simply.
- Use the supplied project inventory and source code as evidence.
- For project-structure questions, explain the actual files and folders.
- Explain each important file's likely responsibility using its supplied content.
- Distinguish confirmed facts from reasonable inferences.
- Do not invent file paths, folders, technologies, or features.
- If the supplied content is insufficient to determine a file's responsibility, say so.
- Do not claim to have inspected files whose contents were not supplied.
- For specific code questions, include exact file paths and line numbers when available.
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

  if (error.status === 429) {
    return res.status(429).json({
      message:
        "Devora AI has reached its Gemini API daily quota. Please try again after the quota resets or check your API usage limits.",
    });
  }

  return res.status(500).json({
    message: "Unable to answer the project question right now.",
  });
}


});

module.exports = router;

