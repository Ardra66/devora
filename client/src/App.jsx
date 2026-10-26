import { apiRequest } from "./api";
import Login from "./Login";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
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

function App() {
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


  // Fetch existing projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await apiRequest("/api/projects");

        console.log("API response:", data);
        console.log("Projects received:", data.projects);

        const fetchedProjects = Array.isArray(data)
          ? data
          : data.projects || [];

        setProjects(fetchedProjects);
      } catch (error) {
        console.error("Failed to fetch projects:", error.message);
      }
    };

    if (localStorage.getItem("devoraToken")) {
      fetchProjects();
    }
  }, []);

  // Fetch uploaded codebases
  useEffect(() => {
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

    if (localStorage.getItem("devoraToken")) {
      fetchCodebases();
    } else {
      setCodebasesLoading(false);
    }
  }, []);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const inProgressCount = projects.filter(
    (project) => project.status === "In Progress"
  ).length;

  const completedCount = projects.filter(
    (project) => project.status === "Completed"
  ).length;

const handleCreateProject = async (event) => {
  event.preventDefault();

  if (!projectName.trim()) return;

  try {
    const newProject = await apiRequest("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: projectName.trim(),
        description:
          projectDescription.trim() || "Your new development project",
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

  window.setTimeout(() => setNotification(""), 3000);
};



  const handleMenuClick = (label) => {
    setActivePage(label);
    setMobileMenu(false);
  };

  if (!isLoggedIn) {
  return <Login onLogin={() => setIsLoggedIn(true)} />;
}

  return (
    <div className="devora-app">
      <div
        className="cursor-glow"
        style={{
          left: cursor.x,
          top: cursor.y,
        }}
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
          onClick={() => {
            setActivePage("Terminal");
            setMobileMenu(false);
          }}
        >
          <Terminal size={19} strokeWidth={1.8} />
          <span>Terminal</span>
          <span className="tool-status">LIVE</span>
        </button>

        <button
          className="nav-item"
          onClick={() => {
            setActivePage("System Status");
            setMobileMenu(false);
          }}
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
            <button onClick={() => setActivePage("AI Assistant")}>
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
              onClick={() => setActivePage("Settings")}
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
              onClick={() => {
                setNotification("You're all caught up!");
                window.setTimeout(() => setNotification(""), 3000);
              }}
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
          <div className="toast-message">
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
                  <h2>
                    Recent <span>projects.</span>
                  </h2>
                  <p>Your ideas, organized and ready to evolve.</p>
                </div>

                <div className="project-heading-actions">
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
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

              {filteredProjects.length > 0 ? (
                <div className="project-grid">
                  {filteredProjects.map((project, index) => (
                    <article
                      className={`project-card project-${project.color}`}
                     key={project._id || project.id}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="project-card-top">
                        <div className="project-symbol">
                          {project.color === "cyan" ? (
                            <Code2 size={23} />
                          ) : project.color === "purple" ? (
                            <Sparkles size={23} />
                          ) : (
                            <Terminal size={23} />
                          )}
                        </div>
                        <span
                          className={`project-status status-${project.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          <span />
                          {project.status}
                        </span>
                      </div>

                      <h3>{project.name}</h3>
                      <p className="project-description">
                        {project.description}
                      </p>

                      <div className="technology-list">
                        {project.technologies.map((technology) => (
                          <span key={technology}>{technology}</span>
                        ))}
                      </div>

                      <div className="project-card-footer">
                        <span>PROJECT / {String(project.id).padStart(3, "0")}</span>
                        <button
                          aria-label={`View ${project.name}`}
                          onClick={() => {
                            setNotification(
                              `${project.name} selected in this preview.`
                            );
                            window.setTimeout(() => setNotification(""), 3000);
                          }}
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
              )}
            </section>

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
              <h1>
                Your work. <span>Your world.</span>
              </h1>
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

            <div className="project-grid">
              {filteredProjects.map((project) => (
                <article
                  className={`project-card project-${project.color}`}
                  key={project._id || project.id}
                >
                  <div className="project-card-top">
                    <div className="project-symbol">
                      <Code2 size={23} />
                    </div>
                    <span
                      className={`project-status status-${project.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      <span />
                      {project.status}
                    </span>
                  </div>
                  <h3>{project.name}</h3>
                  <p className="project-description">{project.description}</p>
                  <div className="technology-list">
                    {project.technologies.map((technology) => (
                      <span key={technology}>{technology}</span>
                    ))}
                  </div>
                  <div className="project-card-footer">
                    <span>PROJECT / {String(project.id).padStart(3, "0")}</span>
                    <button
                      onClick={() => {
                        setNotification(`${project.name} selected.`);
                        window.setTimeout(() => setNotification(""), 3000);
                      }}
                      aria-label={`View ${project.name}`}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activePage === "AI Assistant" && (
          <section className="feature-page">
            <div className="feature-orb">
              <div className="feature-orb-ring">
                <Bot size={60} />
              </div>
              <Sparkles className="feature-sparkle" size={27} />
            </div>
            <div className="section-overline">
              <span>DEVORA INTELLIGENCE</span>
            </div>
            <h1>
              Meet your <span>AI companion.</span>
            </h1>
            <p className="feature-description">
              A smarter development workspace starts with the right tools.
              Your AI assistant interface is ready for its next integration.
            </p>
            <div className="feature-status">
              <span className="status-pulse" />
              AI WORKSPACE INTERFACE READY
            </div>
            <div className="feature-note">
              <CircleHelp size={18} />
              <span>
                AI responses require a configured AI provider and backend
                integration. This screen is currently a frontend preview.
              </span>
            </div>
          </section>
        )}

        {activePage === "Settings" && (
          <section className="inner-page settings-page">
            <div className="section-overline">
              <span>WORKSPACE PREFERENCES</span>
            </div>
            <h1>
              Workspace <span>settings.</span>
            </h1>
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
              Account details and preferences will be connected to your backend
              in a later integration step.
            </div>
          </section>
        )}

        {(activePage === "Terminal" || activePage === "System Status") && (
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
                <>
                  Your command <span>center.</span>
                </>
              ) : (
                <>
                  Everything is <span>in sync.</span>
                </>
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
            <span className="footer-brand">DEVORA<span>AI</span></span>
            <span>© 2026 Devora Intelligence</span>
          </div>
          <div className="footer-right">
            <span><span className="status-pulse" /> ALL SYSTEMS NORMAL</span>
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

            <button type="submit" className="neon-button modal-submit">
              <Plus size={18} /> Create project
            </button>
            <p className="modal-disclaimer">
              PREVIEW ONLY · NOT YET SAVED TO YOUR DATABASE
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;

