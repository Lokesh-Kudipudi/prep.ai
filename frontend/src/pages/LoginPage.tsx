import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { loginUser } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Retrieve redirect target from router state (defaults to /dashboard)
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await loginUser({ email, password });
      await login(response.access_token);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("[LoginPage] login error", err);
      const detail = err.response?.data?.detail || "Authentication failed. Try again.";
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 px-6">
      <Card className="w-full max-w-[400px] space-y-6">
        <div className="text-center">
          <h1 className="text-h2 font-extrabold text-text">Welcome back</h1>
          <p className="text-xs text-text-muted mt-1">
            Log in to manage your active-learning Boards
          </p>
        </div>

        {error && (
          <div className="bg-danger-soft border border-danger/20 rounded-md p-3 text-xs text-danger-text font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          <Button
            type="submit"
            className="w-full"
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Log in"}
          </Button>
        </form>

        <div className="text-center text-xs text-text-muted border-t border-border pt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Create account
          </Link>
        </div>
      </Card>
    </div>
  );
}
