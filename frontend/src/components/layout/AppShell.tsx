import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

type AppShellProps = {
  children?: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { label: "Boards", path: "/dashboard" },
    { label: "Evaluation", path: "/evaluation" },
    { label: "Settings", path: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border h-[64px] flex items-center shadow-sm">
        <div className="w-full max-w-[1120px] mx-auto px-6 flex justify-between items-center">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-[26px] h-[26px] bg-primary flex items-center justify-center rounded-[8px] text-on-primary font-extrabold text-sm select-none">
              P
            </div>
            <span className="text-[17px] font-extrabold text-text tracking-tight">
              prep.ai
            </span>
          </Link>

          {/* Navigation Links (if logged in) */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-4">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`text-[14px] font-semibold transition-all px-[13px] py-[8px] rounded-[10px] ${
                      isActive
                        ? "text-primary bg-primary-soft"
                        : "text-text-muted hover:bg-surface-2 hover:text-text"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* User Section */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate("/onboarding")}
                  className="bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold px-[13px] py-[7px] rounded-[10px] shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  New Board
                </button>
                {/* Avatar with Initials */}
                <div 
                  onClick={() => {
                    if (confirm("Log out?")) logout();
                  }}
                  className="w-[34px] h-[34px] rounded-full bg-primary-soft text-primary-hover hover:bg-primary/20 flex items-center justify-center font-bold text-xs cursor-pointer select-none border border-primary/10 transition-colors"
                  title="Click to logout"
                >
                  {user?.full_name ? user.full_name.split(" ").map((n) => n[0]).join("") : "U"}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-semibold text-text hover:text-primary transition-colors">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold px-[13px] py-[7px] rounded-[10px] shadow-sm transition-colors"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1120px] mx-auto px-6">
        {children}
      </main>

      {/* Footer (Landing only page footer block helper or generic) */}
      <footer className="py-6 border-t border-border mt-auto">
        <div className="max-w-[1120px] mx-auto px-6 flex justify-between items-center text-xs text-text-subtle">
          <span>&copy; {new Date().getFullYear()} prep.ai. All rights reserved.</span>
          <div className="flex gap-4">
            <span>FastAPI · PostgreSQL · Qdrant · Gemini API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
