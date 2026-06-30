import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useBoardDetails } from "../../hooks/useBoards";

type AppShellProps = {
  children?: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  // Parse boardId from location.pathname
  const match = location.pathname.match(/^\/boards\/([^/]+)/);
  const boardId = match ? match[1] : undefined;
  const isBoardRoute = !!boardId;

  // Fetch board details if inside a board route
  const { data: board } = useBoardDetails(boardId);

  const navLinks = [
    { label: "Boards", path: "/dashboard" },
    { label: "Evaluation", path: "/evaluation" },
    { label: "Settings", path: "/settings" },
  ];

  const boardTabs = boardId ? [
    { id: "sources", label: "Sources", path: `/boards/${boardId}/sources` },
    { id: "quiz", label: "Quiz", path: `/boards/${boardId}/quiz` },
    { id: "flashcards", label: "Flashcards", path: `/boards/${boardId}/flashcards` },
    { id: "tutor", label: "Tutor Session", path: `/boards/${boardId}/tutor` },
  ] : [];

  return (
    <div className={isBoardRoute ? "h-screen w-screen bg-bg flex flex-col overflow-hidden" : "min-h-screen bg-bg flex flex-col"}>
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border h-[64px] flex items-center shadow-sm">
        <div className={`w-full flex justify-between items-center px-6 ${isBoardRoute ? "" : "max-w-[1120px] mx-auto"}`}>
          {/* Brand & Board Breadcrumb */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="prep.ai Logo"
                className="w-[26px] h-[26px] object-contain rounded-[8px]"
              />
              <span className="text-[17px] font-extrabold text-text tracking-tight">
                prep.ai
              </span>
            </Link>
            {isBoardRoute && board && (
              <>
                <span className="text-text-subtle font-semibold text-sm">/</span>
                <span className="text-[14px] font-bold text-text truncate max-w-[150px]" title={board.name}>
                  {board.name}
                </span>
              </>
            )}
          </div>

          {/* Navigation Links (in the center) */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-2">
              {isBoardRoute ? (
                boardTabs.map((tab) => {
                  const isActive =
                    location.pathname === tab.path ||
                    (tab.id === "sources" && location.pathname === `/boards/${boardId}`);
                  return (
                    <Link
                      key={tab.id}
                      to={tab.path}
                      className={`text-[13px] font-bold transition-all px-[12px] py-[6px] rounded-[8px] ${
                        isActive
                          ? "text-primary bg-primary-soft"
                          : "text-text-muted hover:bg-surface-2 hover:text-text"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })
              ) : (
                navLinks.map((link) => {
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
                })
              )}
            </nav>
          )}

          {/* User Section (on the right) */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {!isBoardRoute && (
                  <button
                    onClick={() => navigate("/onboarding")}
                    className="bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold px-[13px] py-[7px] rounded-[10px] shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    New Board
                  </button>
                )}
                <ThemeToggle />
                {/* Avatar with Initials */}
                <div 
                  onClick={() => setIsLogoutOpen(true)}
                  className="w-[30px] h-[30px] rounded-full bg-primary-soft text-primary-hover hover:bg-primary/20 flex items-center justify-center font-bold text-xs cursor-pointer select-none border border-primary/10 transition-colors"
                  title="Click to logout"
                >
                  {user?.full_name ? user.full_name.split(" ").map((n) => n[0]).join("") : "U"}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <ThemeToggle />
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
      <main className={isBoardRoute ? "flex-1 w-full flex flex-col min-h-0" : "flex-1 w-full max-w-[1120px] mx-auto px-6"}>
        {children}
      </main>

      {/* Footer */}
      {!isBoardRoute && (
        <footer className="py-6 border-t border-border mt-auto">
          <div className="max-w-[1120px] mx-auto px-6 flex justify-between items-center text-xs text-text-subtle">
            <span>&copy; {new Date().getFullYear()} prep.ai. All rights reserved.</span>
            <div className="flex gap-4">
              <span>FastAPI · PostgreSQL · Qdrant · Gemini API</span>
            </div>
          </div>
        </footer>
      )}

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        title="Log out"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsLogoutOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => {
              setIsLogoutOpen(false);
              logout();
            }}>
              Log out
            </Button>
          </>
        }
      >
        Are you sure you want to log out of prep.ai?
      </Modal>
    </div>
  );
}
