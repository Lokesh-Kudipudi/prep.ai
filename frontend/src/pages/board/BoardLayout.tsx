import { Outlet, useParams, Link, useLocation } from "react-router-dom";

export function BoardLayout() {
  const { boardId } = useParams<{ boardId: string }>();
  const location = useLocation();

  const tabs = [
    { id: "sources", label: "Sources", path: `/boards/${boardId}/sources` },
    { id: "quiz", label: "Quiz", path: `/boards/${boardId}/quiz` },
    { id: "flashcards", label: "Flashcards", path: `/boards/${boardId}/flashcards` },
    { id: "tutor", label: "Tutor Session", path: `/boards/${boardId}/tutor` },
  ];

  return (
    <div className="py-8">
      {/* Breadcrumbs */}
      <div className="text-xs font-semibold text-text-subtle mb-2 uppercase tracking-wider">
        <Link to="/dashboard" className="hover:text-primary">Boards</Link> / <span className="text-text-muted">Board details</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-h1 font-extrabold text-text">Board Workspace</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = location.pathname.endsWith(tab.id) || (tab.id === "sources" && location.pathname.endsWith(boardId ?? ""));
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`py-4 px-1 border-b-2 font-semibold text-sm ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text hover:border-border-strong"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Nested View */}
      <Outlet />
    </div>
  );
}
