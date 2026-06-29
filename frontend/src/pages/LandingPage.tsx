import { useNavigate } from "react-router-dom";
import { BookOpen, GraduationCap, CheckSquare, Sparkles, Code, Cpu } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ScoreBar } from "../components/ui/ScoreBar";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="py-12 space-y-16">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-soft rounded-full text-primary-hover font-semibold text-xs animate-pulse">
          <Sparkles size={12} />
          <span>Active Learning Platform</span>
        </div>
        <h1 className="text-display font-extrabold text-text tracking-tight leading-tight">
          Active learning that <span className="text-primary">teaches back</span>.
        </h1>
        <p className="text-body text-text-muted text-base max-w-xl mx-auto leading-relaxed">
          Turn dry textbooks, study PDFs, and API documentation into interactive, stateful workspaces. Auto-generate quizzes, bulk flashcards, and sandboxed tutor loops.
        </p>
        <div className="flex gap-4 justify-center pt-2">
          <Button variant="primary" onClick={() => navigate("/register")}>
            Get started
          </Button>
          <Button variant="secondary" onClick={() => navigate("/login")}>
            Log in to your Boards
          </Button>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-h2 font-extrabold text-text">The Three Preparation Pillars</h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Everything you need to master technical material through active recall.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="flex flex-col h-full space-y-4">
            <div className="w-10 h-10 rounded-md bg-primary-soft text-primary flex items-center justify-center">
              <CheckSquare size={20} />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-h4 font-bold text-text">Interactive Quizzes</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Test your understanding with dynamically generated multiple-choice questions. Select answers to get immediate, server-validated correctness feedback and explanations.
              </p>
            </div>
            <Badge variant="violet" className="w-fit">pillar 01</Badge>
          </Card>

          <Card className="flex flex-col h-full space-y-4">
            <div className="w-10 h-10 rounded-md bg-sky-soft text-sky-text flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-h4 font-bold text-text">SRS Flashcards</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Generate flashcard decks in bulk. The pipeline checks existing card context to guarantee new concepts. Rate reviews to adjust spaced-repetition schedules or export directly to Anki.
              </p>
            </div>
            <Badge variant="sky" className="w-fit">pillar 02</Badge>
          </Card>

          <Card className="flex flex-col h-full space-y-4">
            <div className="w-10 h-10 rounded-md bg-success-soft text-success-text flex items-center justify-center">
              <GraduationCap size={20} />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-h4 font-bold text-text">Stateful Tutoring</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Simulate engineering interviews. Receive conceptual follow-ups and coding assignments. Write code in the sidebar code editor, execute it in a Piston sandbox, and review LLM critique.
              </p>
            </div>
            <Badge variant="success" className="w-fit">pillar 03</Badge>
          </Card>
        </div>
      </section>

      {/* RAG Comparison Section */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-h2 font-extrabold text-text">Agentic RAG Engine</h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Why prep.ai yields better results than standard LLM document chat.
          </p>
        </div>

        <Card className="grid md:grid-cols-2 gap-8 items-center p-8">
          <div className="space-y-6">
            <h3 className="text-h3 font-bold text-text">Self-Correcting LLM Pipelines</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Standard RAG systems fetch context and generate responses in one shot, resulting in frequent hallucinations, stale references, and generic answers. 
            </p>
            <p className="text-sm text-text-muted leading-relaxed">
              prep.ai uses a stateful <strong>LangGraph Critic loop</strong>. It retrieves relevant chunks with metadata-scoped vector checks, critiques candidate responses, and auto-corrects them before presenting.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                <Code size={14} className="text-primary" />
                <span>LangGraph Loops</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                <Cpu size={14} className="text-sky" />
                <span>Gemini 2.0 Flash</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-surface-2 p-6 rounded-md border border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              Retrieval Evaluation Metrics (Ragas scoring)
            </h4>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-text mb-1">
                  <span>Context Recall</span>
                  <span className="text-success-text">84% vs 55%</span>
                </div>
                <ScoreBar value={0.84} />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-text mb-1">
                  <span>Faithfulness (Truthfulness)</span>
                  <span className="text-success-text">91% vs 62%</span>
                </div>
                <ScoreBar value={0.91} />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-text mb-1">
                  <span>Answer Relevance</span>
                  <span className="text-success-text">89% vs 70%</span>
                </div>
                <ScoreBar value={0.89} />
              </div>
            </div>

            <div className="text-[11px] text-text-subtle pt-2 text-center">
              Scores represent average Ragas values comparing prep.ai Improved vs Baseline RAG
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
