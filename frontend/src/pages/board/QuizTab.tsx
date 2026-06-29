import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { HelpCircle, Award, CheckCircle2, XCircle, Loader2, ArrowLeft, ArrowRight, Info, RefreshCw } from "lucide-react";
import { useActiveQuiz, useGenerateQuiz, useSubmitAttempt } from "../../hooks/useQuiz";
import { useSources } from "../../hooks/useSources";
import { Button } from "../../components/ui/Button";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { ScoreBar } from "../../components/ui/ScoreBar";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { cn } from "../../lib/utils";

export function QuizTab() {
  const { boardId } = useParams<{ boardId: string }>();

  // Ingestion source validation
  const { data: sources, isLoading: isSourcesLoading } = useSources(boardId);
  const { data: activeQuiz, isLoading: isActiveQuizLoading, refetch: refetchActiveQuiz } = useActiveQuiz(boardId);

  // Mutations
  const generateMutation = useGenerateQuiz(boardId);
  const submitMutation = useSubmitAttempt(boardId);

  // State Management
  const [maxQuestions, setMaxQuestions] = useState<number>(10);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attemptResult, setAttemptResult] = useState<any | null>(null);

  // Auto-restore progress if an active quiz exists
  useEffect(() => {
    if (activeQuiz) {
      setCurrentQuestionIndex(0);
      setAnswers({});
      setAttemptResult(null);
    }
  }, [activeQuiz]);

  // Handlers
  function handleGenerate() {
    generateMutation.mutate(
      { maxQuestions },
      {
        onSuccess: () => {
          refetchActiveQuiz();
        },
      }
    );
  }

  function handleAnswerSelect(questionId: string, optionIndex: number) {
    if (answers[questionId] !== undefined) return; // Prevent changing answers
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  }

  function handleSubmit() {
    if (!activeQuiz) return;
    submitMutation.mutate(
      {
        quizId: activeQuiz.id,
        userAnswers: answers,
      },
      {
        onSuccess: (data) => {
          setAttemptResult(data);
        },
      }
    );
  }

  function handleRestart() {
    setAttemptResult(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    refetchActiveQuiz();
  }

  // 1. Loading States
  if (isSourcesLoading || isActiveQuizLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-surface border border-border rounded-lg shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-text-muted text-sm font-semibold">Loading practice workspace...</span>
      </div>
    );
  }

  // 2. Empty Sources State - Block Quiz Gen
  const hasNoSources = !sources || sources.length === 0;
  const hasNoIndexedSources = sources?.every((s) => s.status !== "indexed");
  if (hasNoSources || hasNoIndexedSources) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="Add indexed sources first"
        description="We generate custom quizzes directly from your indexed materials. Please upload a PDF or crawl documentation and wait for it to be fully indexed before generating a quiz."
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

  // 3. Quiz Score / Attempt Results View
  if (attemptResult && activeQuiz) {
    const totalQuestions = activeQuiz.questions.length;
    const scoreRatio = attemptResult.score / totalQuestions;
    const percentScore = Math.round(scoreRatio * 100);

    return (
      <div className="max-w-[560px] mx-auto py-4">
        <Card className="p-8 text-center space-y-6">
          <div className="w-[72px] h-[72px] rounded-[24px] bg-primary-soft text-primary flex items-center justify-center mx-auto shadow-xs">
            <Award size={36} />
          </div>

          <div className="space-y-2">
            <h2 className="text-h2 font-extrabold text-text">Quiz Completed!</h2>
            <p className="text-sm text-text-muted">
              Here is your active learning performance feedback.
            </p>
          </div>

          {/* Metric Bar */}
          <div className="bg-surface-2 p-5 border border-border rounded-xl space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-text">
              <span>Your Score</span>
              <span className="font-mono text-base">
                {attemptResult.score} / {totalQuestions} ({percentScore}%)
              </span>
            </div>
            <ScoreBar value={scoreRatio} />
          </div>

          {/* Feedback Text */}
          <p className="text-sm text-text-muted px-4 leading-relaxed">
            {percentScore >= 85
              ? "Exceptional retention! You have solid mastery of the material indexed in this workspace."
              : percentScore >= 60
              ? "Good effort! Review the reasoning details for missed items to solidify your understanding."
              : "Review recommended. Go back to the sources and index some additional guides or repeat flashcard drills."}
          </p>

          <div className="flex justify-center pt-2">
            <Button onClick={handleRestart} className="flex items-center gap-2">
              <RefreshCw size={14} />
              Try another quiz
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 4. Active Quiz runner View
  if (activeQuiz && activeQuiz.questions && activeQuiz.questions.length > 0) {
    const question = activeQuiz.questions[currentQuestionIndex];
    const totalQuestions = activeQuiz.questions.length;
    const progress = (currentQuestionIndex + 1) / totalQuestions;

    const chosenAnswerIndex = answers[question.id];
    const isQuestionAnswered = chosenAnswerIndex !== undefined;

    return (
      <div className="max-w-[640px] mx-auto py-2">
        <div className="space-y-4">
          {/* Top progress indicator */}
          <div className="flex items-center justify-between text-xs font-bold text-text-muted">
            <span className="uppercase tracking-wider">Practice Quiz</span>
            <span className="font-mono bg-surface-3 px-2 py-1 rounded">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>

          <ProgressBar value={progress} />

          {/* Question Card */}
          <Card className="p-6 space-y-6">
            <h3 className="text-base font-bold text-text leading-snug">
              {question.question_text}
            </h3>

            {/* Answer Options */}
            <div className="space-y-3">
              {question.options.map((option, idx) => {
                const isSelected = chosenAnswerIndex === idx;
                const isCorrect = idx === question.correct_option_index;

                let optionStyles = "bg-surface border-border hover:border-border-strong hover:bg-surface-2 text-text";
                if (isQuestionAnswered) {
                  if (isCorrect) {
                    optionStyles = "bg-success-soft text-success-text border-success";
                  } else if (isSelected) {
                    optionStyles = "bg-danger-soft text-danger-text border-danger";
                  } else {
                    optionStyles = "opacity-60 bg-surface border-border text-text-muted";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isQuestionAnswered}
                    onClick={() => handleAnswerSelect(question.id, idx)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border text-sm font-semibold transition-all duration-150 flex items-center justify-between",
                      optionStyles,
                      !isQuestionAnswered && "cursor-pointer"
                    )}
                  >
                    <span>{option}</span>
                    {isQuestionAnswered && isCorrect && <CheckCircle2 className="text-success shrink-0" size={18} />}
                    {isQuestionAnswered && isSelected && !isCorrect && <XCircle className="text-danger shrink-0" size={18} />}
                  </button>
                );
              })}
            </div>

            {/* Explanation / Reasoning panel */}
            {isQuestionAnswered && (
              <div className="bg-primary-soft/10 border border-primary/10 p-4 rounded-lg flex gap-3 animate-in fade-in duration-200">
                <Info className="text-primary shrink-0 mt-[2px]" size={16} />
                <div className="space-y-1">
                  <h5 className="text-[12px] font-bold uppercase tracking-wider text-primary">Explanation</h5>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {question.reasoning}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="secondary"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              className="flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              Previous
            </Button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <Button
                disabled={!isQuestionAnswered}
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="flex items-center gap-1"
              >
                Next
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                disabled={!isQuestionAnswered || submitMutation.isPending}
                onClick={handleSubmit}
                className="min-w-[120px]"
              >
                {submitMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : (
                  "Submit Quiz"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. Configuration Setup View
  return (
    <div className="max-w-[480px] mx-auto py-6">
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-h2 font-bold text-text">Practice Quiz</h2>
          <p className="text-sm text-text-muted mt-1">
            Test your knowledge. Set your quiz length and generate multiple choice conceptual evaluations from active sources.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-text">
              Number of Questions: <span className="font-mono text-primary font-bold">{maxQuestions}</span>
            </label>
            <input
              type="range"
              min="3"
              max="20"
              value={maxQuestions}
              onChange={(e) => setMaxQuestions(parseInt(e.target.value))}
              disabled={generateMutation.isPending}
              className="w-full h-2 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-text-subtle font-semibold font-mono">
              <span>3</span>
              <span>10</span>
              <span>20</span>
            </div>
          </div>

          {generateMutation.isError && (
            <div className="bg-danger-soft border border-danger/10 text-danger-text text-sm rounded-md p-3 flex items-start gap-2 font-semibold">
              <XCircle size={16} className="shrink-0 mt-[2px]" />
              <span>{generateMutation.error?.message || "Failed to generate quiz."}</span>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full flex items-center justify-center gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating with Gemini...
              </>
            ) : (
              "Generate Custom Quiz"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
