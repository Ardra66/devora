const express = require("express");
const multer = require("multer");
const yauzl = require("yauzl");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

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
    let finished = false;
    const detectedFiles = [];

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

    const finishWithError = (message) => {
      if (finished) return;

      finished = true;
      zipFile.close();

      return res.status(400).json({ message });
    };

    zipFile.on("error", () => {
      finishWithError("Unable to read this ZIP file.");
    });

    zipFile.on("entry", (entry) => {
      if (finished) return;

      const fileName = entry.fileName.replace(/\\/g, "/");

      // Reject unsafe paths.
      if (
        fileName.startsWith("/") ||
        /^[a-zA-Z]:/.test(fileName) ||
        fileName.split("/").includes("..")
      ) {
        return finishWithError(
          "The ZIP contains an unsafe file path."
        );
      }

      // Skip directories.
      if (fileName.endsWith("/")) {
        zipFile.readEntry();
        return;
      }

      fileCount++;
      totalUncompressedSize += entry.uncompressedSize;

      if (fileCount > 2000) {
        return finishWithError(
          "The ZIP contains too many files. Maximum: 2000."
        );
      }

      if (totalUncompressedSize > 100 * 1024 * 1024) {
        return finishWithError(
          "The ZIP contents exceed the 100 MB limit."
        );
      }

      const pathParts = fileName.split("/").filter(Boolean);
      const baseName = pathParts[pathParts.length - 1];

      const shouldIgnore =
        pathParts.some((part) =>
          ignoredFolders.includes(part.toLowerCase())
        ) ||
        ignoredFiles.includes(baseName.toLowerCase()) ||
        baseName.endsWith(".pem") ||
        baseName.endsWith(".key");

      if (!shouldIgnore) {
        detectedFiles.push(fileName);
      }

      zipFile.readEntry();
    });

    zipFile.on("end", () => {
      if (finished) return;

      finished = true;

      return res.status(200).json({
        message: "ZIP file inspected successfully!",
        fileName: req.file.originalname,
        fileCount,
        totalUncompressedSize,
        detectedFiles,
      });
    });

    zipFile.readEntry();
  }
);


});
});

module.exports = router;
