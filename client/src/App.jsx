import { apiRequest } from "./api";
import Login from "./Login";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  Command,
  Cpu,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import "./App.css";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "My Projects", icon: FolderKanban },
  { label: "AI Assistant", icon: Bot },
  { label: "Settings", icon: Settings },
];

const initialProjects = [
  {
    id: 1,
    name: "Devora AI",
    description: "Intelligent development workspace",
    technologies: ["React", "Node.js", "AI"],
    status: "In Progress",
    color: "green",
  },
  {
    id: 2,
    name: "Task Manager",
    description: "Role-based task management system",
    technologies: ["MongoDB", "Express", "React"],
    status: "Completed",
    color: "cyan",
  },
  {
    id: 3,
    name: "Portfolio",
    description: "Personal developer portfolio",
    technologies: ["React", "CSS"],
    status: "Planning",
    color: "purple",
  },
];

const normalizePath = (path) =>
  (path || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");

function App() {
  const [selectedCodebase, setSelectedCodebase] = useState(null);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [codeAnalysis, setCodeAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sourceFilesLoading, setSourceFilesLoading] = useState(false);
  const [selectedSourceFile, setSelectedSourceFile] = useState(null);
  const [sourceContentLoading, setSourceContentLoading] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("devoraToken"))
  );
  const [activePage, setActivePage] = useState("Dashboard");
  const [projects, setProjects] = useState(initialProjects);
  const [codebases, setCodebases] = useState([]);
  const [codebasesLoading, setCodebasesLoading] = useState(true);
  const [codebasesError, setCodebasesError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notification, setNotification] = useState("");

  useEffect(() => {
    if (!notification) return undefined;

    const timer = window.setTimeout(() => setNotification(""), 3000);

    return () => window.clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    if (!localStorage.getItem("devoraToken")) return;

    const fetchProjects = async () => {
      try {
        const data = await apiRequest("/api/projects");

        const fetchedProjects = Array.isArray(data)
          ? data
          : data.projects || [];

        setProjects(fetchedProjects);
      } catch (error) {
        console.error("Failed to fetch projects:", error.message);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("devoraToken")) {
      setCodebasesLoading(false);
      return;
    }

    const fetchCodebases = async () => {
      try {
        const data = await apiRequest("/api/codebase");

        setCodebases(data.codebases || []);
        setCodebasesError("");
      } catch (error) {
        console.error("Failed to fetch codebases:", error.message);
        setCodebasesError(error.message || "Failed to load codebases.");
      } finally {
        setCodebasesLoading(false);
      }
    };

    fetchCodebases();
  }, []);

  useEffect(() => {
    const handleMouseMove = (event) => {
      setCursor({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const filteredProjects = projects.filter((project) =>
    (project.name || "").toLowerCase().includes(searchText.toLowerCase())
  );

  const inProgressCount = projects.filter(
    (project) => project.status === "In Progress"
  ).length;

  const completedCount = projects.filter(
    (project) => project.status === "Completed"
  ).length;

  const handleViewCodebase = async (codebase) => {
    setSelectedCodebase(codebase);
    setSelectedSourceFile(null);
    setCodeAnalysis(null);
    setSourceFiles([]);
    setSourceFilesLoading(true);

    try {
      const data = await apiRequest(
        `/api/codebase/${codebase._id}/files`
      );

      setSourceFiles(data.files || []);
    } catch (error) {
      setNotification(error.message || "Failed to load source files.");
    } finally {
      setSourceFilesLoading(false);
    }
  };

  const handleViewSourceFile = async (codebase, file) => {
    if (!codebase || !file) return;

    setSelectedCodebase(codebase);
    setSelectedSourceFile({
      ...file,
      content: file.content || "",
    });
    setCodeAnalysis(null);
    setSourceContentLoading(true);

    try {
      const data = await apiRequest(
        `/api/codebase/${codebase._id}/files/${file._id}`
      );

      setSelectedSourceFile(data.file || data);
    } catch (error) {
      setNotification(error.message || "Failed to load source code.");
    } finally {
      setSourceContentLoading(false);
    }
  };

  const handleOpenRelevantCode = async (match) => {
    if (!selectedCodebase) {
      setNotification("Please select a codebase first.");
      return;
    }

    setSourceFilesLoading(true);

    try {
      const data = await apiRequest(
        `/api/codebase/${selectedCodebase._id}/files`
      );

      const files = data.files || [];

      setSourceFiles(files);

      const matchPath = normalizePath(match.fileName);

      const matchingFile = files.find((file) => {
        const filePath = normalizePath(file.path);

        return (
          filePath === matchPath ||
          filePath.endsWith(`/${matchPath}`) ||
          matchPath.endsWith(`/${filePath}`)
        );
      });

      if (!matchingFile) {
        setNotification(
          `Could not find "${match.fileName}" in the selected codebase.`
        );
        return;
      }

      setActivePage("Dashboard");

      await handleViewSourceFile(
        selectedCodebase,
        matchingFile
      );
    } catch (error) {
      setNotification(
        error.message || "Failed to open source file."
      );
    } finally {
      setSourceFilesLoading(false);
    }
  };

  const handleAnalyzeCode = () => {
    if (!selectedSourceFile) {
      setNotification("Please select a source file first.");
      return;
    }

    setAnalysisLoading(true);

    const content = selectedSourceFile.content || "";
    const lines = content.split(/\r?\n/);

    const extension = (selectedSourceFile.path || "")
      .split(".")
      .pop()
      .toLowerCase();

    const languageByExtension = {
      js: "JavaScript",
      jsx: "React JSX",
      ts: "TypeScript",
      tsx: "React TypeScript",
      html: "HTML",
      css: "CSS",
      json: "JSON",
      py: "Python",
      java: "Java",
      c: "C",
      cpp: "C++",
      md: "Markdown",
    };

    const issues = [];

const checks = [
  {
    name: "Debugger statement",
    pattern: /\bdebugger\s*;?/,
    message: "Remove debugger statements before production.",
  },
  {
    name: "Console logging",
    pattern: /\bconsole\.log\s*\(/,
    message: "Review console.log statements before production.",
  },
  {
    name: "Loose equality",
    pattern: /(?<![=!])==(?!=)/,
    message: "Check whether === is more appropriate.",
  },
  {
    name: "Empty catch block",
    pattern: /catch\s*(?:\([^)]*\)\s*)?\{\s*\}/,
    message: "An empty catch block may hide errors.",
  },
  {
    name: "Potential hardcoded secret",
    pattern:
      /\b(?:api[_-]?key|secret|password|access[_-]?token)\b\s*[:=]\s*["'][^"']{8,}["']/i,
    message: "Review this value and move real secrets to environment variables.",
  },
];

lines.forEach((line, index) => {
  checks.forEach((check) => {
    if (check.pattern.test(line)) {
      issues.push({
        line: index + 1,
        name: check.name,
        message: check.message,
        code: line.trim(),
      });
    }
  });
});

setCodeAnalysis({
  fileName:
    selectedSourceFile.path ||
    selectedSourceFile.fileName ||
    "Unknown file",
  language:
    languageByExtension[extension] ||
    extension.toUpperCase() ||
    "Unknown",
  totalLines: lines.length,
  totalCharacters: content.length,
  emptyLines: lines.filter((line) => !line.trim()).length,
  issueCount: issues.length,
  issues,
  note:
    "Local static checks flag potentially problematic patterns. They do not guarantee that all bugs or security issues are detected.",
  result:
    `Code Analysis Report\n\n` +
    `• Lines: ${lines.length}\n` +
    `• Characters: ${content.length}\n` +
    `• Empty lines: ${lines.filter((line) => !line.trim()).length}\n` +
    `• Potential issues: ${issues.length}\n\n` +
    (issues.length
      ? issues
          .map(
            (issue) =>
              `Line ${issue.line}: ${issue.name}\n` +
              `${issue.message}\nCode: ${issue.code}`
          )
          .join("\n\n")
      : "No issues detected by the current checks."),
});

    setAnalysisLoading(false);
  };

  const handleSendChat = async (event) => {
    event.preventDefault();

    if (!selectedCodebase) {
      setNotification("Please select an uploaded codebase first.");
      return;
    }

    if (!chatQuestion.trim() || chatLoading) return;

    const question = chatQuestion.trim();

    setChatMessages((previous) => [
      ...previous,
      { role: "user", content: question },
    ]);

    setChatQuestion("");
    setChatLoading(true);

    try {
      const data = await apiRequest(
        `/api/project-chat/${selectedCodebase._id}`,
        {
          method: "POST",
          body: JSON.stringify({ question }),
        }
      );

      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer || "No answer was returned.",
          matches: data.matches || [],
        },
      ]);
    } catch (error) {
      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: error.message || "Failed to get an answer.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();

    if (!projectName.trim()) return;

    try {
      const newProject = await apiRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: projectName.trim(),
          description:
            projectDescription.trim() ||
            "Your new development project",
          technologies: ["React"],
          status: "Planning",
        }),
      });

      const createdProject = newProject.project || newProject;

      setProjects((previous) => [createdProject, ...previous]);
      setProjectName("");
      setProjectDescription("");
      setShowCreate(false);
      setActivePage("My Projects");
      setNotification("Project created successfully!");
    } catch (error) {
      setNotification(error.message || "Failed to create project.");
    }
  };

  const handleMenuClick = (label) => {
    setActivePage(label);
    setMobileMenu(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderProjectCards = () =>
    filteredProjects.length ? (
      <div className="project-grid">
        {filteredProjects.map((project, index) => (
          <article
            className={`project-card project-${project.color || "green"}`}
            key={project._id || project.id || project.name}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="project-card-top">
              <div className="project-symbol">
                <Code2 size={23} />
              </div>

              <span
                className={`project-status status-${(
                  project.status || "Planning"
                )
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                <span />
                {project.status || "Planning"}
              </span>
            </div>

            <h3>{project.name}</h3>

            <p className="project-description">
              {project.description}
            </p>

            <div className="technology-list">
              {(Array.isArray(project.technologies)
                ? project.technologies
                : []
              ).map((technology) => (
                <span key={technology}>{technology}</span>
              ))}
            </div>

            <div className="project-card-footer">
              <span>
                PROJECT /{" "}
                {String(project._id || project.id || "000")
                  .slice(-3)
                  .toUpperCase()}
              </span>

              <button
                aria-label={`View ${project.name}`}
                onClick={() =>
                  setNotification(`${project.name} selected.`)
                }
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <div className="no-projects">
        <Search size={26} />
        <h3>No matching projects</h3>
        <p>Try another search term.</p>
      </div>
    );

  return (
    <div className="devora-app">
      <div
        className="cursor-glow"
        style={{ left: cursor.x, top: cursor.y }}
      />

      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Command size={22} strokeWidth={2.5} />
          </div>

          <div className="brand-name">
            DEVORA<span>AI</span>
            <small>INTELLIGENCE PLATFORM</small>
          </div>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">D</div>

          <div className="workspace-info">
            <strong>My Workspace</strong>
            <span>Personal workspace</span>
          </div>

          <span className="online-indicator" />
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          {menuItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${
                activePage === label ? "nav-active" : ""
              }`}
              onClick={() => handleMenuClick(label)}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>

              {label === "AI Assistant" && (
                <span className="nav-new">AI</span>
              )}

              {activePage === label && (
                <span className="nav-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <p className="sidebar-label">DEVELOPER TOOLS</p>

        <button
          className="nav-item"
          onClick={() => handleMenuClick("Terminal")}
        >
          <Terminal size={19} strokeWidth={1.8} />
          <span>Terminal</span>
          <span className="tool-status">LIVE</span>
        </button>

        <button
          className="nav-item"
          onClick={() => handleMenuClick("System Status")}
        >
          <Activity size={19} strokeWidth={1.8} />
          <span>System Status</span>
          <span className="status-pulse" />
        </button>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <Zap size={20} />
            </div>

            <h4>Unlock your potential</h4>
            <p>Your next great idea starts here.</p>

            <button
              onClick={() => handleMenuClick("AI Assistant")}
            >
              Explore AI <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="profile-row">
            <div className="profile-avatar">A</div>

            <div className="profile-info">
              <strong>Developer</strong>
              <span>Free plan</span>
            </div>

            <button
              className="icon-button profile-settings"
              onClick={() => handleMenuClick("Settings")}
              aria-label="Open settings"
            >
              <Settings size={17} />
            </button>
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div className="page-breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="system-live">
              <span className="status-pulse" />
              ALL SYSTEMS NORMAL
            </div>

            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setNotification("You're all caught up!")}
            >
              <Bell size={18} />
              <span className="notification-dot" />
            </button>

            <div className="topbar-divider" />

            <div className="topbar-user">
              <div className="profile-avatar">A</div>
              <div>
                <strong>Developer</strong>
                <span>Personal account</span>
              </div>
            </div>
          </div>
        </header>

        {notification && (
          <div className="toast-message" role="status">
            <CheckCircle2 size={17} />
            {notification}
          </div>
        )}

        {activePage === "Dashboard" && (
          <>
            <section className="hero-section">
              <div className="hero-grid-pattern" />

              <div className="hero-content">
                <div className="hero-badge">
                  <span className="hero-badge-dot" />
                  YOUR AI-POWERED WORKSPACE
                  <Sparkles size={14} />
                </div>

                <h1>
                  Build beyond
                  <br />
                  the <span>ordinary.</span>
                </h1>

                <p>
                  Your ideas. Your code. Your intelligence.
                  <br className="desktop-break" />
                  One powerful space to bring everything together.
                </p>

                <div className="hero-actions">
                  <button
                    className="neon-button"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus size={18} />
                    Create a project
                    <ArrowUpRight size={16} />
                  </button>

                  <button
                    className="outline-button"
                    onClick={() => setActivePage("AI Assistant")}
                  >
                    <Bot size={18} />
                    Explore AI
                  </button>
                </div>

                <div className="hero-footnote">
                  <span className="hero-footnote-line" />
                  BUILT FOR THE NEXT GENERATION OF DEVELOPERS
                </div>
              </div>

              <div className="hero-visual">
                <div className="visual-ring ring-one" />
                <div className="visual-ring ring-two" />
                <div className="visual-ring ring-three" />

                <div className="visual-core">
                  <div className="core-icon">
                    <Cpu size={43} strokeWidth={1.3} />
                  </div>

                  <div className="core-spark spark-one">
                    <Sparkles size={18} />
                  </div>

                  <div className="core-spark spark-two">
                    <Zap size={19} />
                  </div>

                  <div className="core-spark spark-three">
                    <Code2 size={17} />
                  </div>
                </div>

                <div className="floating-chip chip-top">
                  <span className="chip-dot" />
                  AI ENGINE ACTIVE
                </div>

                <div className="floating-chip chip-bottom">
                  <Activity size={15} />
                  <span>System optimized</span>
                  <CheckCircle2 size={15} />
                </div>
              </div>

              <div className="hero-index">DV / 001</div>
            </section>

            <section className="stats-section">
              <div className="section-overline">
                <span>YOUR WORKSPACE</span>
                <span className="section-overline-line" />
                <span className="muted-overline">OVERVIEW / 01</span>
              </div>

              <div className="stats-grid">
                <div className="stat-card stat-card-green">
                  <div className="stat-top">
                    <div className="stat-icon">
                      <FolderKanban size={20} />
                    </div>
                    <span className="stat-tag">TOTAL</span>
                  </div>

                  <p>Total projects</p>

                  <div className="stat-number-row">
                    <h2>{String(projects.length).padStart(2, "0")}</h2>
                    <span className="stat-trend">
                      <ArrowUpRight size={14} /> WORKSPACE
                    </span>
                  </div>

                  <div className="stat-bottom-line">
                    <span style={{ width: "75%" }} />
                  </div>
                </div>

                <div className="stat-card stat-card-cyan">
                  <div className="stat-top">
                    <div className="stat-icon">
                      <Activity size={20} />
                    </div>
                    <span className="stat-tag">ACTIVE</span>
                  </div>

                  <p>In progress</p>

                  <div className="stat-number-row">
                    <h2>{String(inProgressCount).padStart(2, "0")}</h2>
                    <span className="stat-trend">
                      <ArrowUpRight size={14} /> BUILDING
                    </span>
                  </div>

                  <div className="stat-bottom-line">
                    <span style={{ width: "48%" }} />
                  </div>
                </div>

                <div className="stat-card stat-card-purple">
                  <div className="stat-top">
                    <div className="stat-icon">
                      <CheckCircle2 size={20} />
                    </div>
                    <span className="stat-tag">SHIPPED</span>
                  </div>

                  <p>Completed</p>

                  <div className="stat-number-row">
                    <h2>{String(completedCount).padStart(2, "0")}</h2>
                    <span className="stat-trend">
                      <ArrowUpRight size={14} /> COMPLETE
                    </span>
                  </div>

                  <div className="stat-bottom-line">
                    <span style={{ width: "58%" }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="projects-section">
              <div className="projects-heading">
                <div>
                  <div className="section-overline">
                    <span>PROJECT DIRECTORY</span>
                  </div>
                  <h2>Recent <span>projects.</span></h2>
                  <p>Your ideas, organized and ready to evolve.</p>
                </div>

                <div className="project-heading-actions">
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search projects..."
                    />
                    <span className="search-shortcut">/</span>
                  </label>

                  <button
                    className="neon-button small-neon-button"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus size={17} />
                    New project
                  </button>
                </div>
              </div>

              {renderProjectCards()}
            </section>

            <section className="projects-section">
              <div className="projects-heading">
                <div>
                  <div className="section-overline">
                    <span>CODEBASE DIRECTORY</span>
                  </div>
                  <h2>Uploaded <span>codebases.</span></h2>
                  <p>Your uploaded source code, ready to explore.</p>
                </div>
              </div>

              {codebasesLoading ? (
                <p>Loading codebases...</p>
              ) : codebasesError ? (
                <p>{codebasesError}</p>
              ) : codebases.length === 0 ? (
                <p>No codebases uploaded yet.</p>
              ) : (
                <div className="project-grid">
                  {codebases.map((codebase) => (
                    <article
                      className="project-card project-cyan"
                      key={codebase._id}
                      onClick={() => handleViewCodebase(codebase)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="project-card-top">
                        <div className="project-symbol">
                          <Code2 size={23} />
                        </div>
                        <span className="project-status">
                          <span />
                          {codebase.status}
                        </span>
                      </div>

                      <h3>{codebase.name}</h3>

                      <p className="project-description">
                        {codebase.originalFileName}
                      </p>

                      <div className="technology-list">
                        <span>{codebase.fileCount ?? 0} files</span>
                      </div>

                      <div className="project-card-footer">
                        <span>UPLOADED CODEBASE</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {selectedCodebase && (
              <section className="projects-section">
                <div className="projects-heading">
                  <div>
                    <div className="section-overline">
                      <span>SOURCE EXPLORER</span>
                    </div>
                    <h2>
                      {selectedCodebase.name} <span>files.</span>
                    </h2>
                  </div>

                  <button
                    className="neon-button small-neon-button"
                    onClick={() => {
                      setSelectedCodebase(null);
                      setSourceFiles([]);
                      setSelectedSourceFile(null);
                      setCodeAnalysis(null);
                    }}
                  >
                    Close
                  </button>
                </div>

                {sourceFilesLoading ? (
                  <p>Loading source files...</p>
                ) : sourceFiles.length > 0 ? (
                  <div className="project-grid">
                    {sourceFiles.map((file) => (
                      <article
                        className="project-card project-cyan"
                        key={file._id}
                        onClick={() =>
                          handleViewSourceFile(selectedCodebase, file)
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <div className="project-symbol">
                          <Code2 size={23} />
                        </div>
                        <h3>{file.path}</h3>
                        <p className="project-description">
                          {file.extension || "Source file"}
                        </p>
                        <span>Click to view source code →</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No source files found.</p>
                )}
              </section>
            )}

            {selectedSourceFile && (
              <section className="projects-section">
                <div className="projects-heading">
                  <div>
                    <div className="section-overline">
                      <span>SOURCE CODE</span>
                    </div>
                    <h2>
                      {selectedSourceFile.path ||
                        selectedSourceFile.fileName}
                    </h2>
                  </div>

                  <button
                    className="neon-button small-neon-button"
                    onClick={() => setSelectedSourceFile(null)}
                  >
                    Close
                  </button>
                </div>

                <button
                  className="neon-button"
                  onClick={handleAnalyzeCode}
                  disabled={analysisLoading || sourceContentLoading}
                >
                  {analysisLoading ? "Analyzing..." : "Analyze Code"}
                </button>

                {sourceContentLoading ? (
                  <p>Loading source code...</p>
                ) : (
                  <pre
                    style={{
                      overflowX: "auto",
                      maxHeight: "500px",
                      overflowY: "auto",
                      padding: "16px",
                      borderRadius: "8px",
                      background: "#101820",
                      color: "#dfff00",
                      whiteSpace: "pre",
                      fontSize: "13px",
                      lineHeight: "1.6",
                    }}
                  >
                    <code>{selectedSourceFile.content || ""}</code>
                  </pre>
                )}

                {codeAnalysis && (
                  <div
                    className="project-card project-cyan"
                    style={{ marginTop: "20px", padding: "20px" }}
                  >
                    <h3>🤖 Devora AI Analysis</h3>
                    <p><strong>File:</strong> {codeAnalysis.fileName}</p>
                    <p><strong>Language:</strong> {codeAnalysis.language}</p>
                    <p><strong>Total lines:</strong> {codeAnalysis.totalLines}</p>
                    <p><strong>Characters:</strong> {codeAnalysis.totalCharacters}</p>
                    <p><strong>Empty lines:</strong> {codeAnalysis.emptyLines}</p>

                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        lineHeight: "1.7",
                        fontSize: "14px",
                      }}
                    >
                      {codeAnalysis.result}
                    </pre>

                    <p>{codeAnalysis.note}</p>
                  </div>
                )}
              </section>
            )}

            <section className="bottom-banner">
              <div className="bottom-banner-icon">
                <Bot size={25} />
              </div>

              <div>
                <span>MEET YOUR DEVELOPMENT COMPANION</span>
                <h3>Have an idea? Let's make it happen.</h3>
                <p>Explore the possibilities with your AI workspace.</p>
              </div>

              <button onClick={() => setActivePage("AI Assistant")}>
                Discover Devora AI <ArrowUpRight size={17} />
              </button>
            </section>
          </>
        )}

        {activePage === "My Projects" && (
          <section className="inner-page">
            <div className="inner-page-heading">
              <div className="section-overline">
                <span>PROJECT DIRECTORY</span>
              </div>
              <h1>Your work. <span>Your world.</span></h1>
              <p>Manage your development projects in one place.</p>
            </div>

            <div className="inner-toolbar">
              <label className="search-box">
                <Search size={17} />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search projects..."
                />
              </label>

              <button
                className="neon-button"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={18} /> New project
              </button>
            </div>

            {renderProjectCards()}
          </section>
        )}

        {activePage === "AI Assistant" && (
          <section className="inner-page">
            <div className="inner-page-heading">
              <div className="section-overline">
                <span>DEVORA INTELLIGENCE</span>
              </div>
              <h1>Ask your <span>codebase.</span></h1>
              <p>
                Ask questions about your uploaded source code and find
                relevant files.
              </p>
            </div>

            <div className="settings-card">
              <div className="settings-card-icon">
                <Code2 size={23} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>Select a codebase</h3>
                <p>Choose the uploaded project you want Devora to investigate.</p>

                <select
                  className="form-input"
                  value={selectedCodebase?._id || ""}
                  onChange={(event) => {
                    const codebase = codebases.find(
                      (item) => item._id === event.target.value
                    );

                    setSelectedCodebase(codebase || null);
                    setSelectedSourceFile(null);
                    setCodeAnalysis(null);
                    setChatMessages([]);
                  }}
                >
                  <option value="">Choose an uploaded project</option>
                  {codebases.map((codebase) => (
                    <option key={codebase._id} value={codebase._id}>
                      {codebase.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className="settings-card"
              style={{ display: "block", marginTop: "24px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <Bot size={25} />
                <div>
                  <h3>Project Chat</h3>
                  <p>Ask a question about your selected codebase.</p>
                </div>
              </div>

              <div
                aria-live="polite"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                {chatMessages.length === 0 && (
                  <p>
                    {selectedCodebase
                      ? "Try asking: Where is the HTML page structure defined?"
                      : "Select a codebase above to start chatting."}
                  </p>
                )}

                {chatMessages.map((message, index) => (
                  <div
                    key={`${index}-${message.role}`}
                    style={{
                      padding: "16px",
                      borderRadius: "10px",
                      background:
                        message.role === "user" ? "#202b32" : "#111a20",
                      overflowWrap: "anywhere",
                    }}
                  >
                    <strong>
                      {message.role === "user" ? "You" : "Devora AI"}
                    </strong>

                    <p
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.7",
                        marginTop: "8px",
                        fontSize: "16px",
                      }}
                    >
                      {message.content}
                    </p>

                    {message.matches?.length > 0 && (
                      <div style={{ marginTop: "20px" }}>
                        <h3
                          style={{
                            fontSize: "20px",
                            marginBottom: "12px",
                            color: "#dfe7ef",
                          }}
                        >
                          Relevant Code
                        </h3>

                        {message.matches.slice(0, 3).map((match, matchIndex) => (
                          <div
                            key={`${match.fileName}-${match.lineNumber}-${matchIndex}`}
                            onClick={() => handleOpenRelevantCode(match)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (
                                event.key === "Enter" ||
                                event.key === " "
                              ) {
                                event.preventDefault();
                                handleOpenRelevantCode(match);
                              }
                            }}
                            style={{
                              marginTop: "12px",
                              border: "1px solid #303d49",
                              borderRadius: "10px",
                              overflow: "hidden",
                              background: "#111922",
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                padding: "14px 16px",
                                background: "#1b2733",
                                borderBottom: "1px solid #303d49",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "14px",
                                  color: "#aebdca",
                                  marginBottom: "6px",
                                }}
                              >
                                FILE
                              </div>

                              <div
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "600",
                                  color: "#f1f5f9",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                📄 {match.fileName}
                              </div>

                              <div
                                style={{
                                  display: "inline-block",
                                  marginTop: "9px",
                                  padding: "6px 10px",
                                  borderRadius: "5px",
                                  background: "#263b30",
                                  color: "#9be7b0",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                }}
                              >
                                Line {match.lineNumber}
                              </div>
                            </div>

                            <div style={{ padding: "14px 16px" }}>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: "700",
                                  color: "#9baabb",
                                  marginBottom: "10px",
                                }}
                              >
                                CODE PREVIEW
                              </div>

                              <pre
                                style={{
                                  margin: 0,
                                  padding: "14px",
                                  borderRadius: "7px",
                                  background: "#080d12",
                                  color: "#d5e6f7",
                                  fontSize: "15px",
                                  lineHeight: "1.8",
                                  fontFamily:
                                    "'Consolas', 'Courier New', monospace",
                                  whiteSpace: "pre-wrap",
                                  overflowWrap: "anywhere",
                                  overflowX: "auto",
                                }}
                              >
                                {match.code?.trim() || "(Empty line)"}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {chatLoading && (
                  <p role="status">Devora is examining your code...</p>
                )}
              </div>

              <form
                onSubmit={handleSendChat}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <input
                  className="form-input"
                  style={{ flex: "1 1 240px", minWidth: 0 }}
                  value={chatQuestion}
                  onChange={(event) => setChatQuestion(event.target.value)}
                  placeholder="Ask about your code..."
                  disabled={!selectedCodebase || chatLoading}
                  aria-label="Ask a question about your codebase"
                />

                <button
                  type="submit"
                  className="neon-button"
                  disabled={
                    !selectedCodebase ||
                    !chatQuestion.trim() ||
                    chatLoading
                  }
                >
                  {chatLoading ? "Thinking..." : "Ask Devora"}
                </button>
              </form>
            </div>
          </section>
        )}

        {activePage === "Settings" && (
          <section className="inner-page settings-page">
            <div className="section-overline">
              <span>WORKSPACE PREFERENCES</span>
            </div>

            <h1>Workspace <span>settings.</span></h1>
            <p>Manage your Devora AI workspace preferences.</p>

            <div className="settings-card">
              <div className="settings-card-icon">
                <Settings size={23} />
              </div>

              <div>
                <h3>Personal workspace</h3>
                <p>Manage your current development workspace.</p>
                <span className="settings-value">My Workspace</span>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-icon cyan-icon">
                <Activity size={23} />
              </div>

              <div>
                <h3>System status</h3>
                <p>Frontend interface is running.</p>
                <span className="settings-value settings-online">
                  <span className="status-pulse" /> Operational
                </span>
              </div>
            </div>

            <div className="feature-note">
              Account details and preferences will be connected to your
              backend in a later integration step.
            </div>
          </section>
        )}

        {(activePage === "Terminal" ||
          activePage === "System Status") && (
          <section className="feature-page">
            <div className="feature-orb">
              <div className="feature-orb-ring">
                {activePage === "Terminal" ? (
                  <Terminal size={55} />
                ) : (
                  <Activity size={55} />
                )}
              </div>
            </div>

            <div className="section-overline">
              <span>DEVELOPER TOOLS</span>
            </div>

            <h1>
              {activePage === "Terminal" ? (
                <>Your command <span>center.</span></>
              ) : (
                <>Everything is <span>in sync.</span></>
              )}
            </h1>

            <p className="feature-description">
              {activePage === "Terminal"
                ? "A dedicated terminal experience can be integrated here."
                : "Your Devora AI interface is running and ready for further integration."}
            </p>

            <div className="feature-status">
              <span className="status-pulse" />
              INTERFACE OPERATIONAL
            </div>
          </section>
        )}

        <footer className="app-footer">
          <div>
            <span className="footer-brand">
              DEVORA<span>AI</span>
            </span>
            <span>© 2026 Devora Intelligence</span>
          </div>

          <div className="footer-right">
            <span>
              <span className="status-pulse" /> ALL SYSTEMS NORMAL
            </span>
            <span>DESIGNED TO BUILD WHAT'S NEXT.</span>
          </div>
        </footer>
      </main>

      {showCreate && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreate(false);
            }
          }}
        >
          <form className="create-modal" onSubmit={handleCreateProject}>
            <button
              type="button"
              className="modal-close icon-button"
              onClick={() => setShowCreate(false)}
              aria-label="Close dialog"
            >
              <X size={19} />
            </button>

            <div className="modal-icon">
              <Plus size={24} />
            </div>

            <div className="section-overline">
              <span>NEW WORKSPACE ITEM</span>
            </div>

            <h2>Create a project<span>.</span></h2>
            <p className="modal-description">
              Give your next idea a name and a place to grow.
            </p>

            <label className="form-label" htmlFor="project-name">
              Project name
            </label>

            <input
              id="project-name"
              className="form-input"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="e.g. My next big idea"
              autoFocus
              required
              maxLength={80}
            />

            <label className="form-label" htmlFor="project-description">
              Description <span>OPTIONAL</span>
            </label>

            <textarea
              id="project-description"
              className="form-input form-textarea"
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              placeholder="What are you building?"
              rows={3}
              maxLength={300}
            />

            <button
              type="submit"
              className="neon-button modal-submit"
            >
              <Plus size={18} /> Create project
            </button>

            <p className="modal-disclaimer">
              SAVED TO YOUR DATABASE WHEN THE API REQUEST SUCCEEDS
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;