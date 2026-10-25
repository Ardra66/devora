const Project = require("../models/Project");

const createProject = async (req, res) => {

try {
const { name, description, technologies, status } = req.body;



if (
  technologies !== undefined &&
  (!Array.isArray(technologies) ||
    !technologies.every((technology) => typeof technology === "string"))
) {
  return res.status(400).json({
    message: "Technologies must be an array of strings",
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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const projects = await Project.find({
      owner: req.userId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalProjects = await Project.countDocuments({
      owner: req.userId,
    });

    res.status(200).json({
      message: "Projects fetched successfully",
      count: projects.length,
      totalProjects,
      currentPage: page,
      totalPages: Math.ceil(totalProjects / limit),
      projects,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



const updateProject = async (req, res) => {
try {
const { name, description, technologies, status } = req.body;


console.log("Project ID:", req.params.id);
console.log("Logged-in User ID:", req.userId);

if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
  return res.status(400).json({
    message: "Invalid project ID",
  });
}

const updates = {};

if (name !== undefined) {
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      message: "Project name cannot be empty",
    });
  }

  updates.name = name.trim();
}

if (description !== undefined) {
  updates.description = description;
}

if (technologies !== undefined) {
  if (
    !Array.isArray(technologies) ||
    !technologies.every((technology) => typeof technology === "string")
  ) {
    return res.status(400).json({
      message: "Technologies must be an array of strings",
    });
  }

  updates.technologies = technologies;
}


if (status !== undefined) {
  if (
    typeof status !== "string" ||
    !["Planning", "In Progress", "Completed"].includes(status)
  ) {
    return res.status(400).json({
      message: "Invalid project status",
    });
  }

  updates.status = status;
}






if (Object.keys(updates).length === 0) {
  return res.status(400).json({
    message: "Please provide at least one field to update",
  });
}

const project = await Project.findOneAndUpdate(
  {
    _id: req.params.id,
    owner: req.userId,
  },
  updates,
  {
    new: true,
    runValidators: true,
  }
);

if (!project) {
  return res.status(404).json({
    message: "Project not found or you do not have permission to update it",
  });
}

return res.status(200).json({
  message: "Project updated successfully",
  project,
});

} catch (error) {
console.error("Update project error:", error.message);

if (error.name === "CastError") {
  return res.status(400).json({
    message: "Invalid project ID",
  });
}

return res.status(500).json({
  message: "Server error",
  error: error.message,
});

}
};
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found or you do not have permission to delete it",
      });
    }

    return res.status(200).json({
      message: "Project deleted successfully",
      project,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createProject,
  getMyProjects,
  updateProject,
  deleteProject,
};



