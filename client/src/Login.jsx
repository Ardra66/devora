import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  User,
  Code2,
  Sparkles,
  FolderGit2,
  Activity,
  Terminal,
} from "lucide-react";

import { apiRequest } from "./api";
import DevoraLogo from "./DevoraLogo";
import AISculpture from "./AISculpture";

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister
        ? "/api/auth/register"
        : "/api/auth/login";

      const body = isRegister
        ? {
            name,
            email: email.trim().toLowerCase(),
            password,
          }
        : {
            email: email.trim().toLowerCase(),
            password,
          };

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!data.token) {
        throw new Error("Authentication token was not received.");
      }

      localStorage.setItem("devoraToken", data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* BACKGROUND ATMOSPHERE */}

      <div className="auth-background-glow" />
      <div className="auth-background-grid" />
      <div className="auth-noise" />

      {/* NAVIGATION */}

      <nav className="auth-nav">

        <div className="auth-brand">
          <DevoraLogo />
          <span className="auth-brand-caption">
            INTELLIGENT DEVELOPMENT
          </span>
        </div>

        <div className="auth-nav-right">
          <span className="auth-status-dot" />
          AI SYSTEM ONLINE
          <span className="auth-nav-divider" />
          VERSION 1.0
        </div>

      </nav>

      {/* MAIN EXPERIENCE */}

      <main className="auth-layout">

        {/* LEFT SHOWCASE */}

        <section className="auth-showcase">

          <div className="auth-content">

            <motion.div
              className="auth-label"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="auth-label-line" />
              THE INTELLIGENCE LAYER FOR DEVELOPERS
            </motion.div>

            <motion.div
              className="auth-hero-text"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15 }}
            >
              <h1>
                Build with
                <br />
                <span>intelligence.</span>
              </h1>

              <p className="auth-description">
                Your projects, codebase and AI-powered
                development tools. Everything connected
                in one intelligent workspace.
              </p>
            </motion.div>

            {/* FEATURE INDICATORS */}

            <motion.div
              className="auth-feature-list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
            >
              <div>
                <Code2 size={15} />
                <span>CODE INTELLIGENCE</span>
              </div>

              <div>
                <FolderGit2 size={15} />
                <span>PROJECT WORKSPACE</span>
              </div>

              <div>
                <Sparkles size={15} />
                <span>AI ASSISTANCE</span>
              </div>
            </motion.div>

            {/* MAIN VISUAL */}

            <div className="auth-visual">

              <AISculpture />

              {/* FLOATING CODE CARD */}

              <motion.div
                className="auth-floating-card auth-code-card"
                animate={{ y: [0, -9, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="floating-card-heading">
                  <Terminal size={14} />
                  <span>CODE ANALYSIS</span>
                  <span className="floating-live-dot" />
                </div>

                <div className="floating-code-lines">
                  <span><i>01</i> const project = Devora;</span>
                  <span><i>02</i> await analyze(code);</span>
                  <span><i>03</i> return intelligence;</span>
                </div>
              </motion.div>

              {/* FLOATING AI CARD */}

              <motion.div
                className="auth-floating-card auth-ai-card"
                animate={{ y: [0, 8, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="floating-ai-icon">
                  <Sparkles size={17} />
                </div>

                <div>
                  <strong>AI Intelligence</strong>
                  <span>Ready to assist</span>
                </div>

                <Activity size={17} className="floating-activity" />
              </motion.div>

            </div>

            {/* SHOWCASE FOOTER */}

            <div className="auth-showcase-footer">
              <span>ONE WORKSPACE. LIMITLESS POSSIBILITIES.</span>
              <span>DEVORA AI / 2026</span>
            </div>

          </div>

        </section>

        {/* RIGHT AUTHENTICATION */}

        <section className="auth-form-section">

          <motion.div
            className="auth-form-wrapper"
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >

            <div className="auth-form-topline">
              <span className="auth-form-indicator" />
              SECURE ACCESS
            </div>

            <div className="auth-form-heading">

              <AnimatePresence mode="wait">

                <motion.div
                  key={isRegister ? "register" : "login"}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >

                  <span className="auth-overline">
                    {isRegister
                      ? "START YOUR JOURNEY"
                      : "WELCOME TO DEVORA"}
                  </span>

                  <h2>
                    {isRegister ? (
                      <>
                        Create your
                        <br />
                        <span>workspace.</span>
                      </>
                    ) : (
                      <>
                        Think bigger.
                        <br />
                        <span>Start here.</span>
                      </>
                    )}
                  </h2>

                  <p>
                    {isRegister
                      ? "Create your account and bring your development workflow together."
                      : "Sign in to continue building something extraordinary."}
                  </p>

                </motion.div>

              </AnimatePresence>

            </div>

            {/* AUTHENTICATION FORM */}

            <form className="auth-form" onSubmit={handleSubmit}>

              {isRegister && (
                <div className="auth-field">
                  <label htmlFor="name">FULL NAME</label>

                  <div className="auth-input">
                    <User size={17} />

                    <input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="email">EMAIL ADDRESS</label>

                <div className="auth-input">
                  <Mail size={17} />

                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="password">PASSWORD</label>

                <div className="auth-input">
                  <Lock size={17} />

                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "Please wait..."
                    : isRegister
                    ? "Create account"
                    : "Enter Devora"}
                </span>

                {!loading && <ArrowRight size={19} />}
              </button>

            </form>

            {/* LOGIN / REGISTER SWITCH */}

            <div className="auth-switch">
              {isRegister
                ? "Already have an account?"
                : "New to Devora?"}

              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
              >
                {isRegister ? "Sign in" : "Create account"}
              </button>
            </div>

            {/* SECURITY */}

            <div className="auth-security">
              <ShieldCheck size={16} />

              <span>
                YOUR CODE. YOUR PROJECTS. YOUR CONTROL.
              </span>
            </div>

          </motion.div>

        </section>

      </main>

    </div>
  );
}