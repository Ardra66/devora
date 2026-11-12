
const mongoose = require("mongoose");

const uploadSessionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    objectKey: {
      type: String,
      required: true,
      unique: true,
    },

    uploadId: {
      type: String,
      required: true,
      unique: true,
    },

    partSize: {
      type: Number,
      required: true,
    },

    totalParts: {
      type: Number,
      required: true,
    },

    uploadedParts: [
      {
        partNumber: {
          type: Number,
          required: true,
        },

        etag: {
          type: String,
          required: true,
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "Initiated",
        "Uploading",
        "Completed",
        "Aborted",
        "Failed",
      ],
      default: "Initiated",
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically remove expired session records.
uploadSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("UploadSession", uploadSessionSchema);
