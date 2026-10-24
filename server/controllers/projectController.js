const Project = require("../models/Project");

const createProject = async (req, res) => {
try {
const { name, description, technologies, status } = req.body;

if (!name || !name.trim()) {
  return res.status(400).json({
    message: "Project name is required",
  });
}

const project = await Project.create({
  name,
  description,
  technologies,
  status,
  owner: req.userId,
});

res.status(201).json({
  message: "Project created successfully",
  project,
});


} catch (error) {
res.status(500).json({
message: "Server error",
error: error.message,
});
}
};

const getMyProjects = async (req, res) => {
try {
const projects = await Project.find({
owner: req.userId,
}).sort({ createdAt: -1 });


res.status(200).json({
  message: "Projects fetched successfully",
  count: projects.length,
  projects,
});

} catch (error) {
res.status(500).json({
message: "Server error",
error: error.message,
});
}
};

module.exports = {
createProject,
getMyProjects,
};
