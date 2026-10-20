const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
{
name: {
type: String,
required: true,
trim: true,
},


description: {
  type: String,
  default: "",
  trim: true,
},

technologies: {
  type: [String],
  default: [],
},

status: {
  type: String,
  enum: ["Planning", "In Progress", "Completed"],
  default: "Planning",
},

owner: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
},


},
{
timestamps: true,
}
);

module.exports = mongoose.model("Project", projectSchema);
