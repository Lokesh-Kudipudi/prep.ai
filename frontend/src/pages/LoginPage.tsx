import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckSquare, BookOpen, GraduationCap, Sparkles } from "lucide-react";

import { loginUser } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

const loginSchema = z.object({
  email: z.string().min(1, "Email address is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Retrieve redirect target from router state (defaults to /dashboard)
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setApiError(null);
    setIsLoading(true);

    try {
      const response = await loginUser({
        email: data.email,
        password: data.password,
      });
      await login(response.access_token);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("[LoginPage] submit error", err);
      const detail = err.response?.data?.detail || "Invalid email or password. Please try again.";
      setApiError(detail);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col md:grid md:grid-cols-12 md:gap-8 items-center py-12 px-2 max-w-[1120px] mx-auto">
      {/* Left Column: Brand Marketing highlights (Visible on md+) */}
      <div className="hidden md:flex md:col-span-5 flex-col space-y-6 pr-4">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-primary-soft text-primary-hover rounded-full font-semibold text-xs w-fit">
            <Sparkles size={12} />
            <span>prep.ai workspace</span>
          </div>
          <h2 className="text-display font-extrabold text-text tracking-tight text-[36px] leading-tight">
            Welcome back to prep.ai.
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Sign in to continue reviewing source documents, running attempts, and studying recall cards.
          </p>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex gap-3">
            <CheckSquare className="text-primary mt-1 shrink-0" size={18} />
            <div>
              <h4 className="text-sm font-bold text-text">Pillar 1: Interactive Quizzes</h4>
              <p className="text-xs text-text-muted mt-0.5">MCQs generated with explanation reasoning to test knowledge retention.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <BookOpen className="text-sky mt-1 shrink-0" size={18} />
            <div>
              <h4 className="text-sm font-bold text-text">Pillar 2: Active Recall Decks</h4>
              <p className="text-xs text-text-muted mt-0.5">Spaced-repetition cards utilizing existing cards to prevent concept duplicates.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <GraduationCap className="text-success mt-1 shrink-0" size={18} />
            <div>
              <h4 className="text-sm font-bold text-text">Pillar 3: stateful tutoring</h4>
              <p className="text-xs text-text-muted mt-0.5">Sandboxed execution sandbox environments with full LLM feedback review cycles.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Login Form Card */}
      <div className="col-span-12 md:col-span-7 flex justify-center w-full">
        <Card className="w-full max-w-[460px] space-y-6">
          <div className="text-center md:text-left">
            <h1 className="text-h2 font-extrabold text-text">Log in</h1>
            <p className="text-xs text-text-muted mt-1">
              Sign in to manage your active-learning Boards
            </p>
          </div>

          {apiError && (
            <div className="bg-danger-soft border border-danger/20 rounded-md p-3 text-xs text-danger-text font-semibold">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              disabled={isLoading}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              disabled={isLoading}
              {...register("password")}
            />

            <Button
              type="submit"
              className="w-full pt-1"
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
    </div>
  );
}
