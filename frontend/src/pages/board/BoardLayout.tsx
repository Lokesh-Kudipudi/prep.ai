import { Outlet, useParams, Link } from "react-router-dom";
import { useBoardDetails } from "../../hooks/useBoards";
import { BoardSubTabs } from "../../components/layout/BoardSubTabs";

export function BoardLayout() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board, isLoading, isError } = useBoardDetails(boardId);

  if (isLoading) {
    return (
      <div className="py-8 space-y-6 animate-pulse">
        <div className="h-4 bg-surface-3 rounded w-1/4" />
        <div className="h-8 bg-surface-3 rounded w-1/3" />
        <div className="h-10 bg-surface-3 rounded w-full" />
        <div className="h-48 bg-surface-3 rounded w-full" />
      </div>
    );
  }

  if (isError || !board) {
    return (
      <div className="py-12 text-center max-w-md mx-auto space-y-4">
        <div className="bg-danger-soft border border-danger/20 rounded-md p-4 text-sm text-danger-text font-semibold">
          Error loading workspace. The board does not exist or you do not have permission to view it.
        </div>
        <Link to="/dashboard" className="text-primary font-semibold hover:underline text-sm block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Breadcrumbs */}
      <div className="text-xs font-semibold text-text-subtle mb-2 uppercase tracking-wider">
        <Link to="/dashboard" className="hover:text-primary">Boards</Link> / <span className="text-text-muted">{board.name}</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-h1 font-extrabold text-text">{board.name}</h1>
      </div>

      {/* Sub-Navigation Tabs */}
      <BoardSubTabs boardId={board.id} />

      {/* Nested View */}
      <Outlet />
    </div>
  );
}
