const express = require("express");
const multer = require("multer");
const yauzl = require("yauzl");
const protect = require("../middleware/authMiddleware");

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
".html",
".htm",
".css",
".js",
".jsx",
".ts",
".tsx",
".json",
".md",
".txt",
".py",
".java",
".c",
".cpp",
".h",
".cs",
".php",
".sql",
".xml",
".yaml",
".yml",
".sh",
];

const upload = multer({
storage: multer.memoryStorage(),
limits: {
fileSize: 20 * 1024 * 1024,
},
fileFilter: (req, file, callback) => {
if (!file.originalname.toLowerCase().endsWith(".zip")) {
return callback(new Error("Only ZIP files are allowed."));
}

callback(null, true);


},
});

function shouldIgnoreFile(fileName) {
const pathParts = fileName.split("/").filter(Boolean);
const baseName = pathParts[pathParts.length - 1].toLowerCase();

return (
pathParts.some((part) =>
ignoredFolders.includes(part.toLowerCase())
) ||
ignoredFiles.includes(baseName) ||
baseName.endsWith(".pem") ||
baseName.endsWith(".key")
);
}

function isSupportedTextFile(fileName) {
const lowerName = fileName.toLowerCase();

return supportedExtensions.some((extension) =>
lowerName.endsWith(extension)
);
}

router.post("/upload", protect, (req, res) => {
upload.single("project")(req, res, (uploadError) => {
if (uploadError) {
return res.status(400).json({
message: uploadError.message || "File upload failed.",
});
}


if (!req.file) {
  return res.status(400).json({
    message: "Please upload a ZIP file.",
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

    const detectedFiles = [];
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

        readStream.on("data", (chunk) => {
          currentSize += chunk.length;

          if (
            currentSize > MAX_FILE_SIZE ||
            totalSourceSize + currentSize > MAX_TOTAL_SOURCE_SIZE
          ) {
            readStream.destroy(
              new Error("Source content limit exceeded.")
            );
            return;
          }

          chunks.push(chunk);
        });

        readStream.on("error", (error) => {
          if (finished) return;

          if (error.message === "Source content limit exceeded.") {
            return finishWithError(
              "Source code exceeds the allowed reading limit."
            );
          }

          finishWithError("Unable to read a source file.");
        });

        readStream.on("end", () => {
          if (finished) return;

          const content = Buffer.concat(chunks).toString("utf8");

          // Skip files that appear to contain binary data.
          if (content.includes("\u0000")) {
            zipFile.readEntry();
            return;
          }

          totalSourceSize += currentSize;
          detectedFiles.push(fileName);

          sourceFiles.push({
            path: fileName,
            content,
          });

          zipFile.readEntry();
        });
      });
    });

    zipFile.on("end", () => {
      if (finished) return;

      finished = true;

      return res.status(200).json({
        message: "ZIP source files read successfully!",
        fileName: req.file.originalname,
        fileCount,
        totalUncompressedSize,
        detectedFiles,
        sourceFiles,
      });
    });

    zipFile.readEntry();
  }
);


});
});

module.exports = router;
