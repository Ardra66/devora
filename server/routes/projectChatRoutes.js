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

// ==========================================
// GEMINI RETRY HANDLER
// ==========================================

const generateWithRetry = async (model, maxAttempts, prompt) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`DEVORA GEMINI MODEL: ${model}`);

      return await ai.models.generateContent({
        model,
        contents: prompt,
      });

    } catch (error) {
      if (error.status !== 503 || attempt === maxAttempts) {
        throw error;
      }

      console.warn(
        `${model} unavailable. Retry ${attempt}/${maxAttempts}`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * attempt)
      );
    }
  }
};

// ==========================================
// PROJECT CHAT ROUTE
// ==========================================

router.post("/:codebaseId", protect, async (req, res) => {
  try {
    const { question } = req.body;
    const { codebaseId } = req.params;

    // ==========================================
    // 1. VALIDATION
    // ==========================================

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

    // ==========================================
    // 2. FIND CODEBASE
    // ==========================================

    const codebase = await Codebase.findOne({
      _id: codebaseId,
      owner: req.userId,
    });

    if (!codebase) {
      return res.status(404).json({
        message: "Codebase not found.",
      });
    }

    // ==========================================
    // 3. RETRIEVE SOURCE FILES
    // ==========================================

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

    // ==========================================
    // 4. IDENTIFY QUESTION TYPES
    // ==========================================

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

    // ==========================================
    // 5. PROJECT FILE INVENTORY
    // ==========================================

    const fileInventory = files
      .map((file) => file.path)
      .join("\n");

    // ==========================================
    // 6. DETECT ALL REQUESTED FILES
    // ==========================================

    const requestedFiles = files.filter((file) => {
      const filePath = file.path.toLowerCase();

      const fileName = filePath.split("/").pop();

      const escapedFileName = fileName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      return (
        questionLower.includes(filePath) ||
        new RegExp(`\\b${escapedFileName}\\b`, "i").test(
          questionLower
        )
      );
    });

    console.log(
      "DEVORA REQUESTED FILES:",
      requestedFiles.map((file) => file.path)
    );

    let context = "";
    let topMatches = [];

    // ==========================================
    // 7. EXACT FILE RETRIEVAL
    // ==========================================

    if (requestedFiles.length > 0) {
      const MAX_TOTAL_CHARS = 60000;
      const MAX_FILE_CHARS = 20000;

      let totalChars = 0;

      for (const file of requestedFiles) {
        const sourceLines = file.content.split(/\r?\n/);

        const numberedLines = sourceLines.map(
          (line, index) => `${index + 1}: ${line}`
        );

        const fullSource = numberedLines.join("\n");

        const remainingChars = MAX_TOTAL_CHARS - totalChars;

        if (remainingChars <= 0) break;

        const fileContent = fullSource.slice(
          0,
          Math.min(MAX_FILE_CHARS, remainingChars)
        );

        context +=
          `\n\n========== FILE: ${file.path} ==========\n` +
          fileContent;

        totalChars += fileContent.length;

        if (fullSource.length > fileContent.length) {
          context +=
            "\n[File content truncated due to context limit.]";
        }

        // Add preview lines for each requested file

        sourceLines.slice(0, 10).forEach((line, index) => {
          topMatches.push({
            fileName: file.path,
            extension: file.extension,
            lineNumber: index + 1,
            code: line,
            matchedWords: ["requested file"],
            score: 1,
          });
        });
      }
    }

    // ==========================================
    // 8. PROJECT STRUCTURE RETRIEVAL
    // ==========================================

   // ==========================================
// 8. PROJECT STRUCTURE + SOURCE CODE RETRIEVAL
// ==========================================

else if (isStructureQuestion) {

  const MAX_TOTAL_CHARS = 60000;
  const MAX_FILE_CHARS = 8000;

  let totalChars = 0;

  context = "PROJECT FILE STRUCTURE:\n";

  context += fileInventory;

  context += "\n\n========== ACTUAL SOURCE CODE ==========\n";

  for (const file of files) {

    if (!file.content) continue;

    if (totalChars >= MAX_TOTAL_CHARS) break;

    const sourceLines = file.content.split(/\r?\n/);

    const numberedLines = sourceLines.map(
      (line, index) => `${index + 1}: ${line}`
    );

    const fullSource = numberedLines.join("\n");

    const remainingChars = MAX_TOTAL_CHARS - totalChars;

    const fileContent = fullSource.slice(
      0,
      Math.min(MAX_FILE_CHARS, remainingChars)
    );

    context +=
      `\n\n========== FILE: ${file.path} ==========\n` +
      fileContent;

    totalChars += fileContent.length;

    if (fullSource.length > fileContent.length) {
      context += "\n[File content truncated.]";
    }
  }

  console.log(
    "DEVORA STRUCTURE FILES:",
    files.map(file => file.path)
  );

  console.log(
    "DEVORA STRUCTURE SOURCE CODE LENGTH:",
    totalChars
  );
}
    // ==========================================
    // 9. KEYWORD-BASED CODE RETRIEVAL
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
          }

          else if (isBodyQuestion) {
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
          }

          else if (matchedWords.length === 0) {
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

      // Sort by relevance

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
    // 10. GEMINI AI PROMPT
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
- When multiple files are supplied, analyse every supplied file.
- Explain how data, props, functions, and state move between those files.
- Support explanations with actual code from each relevant file.
- Never assume a component interaction without checking the supplied source code.
- If a mentioned file was not retrieved, clearly say that its source code is unavailable.
- You MUST inspect the actual source code of every supplied file before answering.
- Never describe a component's behaviour based only on React conventions or assumptions.
- When explaining data flow, trace the actual props, state variables, functions and event handlers across the supplied files.
- Explain each connection in the order it happens in the application.
- Include actual code snippets copied from the supplied source code.
- Mention the exact file path and line numbers for every important explanation.
- If a behaviour cannot be verified from the supplied source code, explicitly say that it cannot be confirmed.
- Never invent calculations, conditions, grades, functions or component properties.
- Do not repeat the same explanation unnecessarily.

`;

    // ==========================================
    // 11. DEBUG SOURCE CODE CONTEXT
    // ==========================================

    console.log("DEVORA CONTEXT FILES:");

    console.log(
      context.match(/========== FILE: .*? ==========/g)
    );

    console.log("DEVORA CONTEXT LENGTH:", context.length);

    // ==========================================
    // 12. GEMINI PRIMARY MODEL + FALLBACK
    // ==========================================

    let response;

    try {
      // Try primary model: Gemini 3.6 Flash

      response = await generateWithRetry(
        "gemini-3.6-flash",
        3,
        prompt
      );

    } catch (error) {
      if (error.status !== 503) {
        throw error;
      }

      console.warn(
        "Primary Gemini model unavailable. Trying fallback model."
      );

      // Try fallback model: Gemini 3.8 Flash

      response = await generateWithRetry(
        "gemini-3.8-flash",
        2,
        prompt
      );
    }

    // ==========================================
    // 13. RETURN SUCCESSFUL ANSWER
    // ==========================================

    return res.status(200).json({
      message: "Project question answered.",
      question: cleanQuestion,
      matches: topMatches,
      answer: response.text || "No answer was returned.",
    });

  } catch (error) {
    console.error("Project chat error:", error);

    // Gemini quota exceeded

    if (error.status === 429) {
      return res.status(429).json({
        message:
          "Devora AI has reached its Gemini API daily quota. Please try again after the quota resets or check your API usage limits.",
      });
    }

    // Both Gemini models unavailable

    if (error.status === 503) {
      return res.status(503).json({
        message:
          "Devora AI is temporarily busy. Please try again in a few moments.",
      });
    }

    // Other errors

    return res.status(500).json({
      message: "Unable to answer the project question right now.",
    });
  }
});

module.exports = router;