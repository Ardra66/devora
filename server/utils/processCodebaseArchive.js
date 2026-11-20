const yauzl = require("yauzl");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { pipeline } = require("stream/promises");

const { GetObjectCommand } = require("@aws-sdk/client-s3");

const tigris = require("../config/tigris");
const Codebase = require("../models/Codebase");
const SourceFile = require("../models/SourceFile");

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

function shouldIgnoreFile(fileName) {
  const parts = fileName.split("/").filter(Boolean);
  const baseName = parts[parts.length - 1].toLowerCase();

  return (
    parts.some((part) =>
      ignoredFolders.includes(part.toLowerCase())
    ) ||
    ignoredFiles.includes(baseName) ||
    baseName.endsWith(".pem") ||
    baseName.endsWith(".key")
  );
}

function isSupportedTextFile(fileName) {
  const baseName = path.basename(fileName).toLowerCase();

  const supportedExtensionlessFiles = [
    "readme",
    "license",
    "makefile",
    "dockerfile",
    "procfile",
  ];

  if (supportedExtensionlessFiles.includes(baseName)) {
    return true;
  }

  return supportedExtensions.some((extension) =>
    fileName.toLowerCase().endsWith(extension)
  );
}

function readZipEntry(zipFile, entry) {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        return reject(
          new Error("Unable to read ZIP source file.")
        );
      }

      const chunks = [];
      let size = 0;

      stream.on("data", (chunk) => {
        size += chunk.length;

        if (size > MAX_FILE_SIZE) {
          stream.destroy(
            new Error("Source file exceeds the 1 MB limit.")
          );
          return;
        }

        chunks.push(chunk);
      });

      stream.on("error", reject);

      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });
  });
}

async function extractZip(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(
      zipPath,
      {
        lazyEntries: true,
        validateEntrySizes: true,
      },
      (error, zipFile) => {
        if (error || !zipFile) {
          return reject(
            new Error("Invalid or corrupted ZIP file.")
          );
        }

        const sourceFiles = [];

        let fileCount = 0;
        let totalUncompressedSize = 0;
        let totalSourceSize = 0;
        let finished = false;
        let processing = false;

        function fail(error) {
          if (finished) return;

          finished = true;
          zipFile.close();
          reject(error);
        }

        zipFile.on("error", fail);

        zipFile.on("end", () => {
          if (finished) return;

          finished = true;
          resolve(sourceFiles);
        });

        zipFile.on("entry", async (entry) => {
          if (finished || processing) return;

          processing = true;

          try {
            // Normalize ZIP paths.
            const fileName = entry.fileName.replace(/\\/g, "/");

            // Prevent unsafe paths.
            if (
              fileName.startsWith("/") ||
              /^[a-zA-Z]:/.test(fileName) ||
              fileName.split("/").includes("..")
            ) {
              throw new Error(
                "Unsafe file path detected in ZIP."
              );
            }

            // Skip directory entries.
            if (fileName.endsWith("/")) {
              processing = false;
              zipFile.readEntry();
              return;
            }

            // Skip ignored folders, unsupported files,
            // and files larger than the individual file limit.
            if (
              shouldIgnoreFile(fileName) ||
              !isSupportedTextFile(fileName) ||
              entry.uncompressedSize > MAX_FILE_SIZE
            ) {
              processing = false;
              zipFile.readEntry();
              return;
            }

            // Count only supported source files.
            fileCount++;

            if (fileCount > MAX_FILES) {
              throw new Error(
                "ZIP contains more than 2000 supported source files."
              );
            }

            // Count supported source files toward this limit.
            totalUncompressedSize += entry.uncompressedSize;

            if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE) {
              throw new Error(
                "Supported source files exceed the 100 MB limit."
              );
            }

            const buffer = await readZipEntry(zipFile, entry);

            // Skip binary files.
            if (buffer.includes(0)) {
              processing = false;
              zipFile.readEntry();
              return;
            }

            totalSourceSize += buffer.length;

            if (totalSourceSize > MAX_TOTAL_SOURCE_SIZE) {
              throw new Error(
                "Total source code exceeds the 5 MB limit."
              );
            }

            sourceFiles.push({
              path: fileName,
              content: buffer.toString("utf8"),
              extension: path.extname(fileName).toLowerCase(),
            });

            processing = false;
            zipFile.readEntry();
          } catch (error) {
            fail(error);
          }
        });

        zipFile.readEntry();
      }
    );
  });
}

async function processCodebaseArchive(codebaseId) {
  let tempFilePath;

  try {
    const codebase = await Codebase.findById(codebaseId);

    if (!codebase) {
      throw new Error("Codebase not found.");
    }

    if (!codebase.archiveObjectKey) {
      throw new Error("Original ZIP archive is missing.");
    }

    codebase.status = "Processing";
    await codebase.save();

    tempFilePath = path.join(
      os.tmpdir(),
      `devora-${codebase._id}-${Date.now()}.zip`
    );

    const response = await tigris.send(
      new GetObjectCommand({
        Bucket: process.env.TIGRIS_BUCKET,
        Key: codebase.archiveObjectKey,
      })
    );

    if (!response.Body) {
      throw new Error("Could not download ZIP from Tigris.");
    }

    await pipeline(
      response.Body,
      fs.createWriteStream(tempFilePath)
    );

    const sourceFiles = await extractZip(tempFilePath);

    const documents = sourceFiles.map((file) => ({
      codebase: codebase._id,
      owner: codebase.owner,
      path: file.path,
      content: file.content,
      extension: file.extension,
    }));

    // Replace any previous extraction results.
    await SourceFile.deleteMany({
      codebase: codebase._id,
      owner: codebase.owner,
    });

    if (documents.length > 0) {
      await SourceFile.insertMany(documents);
    }

    codebase.fileCount = documents.length;
    codebase.status = "Ready";

    await codebase.save();

    return {
      fileCount: documents.length,
      status: codebase.status,
    };
  } catch (error) {
    await Codebase.findByIdAndUpdate(codebaseId, {
      status: "Failed",
    }).catch(() => {});

    console.error("CODEBASE PROCESSING ERROR:", error);

    throw error;
  } finally {
    if (tempFilePath) {
      await fs.promises.unlink(tempFilePath).catch(() => {});
    }
  }
}

module.exports = processCodebaseArchive;
