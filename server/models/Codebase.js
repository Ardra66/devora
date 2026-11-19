const mongoose = require("mongoose");

const codebaseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    originalFileName: {
      type: String,
      required: true,
    },

        // GitHub repository information
    sourceType: {
      type: String,
      enum: ["upload", "github"],
      default: "upload",
    },

    githubUrl: {
      type: String,
      default: null,
    },

    githubOwner: {
      type: String,
      default: null,
    },

    githubRepo: {
      type: String,
      default: null,
    },

    githubBranch: {
      type: String,
      default: null,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Location of the original ZIP file in Tigris
    archiveObjectKey: {
  type: String,
  default: null,
},

    archiveSize: {
  type: Number,
  default: 0,
},

    // Links this codebase to its upload session
    uploadSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UploadSession",
      unique: true,
      sparse: true,
    },

    fileCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Uploaded", "Processing", "Ready", "Failed"],
      default: "Uploaded",
    },
  },
  {
    timestamps: true,
  }
);



codebaseSchema.index(
  { owner: 1, originalFileName: 1 },
  { unique: true }
);

module.exports = mongoose.model("Codebase", codebaseSchema);