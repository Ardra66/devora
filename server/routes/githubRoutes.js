
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");
const express = require("express");
const { Readable } = require("stream");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const tigris = require("../config/tigris");

const Codebase = require("../models/Codebase");
const processCodebaseArchive = require("../utils/processCodebaseArchive");


// Validate and extract GitHub repository details
function parseGitHubUrl(value) {

  try {
    const url = new URL(value);

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
    const repo = parts[1].replace(/\.git$/, "");

    const validName = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

    if (!validName.test(owner) || !validName.test(repo)) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}


// Fetch public repository information from GitHub
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
      throw new Error("Repository not found or not publicly accessible.");
    }

    if (response.status === 403) {
      throw new Error("GitHub API rate limit reached. Please try again later.");
    }

    throw new Error("Could not retrieve repository information from GitHub.");
  }

  const data = await response.json();

  return {
    name: data.name,
    owner: data.owner.login,
    defaultBranch: data.default_branch,
    htmlUrl: data.html_url,
  };
}

module.exports = router;