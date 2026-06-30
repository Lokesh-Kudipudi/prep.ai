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
    <div className="flex-1 w-full flex flex-col min-h-0 px-6 py-4 bg-bg">
      {/* Nested View */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <Outlet />
      </div>
    </div>
  );
}
