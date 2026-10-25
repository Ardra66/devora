
import { useState } from "react";
import { apiRequest } from "./api";
import { Sparkles, Mail, Lock } from "lucide-react";

export default function Login({ onLogin }) {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

const handleLogin = async (event) => {
event.preventDefault();
setError("");
setLoading(true);

try {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!data.token) {
    throw new Error("The server did not return a login token.");
  }

  localStorage.setItem("devoraToken", data.token);
  onLogin(data.user);
} catch (err) {
  setError(err.message || "Login failed. Please try again.");
} finally {
  setLoading(false);
}


};

return ( <main className="login-screen"> <form className="login-card" onSubmit={handleLogin}> <div className="login-logo"> <Sparkles size={28} /> <span>DEVORA<span className="login-accent"> AI</span></span> </div>


    <p className="login-eyebrow">DEVELOPER INTELLIGENCE PLATFORM</p>
    <h1>Welcome back.</h1>
    <p className="login-subtitle">
      Sign in to continue building something extraordinary.
    </p>

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
        autoComplete="current-password"
        required
      />
    </div>

    {error && <p className="login-error" role="alert">{error}</p>}

    <button className="login-submit" type="submit" disabled={loading}>
      {loading ? "Signing in..." : "Sign in to Devora"}
    </button>

    <p className="login-footer">
      Your workspace. Your projects. Your progress.
    </p>
  </form>
</main>


);
}
