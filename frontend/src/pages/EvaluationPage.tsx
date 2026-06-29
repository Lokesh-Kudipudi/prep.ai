import { useState } from "react";
import { BarChart3, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { useEvaluationRuns, useTriggerEvaluation } from "../hooks/useEvaluation";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ScoreBar } from "../components/ui/ScoreBar";
import { TrendBadge } from "../components/ui/TrendBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { useBoards } from "../hooks/useBoards";

export function EvaluationPage() {
  const { data: runs, isLoading: isRunsLoading, isError: isRunsError } = useEvaluationRuns();
  const triggerEvalMutation = useTriggerEvaluation();
  
  // Also fetch boards to check if there are any indexed sources available
  const { data: boards } = useBoards();
  
  const [triggerError, setTriggerError] = useState<string | null>(null);

  // Determine if a run is currently in progress
  const activeRun = runs?.find(r => r.status === "pending" || r.status === "running");
  const isRunning = !!activeRun;

  // Check if there are any workspaces with sources
  const hasWorkspaces = boards && boards.length > 0;

  async function handleTriggerEval() {
    setTriggerError(null);
    try {
      await triggerEvalMutation.mutateAsync(10);
    } catch (err: any) {
      setTriggerError(err.response?.data?.detail ?? "Failed to trigger evaluation. Please try again.");
    }
  }

  if (isRunsLoading) {
    return (
      <div className="py-8 space-y-8 animate-pulse">
        <div className="h-8 bg-surface-3 rounded w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-surface-3 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-surface-3 rounded-lg" />
          <div className="h-64 bg-surface-3 rounded-lg" />
        </div>
      </div>
    );
  }

  if (isRunsError) {
    return (
      <div className="py-12 text-center max-w-md mx-auto space-y-4">
        <div className="bg-danger-soft border border-danger/20 rounded-md p-4 text-sm text-danger-text font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          Failed to load evaluation metrics. Please check connection and try again.
        </div>
      </div>
    );
  }

  // Get the latest completed evaluation run to display
  const completedRuns = runs?.filter(r => r.status === "completed") ?? [];
  const latestRun = completedRuns[0]; // runs is sorted desc by created_at

  const showEmptyState = completedRuns.length === 0 && !isRunning;

  // Cumulative token cost SVG parsing helpers
  // Take last 8 completed runs, sort ascending for line chart rendering
  const chartRuns = [...completedRuns].slice(0, 8).reverse();
  
  // Grouped Bar Chart dimensions
  const f_base = latestRun?.faithfulness_baseline ?? 0;
  const f_imp = latestRun?.faithfulness_improved ?? 0;
  const r_base = latestRun?.answer_relevance_baseline ?? 0;
  const r_imp = latestRun?.answer_relevance_improved ?? 0;
  const c_base = latestRun?.context_recall_baseline ?? 0;
  const c_imp = latestRun?.context_recall_improved ?? 0;

  // Scale score to SVG pixels height (0..1 maps to 0..140 pixels)
  const getBarHeight = (val: number) => Math.round(val * 140);
  const getBarY = (val: number) => 180 - getBarHeight(val);

  // Line Chart cost coordinates calculation
  let baselinePolylinePoints = "";
  let improvedPolylinePoints = "";
  let baselineDots: { cx: number; cy: number }[] = [];
  let improvedDots: { cx: number; cy: number }[] = [];

  if (chartRuns.length > 0) {
    const xStep = 314 / (Math.max(chartRuns.length - 1, 1));
    // Determine max cost to scale chart accurately, default to $1.0 max limit
    const maxCost = Math.max(
      ...chartRuns.map(r => Math.max(r.token_cost_baseline ?? 0, r.token_cost_improved ?? 0)),
      1.0
    );

    const getCostY = (cost: number | null) => {
      const val = cost ?? 0;
      return Math.round(180 - (val / maxCost) * 120);
    };

    chartRuns.forEach((run, i) => {
      const cx = 36 + i * xStep;
      const cyBase = getCostY(run.token_cost_baseline);
      const cyImp = getCostY(run.token_cost_improved);
      
      baselinePolylinePoints += `${cx},${cyBase} `;
      improvedPolylinePoints += `${cx},${cyImp} `;
      
      baselineDots.push({ cx, cy: cyBase });
      improvedDots.push({ cx, cy: cyImp });
    });
  }

  return (
    <div className="py-8 space-y-8">
      {/* Page Header */}
      <div className="pagehead flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div>
          <span className="eyebrow text-xs font-bold uppercase tracking-wider text-primary">Ragas · run on dynamic QA pairs</span>
          <h1 className="text-h1 font-extrabold text-text tracking-tight mt-1">Evaluation — Baseline vs Improved</h1>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Button
            variant={isRunning ? "secondary" : "primary"}
            size="sm"
            onClick={handleTriggerEval}
            disabled={isRunning || !hasWorkspaces}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Evaluating ({activeRun?.num_questions} QA Pairs)...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-run eval_rag.py
              </>
            )}
          </Button>
          {!hasWorkspaces && (
            <p className="text-[11px] text-danger-text font-medium bg-danger-soft px-2 py-1 rounded">
              Create a board with indexed documents first
            </p>
          )}
          {triggerError && (
            <p className="text-[11px] text-danger-text font-medium bg-danger-soft px-2 py-1 rounded">
              {triggerError}
            </p>
          )}
        </div>
      </div>

      {showEmptyState ? (
        <EmptyState
          icon={BarChart3}
          title="No evaluation runs yet"
          description="Index a PDF or fetch documentation inside a Board workspace, then trigger your first evaluation to compare Simple RAG vs. stateful Agentic RAG performance metrics."
          action={
            <Button variant="primary" onClick={handleTriggerEval} disabled={!hasWorkspaces}>
              <RefreshCw className="w-4 h-4 mr-2" /> Trigger First Evaluation
            </Button>
          }
        />
      ) : (
        <>
          {/* Running Status Banner */}
          {isRunning && (
            <Card className="bg-primary-softer border-primary/20 p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <div className="text-sm font-bold text-text">Evaluating RAG Performance...</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    Querying Baseline and Improved pipelines on at least 10 dynamic QA pairs. Ragas scoring in progress.
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-primary bg-primary-soft px-3 py-1 rounded-full">
                Processing Run
              </span>
            </Card>
          )}

          {latestRun && (
            <>
              {/* Metrics Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Faithfulness */}
                <Card className="p-5 space-y-2">
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Faithfulness</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[30px] font-extrabold text-text font-mono leading-none">
                      {f_imp.toFixed(2)}
                    </span>
                    <TrendBadge value={f_imp - f_base >= 0 ? `+${(f_imp - f_base).toFixed(2)}` : (f_imp - f_base).toFixed(2)} isUp={f_imp >= f_base} />
                  </div>
                  <ScoreBar value={f_imp} />
                  <div className="text-xs text-text-subtle pt-1">
                    Baseline {f_base.toFixed(2)}
                  </div>
                </Card>

                {/* Answer Relevance */}
                <Card className="p-5 space-y-2">
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Answer Relevance</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[30px] font-extrabold text-text font-mono leading-none">
                      {r_imp.toFixed(2)}
                    </span>
                    <TrendBadge value={r_imp - r_base >= 0 ? `+${(r_imp - r_base).toFixed(2)}` : (r_imp - r_base).toFixed(2)} isUp={r_imp >= r_base} />
                  </div>
                  <ScoreBar value={r_imp} />
                  <div className="text-xs text-text-subtle pt-1">
                    Baseline {r_base.toFixed(2)}
                  </div>
                </Card>

                {/* Context Recall */}
                <Card className="p-5 space-y-2">
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Context Recall</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[30px] font-extrabold text-text font-mono leading-none">
                      {c_imp.toFixed(2)}
                    </span>
                    <TrendBadge value={c_imp - c_base >= 0 ? `+${(c_imp - c_base).toFixed(2)}` : (c_imp - c_base).toFixed(2)} isUp={c_imp >= c_base} />
                  </div>
                  <ScoreBar value={c_imp} />
                  <div className="text-xs text-text-subtle pt-1">
                    Baseline {c_base.toFixed(2)}
                  </div>
                </Card>

                {/* Token Cost */}
                <Card className="p-5 space-y-2">
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Token Cost / run</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[30px] font-extrabold text-text font-mono leading-none">
                      ${(latestRun.token_cost_improved ?? 0).toFixed(4)}
                    </span>
                    <TrendBadge 
                      value={`+$${((latestRun.token_cost_improved ?? 0) - (latestRun.token_cost_baseline ?? 0)).toFixed(4)}`} 
                      isUp={false} // Cost increases are shown as warning/red trend
                    />
                  </div>
                  {/* ScoreBar used as cost visualization: green if cheap, red if expensive */}
                  <ScoreBar value={1 - Math.min((latestRun.token_cost_improved ?? 0) / 0.8, 1)} />
                  <div className="text-xs text-text-subtle pt-1 line-clamp-1">
                    Baseline ${(latestRun.token_cost_baseline ?? 0).toFixed(4)} · self-correction cost
                  </div>
                </Card>
              </div>

              {/* Grouped SVG Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SVG Quality chart */}
                <Card className="p-5 space-y-4">
                  <div className="text-sm font-bold text-text">Quality metrics — Baseline vs Improved</div>
                  
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <span className="w-3 h-3 rounded-[3px] bg-border-strong inline-block" />
                      Baseline (Simple RAG)
                    </span>
                    <span className="flex items-center gap-1.5 text-text">
                      <span className="w-3 h-3 rounded-[3px] bg-primary inline-block" />
                      Improved (Agentic RAG)
                    </span>
                  </div>

                  <div className="w-full aspect-[520/240] pt-2">
                    <svg viewBox="0 0 520 240" className="w-full h-full" role="img" aria-label="Quality metrics comparison chart">
                      <line x1="48" y1="180" x2="500" y2="180" stroke="var(--color-border)" strokeWidth="1" />
                      <line x1="48" y1="110" x2="500" y2="110" stroke="var(--color-surface-2)" strokeWidth="1" />
                      <line x1="48" y1="40"  x2="500" y2="40"  stroke="var(--color-surface-2)" strokeWidth="1" />
                      
                      <text x="38" y="184" className="text-[10px] font-mono fill-text-subtle" textAnchor="end">0.0</text>
                      <text x="38" y="114" className="text-[10px] font-mono fill-text-subtle" textAnchor="end">0.5</text>
                      <text x="38" y="44"  className="text-[10px] font-mono fill-text-subtle" textAnchor="end">1.0</text>
                      
                      {/* group 1: Faithfulness */}
                      <rect x="80"  y={getBarY(f_base)} width="38" height={getBarHeight(f_base)} rx="4" className="fill-border-strong" />
                      <rect x="122" y={getBarY(f_imp)}  width="38" height={getBarHeight(f_imp)}  rx="4" className="fill-primary" />
                      <text x="120" y="202" className="text-[11px] font-semibold fill-text-muted" textAnchor="middle">Faithfulness</text>
                      
                      {/* group 2: Answer Relevance */}
                      <rect x="230" y={getBarY(r_base)} width="38" height={getBarHeight(r_base)} rx="4" className="fill-border-strong" />
                      <rect x="272" y={getBarY(r_imp)}  width="38" height={getBarHeight(r_imp)}  rx="4" className="fill-primary" />
                      <text x="270" y="202" className="text-[11px] font-semibold fill-text-muted" textAnchor="middle">Relevance</text>
                      
                      {/* group 3: Context Recall */}
                      <rect x="380" y={getBarY(c_base)} width="38" height={getBarHeight(c_base)} rx="4" className="fill-border-strong" />
                      <rect x="422" y={getBarY(c_imp)}  width="38" height={getBarHeight(c_imp)}  rx="4" className="fill-primary" />
                      <text x="420" y="202" className="text-[11px] font-semibold fill-text-muted" textAnchor="middle">Recall</text>
                    </svg>
                  </div>
                </Card>

                {/* SVG Cumulative cost chart */}
                <Card className="p-5 space-y-4">
                  <div>
                    <div className="text-sm font-bold text-text">Cumulative token cost per run</div>
                    <p className="text-xs text-text-muted mt-0.5">USD across last {chartRuns.length} completed runs</p>
                  </div>

                  <div className="w-full aspect-[360/220] pt-2">
                    {chartRuns.length > 0 ? (
                      <svg viewBox="0 0 360 220" className="w-full h-full" role="img" aria-label="Cumulative costs chart">
                        <line x1="36" y1="180" x2="350" y2="180" stroke="var(--color-border)" strokeWidth="1" />
                        <line x1="36" y1="120" x2="350" y2="120" stroke="var(--color-surface-2)" strokeWidth="1" />
                        <line x1="36" y1="60"  x2="350" y2="60"  stroke="var(--color-surface-2)" strokeWidth="1" />
                        
                        <text x="30" y="184" className="text-[10px] font-mono fill-text-subtle" textAnchor="end">$0</text>
                        <text x="30" y="124" className="text-[10px] font-mono fill-text-subtle" textAnchor="end">
                          ${(Math.max(...chartRuns.map(r => Math.max(r.token_cost_baseline ?? 0, r.token_cost_improved ?? 0)), 1.0) / 2).toFixed(2)}
                        </text>
                        <text x="30" y="64"  className="text-[10px] font-mono fill-text-subtle" textAnchor="end">
                          ${Math.max(...chartRuns.map(r => Math.max(r.token_cost_baseline ?? 0, r.token_cost_improved ?? 0)), 1.0).toFixed(2)}
                        </text>
                        
                        {/* Baseline line */}
                        <polyline fill="none" stroke="var(--color-border-strong)" strokeWidth="2.5" strokeDasharray="5 4" points={baselinePolylinePoints.trim()} />
                        {/* Improved line */}
                        <polyline fill="none" stroke="var(--color-primary)" strokeWidth="2.5" points={improvedPolylinePoints.trim()} />
                        
                        {/* Dots */}
                        {baselineDots.map((dot, idx) => (
                          <circle key={`b-${idx}`} cx={dot.cx} cy={dot.cy} r="3.5" className="fill-border-strong" />
                        ))}
                        {improvedDots.map((dot, idx) => (
                          <circle key={`i-${idx}`} cx={dot.cx} cy={dot.cy} r="3.5" className="fill-primary" />
                        ))}

                        <text x="36" y="198" className="text-[10px] font-mono fill-text-subtle" textAnchor="start">R1</text>
                        <text x="350" y="198" className="text-[10px] font-mono fill-text-subtle" textAnchor="end">R{chartRuns.length}</text>
                      </svg>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-text-subtle">
                        Need completed runs to generate cost trends
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 text-xs font-semibold pt-1">
                    <span className="flex items-center gap-1.5 text-text">
                      <span className="w-[12px] h-[3px] bg-primary inline-block" />
                      Improved (Agentic RAG)
                    </span>
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <span className="w-[12px] h-[3px] border-t-2 border-dashed border-border-strong inline-block" />
                      Baseline (Simple RAG)
                    </span>
                  </div>
                </Card>
              </div>

              {/* Comparison Methodology Table */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <h3 className="text-h3 font-bold text-text">Comparison methodology</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="text-text-muted font-semibold">
                        <th className="p-3 border-b border-border">Dimension</th>
                        <th className="p-3 border-b border-border">Baseline · Simple RAG</th>
                        <th className="p-3 border-b border-border">Improved · Agentic RAG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      <tr>
                        <td className="p-3 font-semibold text-text">Chunking</td>
                        <td className="p-3 text-text-muted">Fixed-size 1000 characters, no layout/structure awareness</td>
                        <td className="p-3 text-text">Semantic, hierarchy-aware chunking (LlamaIndex SemanticSplitter)</td>
                      </tr>
                      <tr className="bg-surface-2/40">
                        <td className="p-3 font-semibold text-text">Pipeline Orchestration</td>
                        <td className="p-3 text-text-muted">Single-shot vector context prompt injection</td>
                        <td className="p-3 text-text">Stateful LangGraph query agent running custom reasoning graph</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-text">Factual Validation</td>
                        <td className="p-3 text-text-muted">None (direct generation output fallback)</td>
                        <td className="p-3 text-text">Hallucination auto-critiques & self-correcting generation loop</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
