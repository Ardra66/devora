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

    // Validate codebase ID
    if (!mongoose.isValidObjectId(codebaseId)) {
      return res.status(400).json({
        message: "Invalid codebase ID.",
      });
    }

    // Validate question
    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        message: "Please enter a question.",
      });
    }

    const cleanQuestion = question.trim();
    const questionLower = cleanQuestion.toLowerCase();

    // Find codebase belonging to authenticated user
    const codebase = await Codebase.findOne({
      _id: codebaseId,
      owner: req.userId,
    });

    if (!codebase) {
      return res.status(404).json({
        message: "Codebase not found.",
      });
    }

    // Retrieve uploaded source files
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

    // Identify question types
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

    // Create project file inventory
    const fileInventory = files
      .map((file) => file.path)
      .join("\n");

    // Detect whether the user mentioned a specific source file
    const requestedFileMatch = cleanQuestion.match(
      /(?:[\w.-]+\/)*[\w.-]+\.(?:jsx?|tsx?|html|css|json|md|py|java|php|sql)\b/i
    );

    const requestedFile = requestedFileMatch
      ? files.find((file) =>
          file.path.toLowerCase().endsWith(
            requestedFileMatch[0].toLowerCase()
          )
        )
      : null;

    let context = "";
    let topMatches = [];

    // ==========================================
    // 1. EXACT FILE RETRIEVAL
    // ==========================================

    if (requestedFile) {
      const MAX_FILE_CHARS = 30000;

      const sourceLines = requestedFile.content.split(/\r?\n/);

      // Add line numbers to actual source code
      const numberedLines = sourceLines.map(
        (line, index) => `${index + 1}: ${line}`
      );

      const fullSource = numberedLines.join("\n");

      context =
        `FILE: ${requestedFile.path}\n` +
        fullSource.slice(0, MAX_FILE_CHARS);

      if (fullSource.length > MAX_FILE_CHARS) {
        context +=
          "\n\n[File truncated because it exceeded the context limit.]";
      }

      topMatches = sourceLines.slice(0, 10).map((line, index) => ({
        fileName: requestedFile.path,
        extension: requestedFile.extension,
        lineNumber: index + 1,
        code: line,
        matchedWords: ["requested file"],
        score: 1,
      }));
    }

    // ==========================================
    // 2. PROJECT STRUCTURE RETRIEVAL
    // ==========================================

    else if (isStructureQuestion) {
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

        for (let i = 0; i < lines.length && i < 2; i++) {
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
    }

    // ==========================================
    // 3. KEYWORD-BASED CODE RETRIEVAL
    // ==========================================

    else {
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

      // Expand search terms
      for (const [term, related] of Object.entries(relatedTerms)) {
        if (searchTerms.has(term)) {
          related.forEach((word) => searchTerms.add(word));
        }
      }

      const matches = [];

      // Search source code line by line
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

      // Sort matches by relevance
      matches.sort((a, b) => b.score - a.score);

      // Remove duplicate locations
      const seenLocations = new Set();

      const uniqueMatches = matches.filter((match) => {
        const key = `${match.fileName}:${match.lineNumber}`;

        if (seenLocations.has(key)) {
          return false;
        }

        seenLocations.add(key);
        return true;
      });

      const limit = isTitleQuestion ? 1 : 5;

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

    // ==========================================
    // 4. GEMINI AI PROMPT
    // ==========================================

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
- For specific file questions, analyse the supplied file's actual source code.
- Identify real functions, variables, imports, components and their interactions.
- Do not invent functions, variables, file paths, technologies or features.
- Distinguish confirmed facts from reasonable inferences.
- If the supplied content is insufficient, clearly say so.
- Do not claim to have inspected files whose contents were not supplied.
- Include exact file paths and line numbers when available.
- If a file is truncated, do not claim to have analysed its complete contents.
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