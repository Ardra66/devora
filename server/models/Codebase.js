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

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

module.exports = mongoose.model("Codebase", codebaseSchema);