import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, FileText, CheckSquare, Calendar, ArrowRight } from "lucide-react";
import { useBoards, useBoardStats } from "../hooks/useBoards";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: boards, isLoading: isBoardsLoading, isError: isBoardsError } = useBoards();
  const { data: stats, isLoading: isStatsLoading } = useBoardStats();

  const activeBoardsCount = stats?.active_boards ?? 0;
  const sourcesIndexedCount = stats?.sources_indexed ?? 0;
  const cardsReviewedCount = stats?.cards_reviewed ?? 0;

  if (isBoardsLoading || isStatsLoading) {
    return (
      <div className="py-8 space-y-8 animate-pulse">
        {/* Stats Skeletion */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface-3 rounded-lg" />
          ))}
        </div>
        {/* Workspace Title Skeleton */}
        <div className="h-8 bg-surface-3 rounded w-1/4" />
        {/* Boards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-surface-3 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isBoardsError) {
    return (
      <div className="py-12 text-center max-w-md mx-auto space-y-4">
        <div className="bg-danger-soft border border-danger/20 rounded-md p-4 text-sm text-danger-text font-semibold">
          Error loading dashboard. Please check your network connection and try again.
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      {/* Workspace Summary Statistics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-h2 font-extrabold text-text leading-none">{activeBoardsCount}</div>
            <div className="text-xs text-text-muted mt-1 font-semibold uppercase tracking-wider">Active Boards</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-lg bg-sky-soft text-sky-text flex items-center justify-center shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-h2 font-extrabold text-text leading-none">{sourcesIndexedCount}</div>
            <div className="text-xs text-text-muted mt-1 font-semibold uppercase tracking-wider">Sources Indexed</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-lg bg-success-soft text-success-text flex items-center justify-center shrink-0">
            <CheckSquare size={24} />
          </div>
          <div>
            <div className="text-h2 font-extrabold text-text leading-none">{cardsReviewedCount}</div>
            <div className="text-xs text-text-muted mt-1 font-semibold uppercase tracking-wider">Cards Reviewed</div>
          </div>
        </Card>
      </section>

      {/* Boards Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-h2 font-extrabold text-text">Your Workspaces</h2>
          {boards && boards.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => navigate("/onboarding")}>
              <Plus size={14} className="mr-1" /> Create Board
            </Button>
          )}
        </div>

        {boards && boards.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No study boards found"
            description="Create your first board workspace to start uploading documents, generating quizzes, and running interactive tutoring chat sessions."
            action={
              <Button variant="primary" onClick={() => navigate("/onboarding")}>
                <Plus size={16} /> Create First Board
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {boards?.map((board) => (
              <Card
                key={board.id}
                clickable
                onClick={() => navigate(`/boards/${board.id}/sources`)}
                className="flex flex-col justify-between h-44 p-5 group"
              >
                <div className="space-y-2">
                  <h3 className="text-h4 font-bold text-text group-hover:text-primary transition-colors line-clamp-1">
                    {board.name}
                  </h3>
                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                    {board.description || "No description provided."}
                  </p>
                </div>

                <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-text-subtle">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>
                      {new Date(board.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <span className="text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex items-center gap-0.5">
                    Open <ArrowRight size={12} />
                  </span>
                </div>
              </Card>
            ))}

            {/* Dash placeholder to add new board */}
            <button
              onClick={() => navigate("/onboarding")}
              className="h-44 rounded-lg border-2 border-dashed border-border-strong hover:border-primary/50 hover:bg-surface-2 transition-all flex flex-col items-center justify-center gap-2 text-text-muted hover:text-primary select-none cursor-pointer"
            >
              <Plus size={24} />
              <span className="text-xs font-semibold uppercase tracking-wider">Create a new Board</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
