import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sparkles, HelpCircle, AlertCircle, Loader2, ArrowRight, CheckCircle2, RotateCw } from "lucide-react";
import { useFlashcards, useGenerateFlashcards, useReviewFlashcard } from "../../hooks/useFlashcards";
import { useSources } from "../../hooks/useSources";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { cn } from "../../lib/utils";
import { FlashcardRating } from "../../types";

export function FlashcardsTab() {
  const { boardId } = useParams<{ boardId: string }>();

  // Data fetching
  const { data: sources, isLoading: isSourcesLoading } = useSources(boardId);
  const { data: cards, isLoading: isCardsLoading, isError } = useFlashcards(boardId);

  // Mutations
  const generateMutation = useGenerateFlashcards(boardId);
  const reviewMutation = useReviewFlashcard(boardId);

  // UI state
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  // 1. Loading States
  if (isSourcesLoading || isCardsLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-surface border border-border rounded-lg shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-text-muted text-sm font-semibold">Loading flashcard desk...</span>
      </div>
    );
  }

  // 2. Empty Sources State - Block card Gen
  const hasNoSources = !sources || sources.length === 0;
  const hasNoIndexedSources = sources?.every((s) => s.status !== "indexed");
  if (hasNoSources || hasNoIndexedSources) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="Add indexed sources first"
        description="Flashcards are dynamically generated from indexed concepts. Please upload a PDF or crawl documentation and wait for indexing before creating flashcards."
        action={
          <Link to={`/boards/${boardId}/sources`}>
            <Button className="flex items-center gap-2">
              Go to Sources
            </Button>
          </Link>
        }
      />
    );
  }

  // 3. Database error
  if (isError) {
    return (
      <div className="bg-danger-soft border border-danger/20 rounded-lg p-4 text-sm text-danger-text font-semibold flex items-center gap-2">
        <AlertCircle size={16} />
        Could not load flashcards for this workspace. Please refresh the page.
      </div>
    );
  }

  // 4. Empty Cards State - Prompt Generation
  if (!cards || cards.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No flashcards generated yet"
        description="Let Gemini parse your indexed sources to build a custom set of 5 to 8 study cards. Spaced repetition scheduling begins automatically upon review."
        action={
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2"
          >
            {generateMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {generateMutation.isPending ? "Generating with Gemini..." : "Generate Flashcards"}
          </Button>
        }
      />
    );
  }

  // 5. Separate active/due flashcards
  const now = new Date();
  const dueCards = cards.filter((card) => new Date(card.next_review_due) <= now);
  
  // Safe bounds guard for current reviewer index
  const activeReviewCard = dueCards.length > 0 ? dueCards[currentReviewIndex % dueCards.length] : null;

  function handleRateCard(cardId: string, rating: FlashcardRating) {
    setIsFlipped(false);
    reviewMutation.mutate(
      { cardId, rating },
      {
        onSuccess: () => {
          // If we are reviewing the last item, loop index back to 0
          if (currentReviewIndex >= dueCards.length - 1) {
            setCurrentReviewIndex(0);
          }
        },
      }
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner Control */}
      <div className="flex justify-between items-center bg-surface border border-border rounded-lg p-5 shadow-xs">
        <div>
          <h2 className="text-h2 font-bold text-text">Spaced Repetition Review</h2>
          <p className="text-sm text-text-muted mt-1">
            Keep your knowledge fresh. Review cards regularly using the SM-2 algorithm to optimize concept recall.
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          variant="secondary"
          className="flex items-center gap-2"
        >
          {generateMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} className="text-primary" />
          )}
          Generate More Cards
        </Button>
      </div>

      {/* Review Section */}
      <div className="max-w-[560px] mx-auto space-y-4">
        <h3 className="text-[13px] font-bold text-text-muted uppercase tracking-wider">
          Practice Deck · <span className="font-mono text-primary">{dueCards.length} Cards Due</span>
        </h3>

        {activeReviewCard ? (
          <div className="space-y-4">
            {/* Card Shell */}
            <div
              onClick={() => !isFlipped && setIsFlipped(true)}
              className={cn(
                "relative min-h-[220px] rounded-[14px] border border-border p-8 flex flex-col justify-between transition-all duration-300 shadow-sm",
                isFlipped
                  ? "bg-primary-soft/20 border-primary-hover"
                  : "bg-surface hover:border-border-strong cursor-pointer"
              )}
            >
              {/* Corner Badge */}
              <div className="absolute top-4 right-4">
                <Badge variant={isFlipped ? "violet" : "neutral"} className="uppercase">
                  {isFlipped ? "Back" : "Front"}
                </Badge>
              </div>

              {/* Main content display */}
              <div className="flex-1 flex items-center justify-center py-4">
                <p className="text-[15px] font-bold text-text text-center leading-relaxed whitespace-pre-wrap">
                  {isFlipped ? activeReviewCard.back : activeReviewCard.front}
                </p>
              </div>

              {/* Status helper text */}
              {!isFlipped && (
                <div className="text-center text-xs text-text-subtle font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
                  Click to flip card
                  <RotateCw size={12} />
                </div>
              )}

              {/* Active Rating Bar (Back Exposed) */}
              {isFlipped && (
                <div className="grid grid-cols-4 gap-2 pt-4 border-t border-border/10 animate-in slide-in-from-bottom-2 duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRateCard(activeReviewCard.id, "again");
                    }}
                    disabled={reviewMutation.isPending}
                    className="py-2 px-3 bg-danger-soft hover:bg-[#f5c6c6] text-danger-text text-xs font-bold rounded-lg border border-transparent transition-colors cursor-pointer text-center"
                  >
                    Again
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRateCard(activeReviewCard.id, "hard");
                    }}
                    disabled={reviewMutation.isPending}
                    className="py-2 px-3 bg-warning-soft hover:bg-[#fadeb6] text-warning-text text-xs font-bold rounded-lg border border-transparent transition-colors cursor-pointer text-center"
                  >
                    Hard
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRateCard(activeReviewCard.id, "good");
                    }}
                    disabled={reviewMutation.isPending}
                    className="py-2 px-3 bg-primary-soft hover:bg-primary-soft/80 text-primary-hover text-xs font-bold rounded-lg border border-transparent transition-colors cursor-pointer text-center"
                  >
                    Good
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRateCard(activeReviewCard.id, "easy");
                    }}
                    disabled={reviewMutation.isPending}
                    className="py-2 px-3 bg-success-soft hover:bg-[#c9f0d0] text-success-text text-xs font-bold rounded-lg border border-transparent transition-colors cursor-pointer text-center"
                  >
                    Easy
                  </button>
                </div>
              )}
            </div>

            {/* Skip Option */}
            {dueCards.length > 1 && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setCurrentReviewIndex((prev) => (prev + 1) % dueCards.length);
                  }}
                  className="text-text-muted hover:text-text text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  Skip Card
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <Card className="min-h-[160px] flex flex-col items-center justify-center text-center p-6 bg-surface-2 border border-border">
            <div className="w-10 h-10 bg-success-soft text-success rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 size={22} />
            </div>
            <h4 className="text-sm font-bold text-text">All caught up!</h4>
            <p className="text-xs text-text-muted mt-1 max-w-[280px] leading-relaxed">
              No flashcards are currently scheduled for review. Return later or trigger a batch to learn more concepts.
            </p>
          </Card>
        )}
      </div>

      {/* Grid of All Cards */}
      <div className="space-y-4">
        <h3 className="text-[13px] font-bold text-text-muted uppercase tracking-wider">
          Library · <span className="font-mono text-text">{cards.length} Total Cards</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const isDue = new Date(card.next_review_due) <= now;

            return (
              <Card key={card.id} className="p-5 flex flex-col justify-between gap-4 bg-surface border border-border">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-primary">Concept</span>
                    {isDue && (
                      <span className="text-[10px] bg-warning-soft text-warning-text px-[6px] py-[2px] rounded-full font-bold select-none uppercase tracking-wide">
                        Due
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-text leading-snug">
                    {card.front}
                  </h4>
                  <p className="text-xs text-text-muted border-t border-border/10 pt-2 whitespace-pre-wrap leading-relaxed">
                    {card.back}
                  </p>
                </div>
                
                <div className="text-[11px] text-text-subtle font-semibold flex justify-between pt-2 border-t border-border/5">
                  <span>Interval: <strong className="font-mono">{card.srs_interval}d</strong></span>
                  <span>Reps: <strong className="font-mono">{card.srs_repetitions}</strong></span>
                  <span>Ease: <strong className="font-mono">{card.srs_ease_factor.toFixed(2)}</strong></span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
