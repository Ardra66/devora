const mongoose = require("mongoose");

const sourceFileSchema = new mongoose.Schema(
{
codebase: {
type: mongoose.Schema.Types.ObjectId,
ref: "Codebase",
required: true,
index: true,
},


owner: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
  index: true,
},

path: {
  type: String,
  required: true,
},

content: {
  type: String,
  required: true,
},

extension: {
  type: String,
  default: "",
},


},
{
timestamps: true,
}
);

sourceFileSchema.index({ codebase: 1, path: 1 }, { unique: true });

module.exports = mongoose.model("SourceFile", sourceFileSchema);
