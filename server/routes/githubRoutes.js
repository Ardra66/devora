const { pipeline } = require("stream/promises");
const { Transform, Readable } = require("stream");
const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");

const {
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const router = express.Router();

console.log("DEVORA GITHUB ROUTES LOADED");

const protect = require("../middleware/authMiddleware");
const tigris = require("../config/tigris");

const Codebase = require("../models/Codebase");
const processCodebaseArchive = require("../utils/processCodebaseArchive");


// ==========================================
// VALIDATE GITHUB REPOSITORY URL
// ==========================================

function parseGitHubUrl(value) {
  try {
    const url = new URL(value.trim());

    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const parts = url.pathname
      .split("/")
      .filter(Boolean);

    if (parts.length !== 2) {
      return null;
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");

    // Allow letters, numbers, hyphens, underscores and periods.
    const validName = /^[a-zA-Z0-9_.-]+$/;

    if (
      !validName.test(owner) ||
      !validName.test(repo) ||
      owner === "." ||
      owner === ".." ||
      repo === "." ||
      repo === ".."
    ) {
      return null;
    }

    return { owner, repo };

  } catch {
    return null;
  }
}


// ==========================================
// GET PUBLIC GITHUB REPOSITORY INFORMATION
// ==========================================

async function getGitHubRepository(owner, repo) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Devora-AI",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Repository not found or not publicly accessible."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "GitHub API rate limit reached. Please try again later."
      );
    }

    throw new Error(
      "Could not retrieve repository information from GitHub."
    );
  }

  const data = await response.json();

  if (!data.default_branch) {
    throw new Error("GitHub repository has no default branch.");
  }

  return {
    name: data.name,
    owner: data.owner.login,
    defaultBranch: data.default_branch,
    htmlUrl: data.html_url,
  };
}


// ==========================================
// DOWNLOAD GITHUB REPOSITORY ZIP
// ==========================================

async function downloadGitHubZip(
  owner,
  repo,
  branch,
  zipPath
) {
  const downloadUrl =
    `https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(branch)}`;

  const response = await fetch(downloadUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Devora-AI",
    },
    redirect: "follow",
  });

  if (!response.ok || !response.body) {
    throw new Error(
      "Could not download the GitHub repository."
    );
  }

  const MAX_ZIP_SIZE = 100 * 1024 * 1024;

  let downloadedSize = 0;

  const sizeLimiter = new Transform({
    transform(chunk, encoding, callback) {
      downloadedSize += chunk.length;

      if (downloadedSize > MAX_ZIP_SIZE) {
        callback(
          new Error(
            "Repository ZIP exceeds the 100 MB limit."
          )
        );
        return;
      }

      callback(null, chunk);
    },
  });

  await pipeline(
    Readable.fromWeb(response.body),
    sizeLimiter,
    fs.createWriteStream(zipPath)
  );

  return downloadedSize;
}


// ==========================================
// UPLOAD GITHUB ZIP TO TIGRIS
// ==========================================

async function uploadGitHubZipToTigris(
  zipPath,
  objectKey,
  fileSize
) {
  await tigris.send(
    new PutObjectCommand({
      Bucket: process.env.TIGRIS_BUCKET,
      Key: objectKey,
      Body: fs.createReadStream(zipPath),
      ContentLength: fileSize,
      ContentType: "application/zip",
    })
  );

  return objectKey;
}


// ==========================================
// CREATE OR UPDATE GITHUB CODEBASE
// ==========================================

async function createGitHubCodebase({
  userId,
  githubData,
  githubUrl,
  objectKey,
  fileSize,
}) {
  const codebase = await Codebase.findOneAndUpdate(
    {
      owner: userId,
      githubOwner: githubData.owner,
      githubRepo: githubData.name,
    },
    {
      $set: {
        name: githubData.name,

        originalFileName:
          `github-${githubData.owner}-${githubData.name}.zip`,

        sourceType: "github",

        githubUrl,
        githubOwner: githubData.owner,
        githubRepo: githubData.name,
        githubBranch: githubData.defaultBranch,

        archiveObjectKey: objectKey,
        archiveSize: fileSize,

        status: "Uploaded",
        fileCount: 0,
      },

      $setOnInsert: {
        owner: userId,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return codebase;
}


// ==========================================
// IMPORT PUBLIC GITHUB REPOSITORY
// POST /api/github/import
// ==========================================

router.post("/import", protect, async (req, res) => {
  let zipPath = null;
  let uploadedObjectKey = null;

  try {
    const { githubUrl } = req.body;

    // Validate input
    if (
      !githubUrl ||
      typeof githubUrl !== "string"
    ) {
      return res.status(400).json({
        message: "Please provide a GitHub repository URL.",
      });
    }

    // Parse GitHub URL
    const repository = parseGitHubUrl(githubUrl);

    if (!repository) {
      return res.status(400).json({
        message: "Invalid GitHub repository URL.",
      });
    }

    const { owner, repo } = repository;

    // Retrieve GitHub repository information
    const githubData = await getGitHubRepository(
      owner,
      repo
    );

    // Check whether repository was previously imported
    const existingCodebase = await Codebase.findOne({
      owner: req.userId,
      githubOwner: githubData.owner,
      githubRepo: githubData.name,
    });

    // Create temporary ZIP file path
    zipPath = path.join(
      os.tmpdir(),
      `devora-github-${randomUUID()}.zip`
    );

    // Download GitHub repository ZIP
    const fileSize = await downloadGitHubZip(
      githubData.owner,
      githubData.name,
      githubData.defaultBranch,
      zipPath
    );

    if (fileSize <= 0) {
      throw new Error(
        "Downloaded repository ZIP is empty."
      );
    }

    // Generate unique Tigris object key
    uploadedObjectKey =
      `github/${req.userId}/${randomUUID()}-${repo}.zip`;

    // Upload ZIP to Tigris
    await uploadGitHubZipToTigris(
      zipPath,
      uploadedObjectKey,
      fileSize
    );

    // Create or update MongoDB Codebase record
    const codebase = await createGitHubCodebase({
      userId: req.userId,
      githubData,
      githubUrl: githubData.htmlUrl,
      objectKey: uploadedObjectKey,
      fileSize,
    });

    // Delete previous archive after successful replacement
    if (
      existingCodebase?.archiveObjectKey &&
      existingCodebase.archiveObjectKey !== uploadedObjectKey
    ) {
      try {
        await tigris.send(
          new DeleteObjectCommand({
            Bucket: process.env.TIGRIS_BUCKET,
            Key: existingCodebase.archiveObjectKey,
          })
        );
      } catch (cleanupError) {
        console.error(
          "OLD GITHUB ARCHIVE CLEANUP ERROR:",
          cleanupError.message
        );
      }
    }

    // Start ZIP processing in the background
    processCodebaseArchive(codebase._id).catch(
      (error) => {
        console.error(
          "GITHUB CODEBASE PROCESSING ERROR:",
          error
        );
      }
    );

    return res.status(202).json({
      message:
        "GitHub repository imported. Processing has started.",

      codebaseId: codebase._id,

      repository: githubData,

      fileSize,

      status: "Processing",
    });

  } catch (error) {
    console.error("GITHUB IMPORT ERROR:", error);

    // Delete uploaded ZIP if import failed
    if (uploadedObjectKey) {
      try {
        await tigris.send(
          new DeleteObjectCommand({
            Bucket: process.env.TIGRIS_BUCKET,
            Key: uploadedObjectKey,
          })
        );
      } catch (cleanupError) {
        console.error(
          "GITHUB ZIP CLEANUP ERROR:",
          cleanupError
        );
      }
    }

    return res.status(500).json({
      message:
        error.message ||
        "GitHub repository import failed.",
    });

  } finally {
    // Remove temporary local ZIP file
    if (zipPath) {
      try {
        await fs.promises.unlink(zipPath);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error(
            "TEMP ZIP CLEANUP ERROR:",
            cleanupError
          );
        }
      }
    }
  }
});


// ==========================================
// REGISTERED ROUTES
// ==========================================

console.log(
  "REGISTERED GITHUB ROUTES:",
  router.stack
    .map((layer) => layer.route?.path)
    .filter(Boolean)
);


module.exports = router;