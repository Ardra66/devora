const express = require("express");
const { randomUUID } = require("crypto");

const router = express.Router();

console.log("DEVORA UPLOAD ROUTES LOADED");

const protect = require("../middleware/authMiddleware");
const tigris = require("../config/tigris");

const UploadSession = require("../models/UploadSession");
const Codebase = require("../models/Codebase");

const {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Upload configuration
const MAX_FILE_SIZE = 1024 * 1024 * 1024;
const PART_SIZE = 16 * 1024 * 1024;
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Create or retrieve the Codebase record for an upload session
async function createCodebaseRecord(session) {
  const codebaseName =
    session.originalFileName
      .split(/[\\/]/)
      .pop()
      .replace(/\.zip$/i, "")
      .trim() || "Untitled Codebase";

  // uploadSession has a unique sparse index in Codebase.js.
  // This prevents duplicate Codebase records for the same upload.
  const codebase = await Codebase.findOneAndUpdate(
    {
      uploadSession: session._id,
    },
    {
      $setOnInsert: {
        name: codebaseName,
        originalFileName: session.originalFileName,
        owner: session.owner,
        archiveObjectKey: session.objectKey,
        archiveSize: session.fileSize,
        uploadSession: session._id,
        status: "Uploaded",
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  // Save the Codebase reference in the upload session
  if (
    !session.codebase ||
    session.codebase.toString() !== codebase._id.toString()
  ) {
    session.codebase = codebase._id;
    await session.save();
  }

  return codebase;
}

// POST /api/uploads/initiate
// Create a multipart upload session
router.post("/initiate", protect, async (req, res) => {
  let uploadId = null;
  let objectKey = null;

  try {
    const { fileName, fileSize } = req.body;

    if (
      !fileName ||
      typeof fileName !== "string" ||
      !fileName.toLowerCase().endsWith(".zip")
    ) {
      return res.status(400).json({
        message: "Please upload a valid ZIP file.",
      });
    }

    if (
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_FILE_SIZE
    ) {
      return res.status(400).json({
        message: "ZIP file size must be between 1 byte and 1 GB.",
      });
    }

    const totalParts = Math.ceil(fileSize / PART_SIZE);

    const safeFileName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-150);

    objectKey = `uploads/${req.userId}/${randomUUID()}-${safeFileName}`;

    const multipartUpload = await tigris.send(
      new CreateMultipartUploadCommand({
        Bucket: process.env.TIGRIS_BUCKET,
        Key: objectKey,
        ContentType: "application/zip",
      })
    );

    uploadId = multipartUpload.UploadId;

    if (!uploadId) {
      throw new Error("Tigris did not return an upload ID.");
    }

    const session = await UploadSession.create({
      owner: req.userId,
      originalFileName: fileName,
      fileSize,
      objectKey,
      uploadId,
      partSize: PART_SIZE,
      totalParts,
      uploadedParts: [],
      status: "Initiated",
      expiresAt: new Date(Date.now() + SESSION_DURATION),
    });

    return res.status(201).json({
      message: "Upload session created successfully.",
      sessionId: session._id,
      fileName: session.originalFileName,
      fileSize: session.fileSize,
      partSize: session.partSize,
      totalParts: session.totalParts,
    });
  } catch (error) {
    console.error("UPLOAD INITIATION ERROR:", error.message);

    if (uploadId && objectKey) {
      try {
        await tigris.send(
          new AbortMultipartUploadCommand({
            Bucket: process.env.TIGRIS_BUCKET,
            Key: objectKey,
            UploadId: uploadId,
          })
        );
      } catch (abortError) {
        console.error("UPLOAD CLEANUP ERROR:", abortError.message);
      }
    }

    return res.status(500).json({
      message: "Could not initialize ZIP upload.",
    });
  }
});

// POST /api/uploads/:sessionId/part-url
// Generate a temporary URL for uploading one part
router.post("/:sessionId/part-url", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { partNumber } = req.body;

    const session = await UploadSession.findOne({
      _id: sessionId,
      owner: req.userId,
    });

    if (!session) {
      return res.status(404).json({
        message: "Upload session not found.",
      });
    }

    if (
      session.status !== "Initiated" &&
      session.status !== "Uploading"
    ) {
      return res.status(400).json({
        message: "This upload session is not active.",
      });
    }

    if (session.expiresAt < new Date()) {
      return res.status(400).json({
        message: "Upload session has expired.",
      });
    }

    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > session.totalParts
    ) {
      return res.status(400).json({
        message: "Invalid upload part number.",
      });
    }

    const command = new UploadPartCommand({
      Bucket: process.env.TIGRIS_BUCKET,
      Key: session.objectKey,
      UploadId: session.uploadId,
      PartNumber: partNumber,
    });

    const uploadUrl = await getSignedUrl(tigris, command, {
      expiresIn: 900,
    });

    session.status = "Uploading";
    await session.save();

    return res.status(200).json({
      uploadUrl,
      partNumber,
      expiresIn: 900,
    });
  } catch (error) {
    console.error("PART URL ERROR:", error.message);

    return res.status(500).json({
      message: "Could not generate upload URL.",
    });
  }
});

// POST /api/uploads/:sessionId/complete
// Complete ZIP upload and create Codebase record
router.post("/:sessionId/complete", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await UploadSession.findOne({
      _id: sessionId,
      owner: req.userId,
    });

    if (!session) {
      return res.status(404).json({
        message: "Upload session not found.",
      });
    }

    // If already completed, retrieve/create its Codebase record.
    // This makes retries safe without completing the Tigris upload again.
    if (session.status === "Completed") {
      const codebase = await createCodebaseRecord(session);

      return res.status(200).json({
        message: "ZIP upload completed successfully.",
        objectKey: session.objectKey,
        fileSize: session.fileSize,
        codebase,
      });
    }

    if (session.status !== "Uploading") {
      return res.status(400).json({
        message: "Upload session is not ready for completion.",
      });
    }

    if (session.expiresAt < new Date()) {
      return res.status(400).json({
        message: "Upload session has expired.",
      });
    }

    // Retrieve uploaded parts from Tigris
    const partsResponse = await tigris.send(
      new ListPartsCommand({
        Bucket: process.env.TIGRIS_BUCKET,
        Key: session.objectKey,
        UploadId: session.uploadId,
      })
    );

    const uploadedParts = (partsResponse.Parts || []).sort(
      (a, b) => a.PartNumber - b.PartNumber
    );

    if (uploadedParts.length !== session.totalParts) {
      return res.status(400).json({
        message: "Some upload parts are missing.",
        expectedParts: session.totalParts,
        uploadedParts: uploadedParts.length,
      });
    }

    // Validate part numbers, sizes, and ETags
    for (let index = 0; index < uploadedParts.length; index++) {
      const part = uploadedParts[index];
      const expectedPartNumber = index + 1;

      const expectedSize =
        expectedPartNumber === session.totalParts
          ? session.fileSize - session.partSize * (session.totalParts - 1)
          : session.partSize;

      if (
        part.PartNumber !== expectedPartNumber ||
        part.Size !== expectedSize ||
        !part.ETag
      ) {
        return res.status(400).json({
          message: "Uploaded parts failed validation.",
        });
      }
    }

    const completedParts = uploadedParts.map((part) => ({
      PartNumber: part.PartNumber,
      ETag: part.ETag,
    }));

    // Complete multipart upload in Tigris
    await tigris.send(
      new CompleteMultipartUploadCommand({
        Bucket: process.env.TIGRIS_BUCKET,
        Key: session.objectKey,
        UploadId: session.uploadId,
        MultipartUpload: {
          Parts: completedParts,
        },
      })
    );

    // Mark upload as completed
    session.status = "Completed";
    await session.save();

    // Create the corresponding Codebase record in MongoDB
    const codebase = await createCodebaseRecord(session);

    return res.status(200).json({
      message: "ZIP uploaded and Codebase registered successfully.",
      objectKey: session.objectKey,
      fileSize: session.fileSize,
      codebase,
    });
  } catch (error) {
    console.error("UPLOAD COMPLETION ERROR:", error);

    return res.status(500).json({
      message: "Could not complete ZIP upload.",
    });
  }
});

// DELETE /api/uploads/:sessionId/abort
// Abort an unfinished multipart upload
router.delete("/:sessionId/abort", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await UploadSession.findOne({
      _id: sessionId,
      owner: req.userId,
    });

    if (!session) {
      return res.status(404).json({
        message: "Upload session not found.",
      });
    }

    if (session.status === "Completed") {
      return res.status(400).json({
        message: "This upload has already been completed.",
      });
    }

    if (session.status === "Aborted") {
      return res.status(400).json({
        message: "This upload has already been aborted.",
      });
    }

    await tigris.send(
      new AbortMultipartUploadCommand({
        Bucket: process.env.TIGRIS_BUCKET,
        Key: session.objectKey,
        UploadId: session.uploadId,
      })
    );

    session.status = "Aborted";
    await session.save();

    return res.status(200).json({
      message: "Upload aborted successfully.",
    });
  } catch (error) {
    console.error("UPLOAD ABORT ERROR:", error.message);

    return res.status(500).json({
      message: "Could not abort upload.",
    });
  }
});

module.exports = router;