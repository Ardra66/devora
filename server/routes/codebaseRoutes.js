const express = require("express");
const multer = require("multer");
const yauzl = require("yauzl");
const path = require("path");
const mongoose = require("mongoose");
const protect = require("../middleware/authMiddleware");
const Codebase = require("../models/Codebase");
const SourceFile = require("../models/SourceFile");

const router = express.Router();

const MAX_FILES = 2000;
const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024;
const MAX_FILE_SIZE = 1024 * 1024;
const MAX_TOTAL_SOURCE_SIZE = 5 * 1024 * 1024;

const ignoredFolders = [
"node_modules",
".git",
"dist",
"build",
"coverage",
];

const ignoredFiles = [
".env",
".env.local",
".env.production",
"id_rsa",
"id_ed25519",
];

const supportedExtensions = [
".html", ".htm", ".css", ".js", ".jsx", ".ts", ".tsx",
".json", ".md", ".txt", ".py", ".java", ".c", ".cpp",
".h", ".cs", ".php", ".sql", ".xml", ".yaml", ".yml", ".sh",
];

const upload = multer({
storage: multer.memoryStorage(),
limits: { fileSize: 20 * 1024 * 1024 },
fileFilter: (req, file, callback) => {
if (!file.originalname.toLowerCase().endsWith(".zip")) {
return callback(new Error("Only ZIP files are allowed."));
}


callback(null, true);


},
});

function shouldIgnoreFile(fileName) {
const parts = fileName.split("/").filter(Boolean);
const baseName = parts[parts.length - 1].toLowerCase();

return (
parts.some((part) => ignoredFolders.includes(part.toLowerCase())) ||
ignoredFiles.includes(baseName) ||
baseName.endsWith(".pem") ||
baseName.endsWith(".key")
);
}

function isSupportedTextFile(fileName) {
return supportedExtensions.some((extension) =>
fileName.toLowerCase().endsWith(extension)
);
}

router.post("/upload", protect, (req, res) => {
    console.log("DEVORA: ZIP upload route reached");
upload.single("project")(req, res, (uploadError) => {
    console.log("ZIP upload error:", uploadError);
if (uploadError) {
  console.error("ZIP UPLOAD ERROR:", uploadError.stack || uploadError);
}

console.log("Received file:", req.file);

if (!req.file) {
  return res.status(400).json({
    message: "Please upload a ZIP file.",
  });
}

if (!mongoose.isValidObjectId(req.userId)) {
  return res.status(401).json({
    message: "Invalid authenticated user.",
  });
}

yauzl.fromBuffer(
  req.file.buffer,
  {
    lazyEntries: true,
    validateEntrySizes: true,
  },
  (zipError, zipFile) => {
    if (zipError || !zipFile) {
      return res.status(400).json({
        message: "Invalid or corrupted ZIP file.",
      });
    }

    let fileCount = 0;
    let totalUncompressedSize = 0;
    let totalSourceSize = 0;
    let finished = false;
    const sourceFiles = [];

    function finishWithError(message) {
      if (finished) return;

      finished = true;
      zipFile.close();

      return res.status(400).json({ message });
    }

    zipFile.on("error", () => {
      finishWithError("Unable to read this ZIP file.");
    });

    zipFile.on("entry", (entry) => {
      if (finished) return;

      const fileName = entry.fileName.replace(/\\/g, "/");

      if (
        fileName.startsWith("/") ||
        /^[a-zA-Z]:/.test(fileName) ||
        fileName.split("/").includes("..")
      ) {
        return finishWithError(
          "The ZIP contains an unsafe file path."
        );
      }

      if (fileName.endsWith("/")) {
        zipFile.readEntry();
        return;
      }

      fileCount++;
      totalUncompressedSize += entry.uncompressedSize;

      if (fileCount > MAX_FILES) {
        return finishWithError(
          "The ZIP contains too many files. Maximum: 2000."
        );
      }

      if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE) {
        return finishWithError(
          "The ZIP contents exceed the 100 MB limit."
        );
      }

      if (
        shouldIgnoreFile(fileName) ||
        !isSupportedTextFile(fileName) ||
        entry.uncompressedSize > MAX_FILE_SIZE
      ) {
        zipFile.readEntry();
        return;
      }

      zipFile.openReadStream(entry, (streamError, readStream) => {
        if (finished) return;

        if (streamError || !readStream) {
          return finishWithError(
            "Unable to read a source file from the ZIP."
          );
        }

        const chunks = [];
        let currentSize = 0;
        let sourceLimitExceeded = false;

        readStream.on("data", (chunk) => {
          currentSize += chunk.length;

          if (
            currentSize > MAX_FILE_SIZE ||
            totalSourceSize + currentSize > MAX_TOTAL_SOURCE_SIZE
          ) {
            sourceLimitExceeded = true;
            readStream.destroy();
            return;
          }

          chunks.push(chunk);
        });

        readStream.on("error", () => {
          if (finished) return;

          if (sourceLimitExceeded) {
            return finishWithError(
              "Source code exceeds the allowed reading limit."
            );
          }

          finishWithError("Unable to read a source file.");
        });

        readStream.on("end", () => {
          if (finished) return;

          if (sourceLimitExceeded) {
            return finishWithError(
              "Source code exceeds the allowed reading limit."
            );
          }

          const content = Buffer.concat(chunks).toString("utf8");

          if (content.includes("\u0000")) {
            zipFile.readEntry();
            return;
          }

          totalSourceSize += currentSize;

          sourceFiles.push({
            path: fileName,
            content,
            extension: path.extname(fileName).toLowerCase(),
          });

          zipFile.readEntry();
        });
      });
    });

    zipFile.on("end", async () => {
      if (finished) return;

      finished = true;

      let createdCodebase;

      try {
        const originalFileName = req.file.originalname;
        const name = path.basename(originalFileName, ".zip");

        createdCodebase = await Codebase.create({
          name,
          originalFileName,
          owner: req.userId,
          fileCount: sourceFiles.length,
          status: "Processing",
        });

        if (sourceFiles.length > 0) {
          const documents = sourceFiles.map((file) => ({
            codebase: createdCodebase._id,
            owner: req.userId,
            path: file.path,
            content: file.content,
            extension: file.extension,
          }));

          await SourceFile.insertMany(documents, {
            ordered: true,
          });
        }

        createdCodebase.status = "Ready";
        await createdCodebase.save();

        return res.status(201).json({
          message: "Codebase uploaded and saved successfully!",
          codebase: {
            id: createdCodebase._id,
            name: createdCodebase.name,
            originalFileName: createdCodebase.originalFileName,
            fileCount: createdCodebase.fileCount,
            status: createdCodebase.status,
          },
          detectedFiles: sourceFiles.map((file) => file.path),
        });
      } catch (error) {
        if (createdCodebase) {
          await SourceFile.deleteMany({
            codebase: createdCodebase._id,
          }).catch(() => {});

          await Codebase.deleteOne({
            _id: createdCodebase._id,
          }).catch(() => {});
        }

        console.error("Codebase save error:", error);

        return res.status(500).json({
          message: "Failed to save the codebase to the database.",
        });
      }
    });

    zipFile.readEntry();
  }
);


});
});





// Get all codebases belonging to the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const codebases = await Codebase.find({
      owner: req.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Codebases retrieved successfully!",
      count: codebases.length,
      codebases,
    });
  } catch (error) {
    console.error("Get codebases error:", error);

    res.status(500).json({
      message: "Failed to retrieve codebases.",
    });
  }
});





// Get source files for a codebase
router.get("/:id/files", protect, async (req, res) => {
  try {
    const Codebase = require("../models/Codebase");
    const SourceFile = require("../models/SourceFile");

    const codebase = await Codebase.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!codebase) {
      return res.status(404).json({
        message: "Codebase not found",
      });
    }

    const files = await SourceFile.find({
      codebase: codebase._id,
      owner: req.userId,
    })
      .select("path extension")
      .sort({ path: 1 });

    res.status(200).json({
      message: "Source files retrieved successfully",
      count: files.length,
      files,
    });
  } catch (error) {
    console.error("Failed to retrieve source files:", error);

    res.status(500).json({
      message: "Failed to retrieve source files",
    });
  }
});






module.exports = router;
