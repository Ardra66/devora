import { useState } from "react";
import { apiRequest } from "./api";
import { Sparkles, Mail, Lock } from "lucide-react";

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
        ? { name, email, password }
        : { email, password };
console.log("Login email:", email);
console.log("Password entered:", Boolean(password));

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!data.token) {
        throw new Error("The server did not return a login token.");
      }

      localStorage.setItem("devoraToken", data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <Sparkles size={28} />
          <span>
            DEVORA<span className="login-accent"> AI</span>
          </span>
        </div>

        <p className="login-eyebrow">DEVELOPER INTELLIGENCE PLATFORM</p>

        <h1>{isRegister ? "Create your account." : "Welcome back."}</h1>

        <p className="login-subtitle">
          {isRegister
            ? "Join Devora and start building something extraordinary."
            : "Sign in to continue building something extraordinary."}
        </p>

        {isRegister && (
          <>
            <label htmlFor="register-name">Full name</label>
            <div className="login-input">
              <input
                id="register-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </div>
          </>
        )}

        <label htmlFor="login-email">Email address</label>
        <div className="login-input">
          <Mail size={18} />
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <label htmlFor="login-password">Password</label>
        <div className="login-input">
          <Lock size={18} />
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        </div>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button className="login-submit" type="submit" disabled={loading}>
          {loading
            ? isRegister
              ? "Creating account..."
              : "Signing in..."
            : isRegister
              ? "Create account"
              : "Sign in to Devora"}
        </button>

        <p className="login-footer">
          {isRegister
            ? "Already have an account? "
            : "Don't have an account? "}

         <button
  type="button"
style={{
  background: "rgba(190, 255, 80, 0.04)",
  color: "#c6ff70",
  border: "1px solid rgba(190, 255, 80, 0.45)",
  borderRadius: "5px",
  padding: "4px 9px",
  marginLeft: "5px",
  fontSize: "11px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
}}
onMouseEnter={(e) => {
  e.currentTarget.style.background = "rgba(190, 255, 80, 0.12)";
  e.currentTarget.style.borderColor = "#c6ff70";
  e.currentTarget.style.boxShadow =
    "0 0 6px #c6ff70, 0 0 14px rgba(190, 255, 80, 0.5)";
  e.currentTarget.style.textShadow = "0 0 7px #c6ff70";
}}
onMouseLeave={(e) => {
  e.currentTarget.style.background = "rgba(190, 255, 80, 0.04)";
  e.currentTarget.style.borderColor = "rgba(190, 255, 80, 0.45)";
  e.currentTarget.style.boxShadow = "none";
  e.currentTarget.style.textShadow = "none";
}}
  onClick={() => {
    setIsRegister(!isRegister);
    setError("");
  }}
>
  {isRegister ? "Sign in" : "Create account"}
</button>
        </p>
      </form>
    </main>
  );
}