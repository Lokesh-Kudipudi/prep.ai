import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
// Pages
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EvaluationPage } from "./pages/EvaluationPage";
import { SettingsPage } from "./pages/SettingsPage";
import { BoardLayout } from "./pages/board/BoardLayout";
import { SourcesTab } from "./pages/board/SourcesTab";
import { QuizTab } from "./pages/board/QuizTab";
import { FlashcardsTab } from "./pages/board/FlashcardsTab";
import { TutorTab } from "./pages/board/TutorTab";

export function App() {
  return (
    <AppShell>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/boards/:boardId" element={<BoardLayout />}>
            <Route index element={<Navigate to="sources" replace />} />
            <Route path="sources" element={<SourcesTab />} />
            <Route path="quiz" element={<QuizTab />} />
            <Route path="flashcards" element={<FlashcardsTab />} />
            <Route path="tutor" element={<TutorTab />} />
          </Route>
          <Route path="/evaluation" element={<EvaluationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
