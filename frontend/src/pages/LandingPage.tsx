import { useState } from "react";
import { FileText, Plus, Moon, Sun } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { ProgressBar } from "../components/ui/ProgressBar";
import { ScoreBar } from "../components/ui/ScoreBar";
import { TrendBadge } from "../components/ui/TrendBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { ActivityDot } from "../components/ui/ActivityDot";
import { Modal } from "../components/ui/Modal";

export function LandingPage() {
  const [inputText, setInputText] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  function toggleDark() {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      setIsDark(true);
    }
  }

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
        <div>
          <h1 className="text-h1 font-extrabold text-text tracking-tight">
            UI Primitives Playground
          </h1>
          <p className="text-sm text-text-muted">
            Interactive preview of prep.ai foundational component design system.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={toggleDark}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? "Light Mode" : "Dark Mode"}
        </Button>
      </div>

      <div className="grid gap-8">
        {/* Buttons Section */}
        <section className="space-y-4">
          <h2 className="text-h3 font-bold text-text border-l-4 border-primary pl-2">
            Buttons
          </h2>
          <Card>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-text-muted">Default Size</span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="danger">Danger Button</Button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-text-muted">Small Size</span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm">Primary Sm</Button>
                  <Button variant="secondary" size="sm">Secondary Sm</Button>
                  <Button variant="ghost" size="sm">Ghost Sm</Button>
                  <Button variant="danger" size="sm">Danger Sm</Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-text-muted">States</span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" disabled>Disabled Primary</Button>
                  <Button variant="secondary" disabled>Disabled Sec</Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Cards Section */}
        <section className="space-y-4">
          <h2 className="text-h3 font-bold text-text border-l-4 border-primary pl-2">
            Cards
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <h3 className="text-h4 font-bold text-text mb-2">Default Card</h3>
              <p className="text-sm text-text-muted">
                This is a default Card component with a subtle shadow and default background.
              </p>
            </Card>
            <Card inset>
              <h3 className="text-h4 font-bold text-text mb-2">Inset Card</h3>
              <p className="text-sm text-text-muted">
                This is an inset Card with a muted background style and no shadows.
              </p>
            </Card>
             <Card clickable onClick={() => setIsCardModalOpen(true)}>
              <h3 className="text-h4 font-bold text-text mb-2">Clickable Card</h3>
              <p className="text-sm text-text-muted">
                Hover over this card to see dynamic translation and drop shadow effects.
              </p>
            </Card>
          </div>
        </section>

        {/* Badges & Status Sections */}
        <section className="space-y-4">
          <h2 className="text-h3 font-bold text-text border-l-4 border-primary pl-2">
            Badges & Status
          </h2>
          <Card>
            <div className="grid gap-6">
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-text-muted">Badge Colors</span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="violet">Violet</Badge>
                  <Badge variant="sky">Sky</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="danger">Danger</Badge>
                  <Badge variant="neutral">Neutral</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-text-muted">Badges with Status Dots</span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="violet" showDot>Active</Badge>
                  <Badge variant="sky" showDot>Web Source</Badge>
                  <Badge variant="success" showDot>Indexed</Badge>
                  <Badge variant="warning" showDot>Processing</Badge>
                  <Badge variant="danger" showDot>Failed</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-text-muted">Activity Dots</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ActivityDot state="passed" />
                    <span className="text-sm text-text-muted">Passed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ActivityDot state="retry" />
                    <span className="text-sm text-text-muted">Retry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ActivityDot state="pending" />
                    <span className="text-sm text-text-muted">Pending</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-text-muted">Trend Badges</span>
                <div className="flex flex-wrap gap-2">
                  <TrendBadge value="+24.5%" />
                  <TrendBadge value="-12.3%" />
                  <TrendBadge value="0.0%" isUp={true} />
                  <TrendBadge value="Custom Text" isUp={false} />
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Inputs & Forms Section */}
        <section className="space-y-4">
          <h2 className="text-h3 font-bold text-text border-l-4 border-primary pl-2">
            Inputs & Forms
          </h2>
          <Card>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="Workspace Name"
                  placeholder="Enter workspace name..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  error="Please enter a valid email address"
                />
              </div>
              <div className="space-y-4">
                <Textarea
                  label="Workspace Description"
                  placeholder="Enter description..."
                />
                <Textarea
                  label="Feedback Note"
                  placeholder="Write feedback..."
                  error="Feedback cannot be empty"
                />
              </div>
            </div>
          </Card>
        </section>

        {/* Progress & Metrics Section */}
        <section className="space-y-4">
          <h2 className="text-h3 font-bold text-text border-l-4 border-primary pl-2">
            Progress & Metric Tracks
          </h2>
          <Card>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <span className="block text-xs font-semibold text-text-muted">Progress Bars (ProgressBar)</span>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>Uploading PDF...</span>
                      <span>35%</span>
                    </div>
                    <ProgressBar value={0.35} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>Index Completed</span>
                      <span>100%</span>
                    </div>
                    <ProgressBar value={1.0} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <span className="block text-xs font-semibold text-text-muted">Metric Match Bars (ScoreBar)</span>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>Faithfulness (Good)</span>
                      <span>0.95</span>
                    </div>
                    <ScoreBar value={0.95} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>Answer Relevance (Mid)</span>
                      <span>0.72</span>
                    </div>
                    <ScoreBar value={0.72} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>Context Recall (Bad)</span>
                      <span>0.45</span>
                    </div>
                    <ScoreBar value={0.45} />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Empty States Section */}
        <section className="space-y-4">
          <h2 className="text-h3 font-bold text-text border-l-4 border-primary pl-2">
            Empty States
          </h2>
          <EmptyState
            icon={FileText}
            title="No workspace sources found"
            description="Upload learning materials such as study PDFs or dynamically scrap tech docs using active LLM scraper tools."
            action={
              <Button variant="primary">
                <Plus size={16} />
                Add First Source
              </Button>
            }
          />
        </section>
      </div>

      {/* Visual Demo Modal */}
      <Modal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title="Card Clicked!"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsCardModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-2">
          <p>You have clicked the interactive demo card!</p>
          <p className="text-xs text-text-muted">
            This modal replaces the default browser <code>alert()</code> and matches prep.ai design tokens.
          </p>
        </div>
      </Modal>
    </div>
  );
}
