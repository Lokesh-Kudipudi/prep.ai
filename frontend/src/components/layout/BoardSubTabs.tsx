import { Link, useLocation } from "react-router-dom";

export interface BoardSubTabsProps {
  boardId: string;
}

export function BoardSubTabs({ boardId }: BoardSubTabsProps) {
  const location = useLocation();

  const tabs = [
    { id: "sources", label: "Sources", path: `/boards/${boardId}/sources` },
    { id: "quiz", label: "Quiz", path: `/boards/${boardId}/quiz` },
    { id: "flashcards", label: "Flashcards", path: `/boards/${boardId}/flashcards` },
    { id: "tutor", label: "Tutor Session", path: `/boards/${boardId}/tutor` },
  ];

  return (
    <div className="border-b border-border mb-6">
      <nav className="flex space-x-8" aria-label="Board workspace navigation">
        {tabs.map((tab) => {
          // A tab is active if the current pathname matches its path, or ends with the boardId for the default 'sources' tab
          const isActive =
            location.pathname === tab.path ||
            (tab.id === "sources" && location.pathname === `/boards/${boardId}`);
          
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-200 ${
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
  );
}
