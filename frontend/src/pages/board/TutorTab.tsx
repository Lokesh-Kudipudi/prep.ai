import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { MessageSquare, Sparkles, Loader2, Send, Power, Code, Play, CheckCircle2, ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
import {
  useTutorSessions,
  useTutorSession,
  useCreateTutorSession,
  useSendTutorMessage,
  useRunCode,
  useSubmitCode,
  useStopTutorSession,
  useDeleteTutorSession
} from "../../hooks/useTutor";
import { useSources } from "../../hooks/useSources";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { cn } from "../../lib/utils";

function getMonacoLanguage(lang: string | undefined): string {
  if (!lang) return "python";
  const l = lang.toLowerCase().trim();
  if (l === "c++" || l === "cpp") return "cpp";
  if (l === "c#" || l === "csharp") return "csharp";
  if (l === "js") return "javascript";
  if (l === "ts") return "typescript";
  return l;
}

export function TutorTab() {
  const { boardId } = useParams<{ boardId: string }>();

  // Verify sources
  const { data: sources, isLoading: isSourcesLoading } = useSources(boardId);
  
  // Data queries
  const { data: sessions, isLoading: isSessionsLoading } = useTutorSessions(boardId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { data: activeSession } = useTutorSession(activeSessionId || undefined);

  // Mutations
  const createSessionMutation = useCreateTutorSession(boardId);
  const sendMessageMutation = useSendTutorMessage(activeSessionId || undefined);
  const runCodeMutation = useRunCode(activeSessionId || undefined);
  const submitCodeMutation = useSubmitCode(activeSessionId || undefined);
  const stopSessionMutation = useStopTutorSession(activeSessionId || undefined);
  const deleteSessionMutation = useDeleteTutorSession(boardId);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [topicInput, setTopicInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [codeValue, setCodeValue] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<{ stdout: string; stderr: string } | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // Set default active session when list loads
  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Determine if a code assignment is currently active (last message has assignment and no reviewer response followed it)
  const messages = activeSession?.messages || [];
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isAssignmentActive = latestMessage?.role === "system" && !!latestMessage.code_assignment;

  let activeTask: any = null;
  if (isAssignmentActive && latestMessage?.code_assignment) {
    try {
      activeTask = JSON.parse(latestMessage.code_assignment);
    } catch (e) {
      console.error("Failed to parse code_assignment: ", e);
    }
  }

  // Populate code editor with starter code when a task is activated
  useEffect(() => {
    if (activeTask?.starter_code) {
      setCodeValue(activeTask.starter_code);
      setConsoleOutput(null);
    }
  }, [activeTask?.starter_code]);

  // Handlers
  function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!topicInput.trim()) return;
    createSessionMutation.mutate(
      { topic: topicInput },
      {
        onSuccess: (data) => {
          setTopicInput("");
          setActiveSessionId(data.id);
        },
      }
    );
  }

  function handleDeleteClick(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    setSessionToDelete(sessionId);
  }

  function confirmDeleteSession() {
    if (!sessionToDelete) return;
    deleteSessionMutation.mutate(sessionToDelete, {
      onSuccess: () => {
        const deletedId = sessionToDelete;
        setSessionToDelete(null);
        if (activeSessionId === deletedId) {
          const remaining = sessions?.filter((s) => s.id !== deletedId) || [];
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
          } else {
            setActiveSessionId(null);
          }
        }
      },
    });
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || sendMessageMutation.isPending) return;
    
    const text = messageInput;
    setMessageInput("");
    sendMessageMutation.mutate({ content: text });
  }

  function handleStopSession() {
    if (!activeSessionId) return;
    stopSessionMutation.mutate();
  }

  function handleRunCode() {
    if (!activeTask) return;
    runCodeMutation.mutate(
      { code: codeValue, language: activeTask.language },
      {
        onSuccess: (data) => {
          setConsoleOutput({ stdout: data.stdout, stderr: data.stderr });
        },
      }
    );
  }

  function handleSubmitCode() {
    if (!activeTask) return;
    submitCodeMutation.mutate(
      { code: codeValue, language: activeTask.language },
      {
        onSuccess: () => {
          setConsoleOutput(null);
        },
      }
    );
  }

  // 1. Loading States
  if (isSourcesLoading || isSessionsLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-surface border border-border rounded-lg shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-text-muted text-sm font-semibold">Loading lessons...</span>
      </div>
    );
  }

  // 2. Empty Sources State - Block tutor sessions
  const hasNoSources = !sources || sources.length === 0;
  const hasNoIndexedSources = sources?.every((s) => s.status !== "indexed");
  if (hasNoSources || hasNoIndexedSources) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Add indexed sources first"
        description="Your AI Tutor conducts interactive chats and designs code challenges based on board documentation. Ingest and index sources before starting a lesson."
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch h-[calc(100vh-115px)] min-h-0 overflow-hidden">
      {/* 1. Left Sidebar: Lesson topics list */}
      <div className={cn("lg:col-span-1 flex flex-col gap-4 min-h-0 transition-all duration-300", !isSidebarOpen && "hidden")}>
        {/* Create new lesson Form */}
        <Card className="p-4 bg-surface border border-border rounded-lg shrink-0">
          <form onSubmit={handleCreateSession} className="space-y-3">
            <h4 className="text-[12px] font-bold text-text-muted uppercase tracking-wider">Start New Lesson</h4>
            <Input
              placeholder="e.g. FastAPI Routes, Python Generators"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              disabled={createSessionMutation.isPending}
              required
            />
            <Button
              type="submit"
              disabled={createSessionMutation.isPending}
              className="w-full flex items-center justify-center gap-2 text-xs"
              size="sm"
            >
              {createSessionMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              {createSessionMutation.isPending ? "Generating..." : "Start Lesson"}
            </Button>
          </form>
        </Card>

        {/* Existing sessions */}
        <Card className="flex-1 p-4 bg-surface border border-border rounded-lg flex flex-col gap-3 min-h-0">
          <h4 className="text-[12px] font-bold text-text-muted uppercase tracking-wider">Lessons List</h4>
          {!sessions || sessions.length === 0 ? (
            <p className="text-xs text-text-subtle italic text-center py-6">No lessons started yet.</p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 pr-1">
              {sessions.map((sess) => {
                const isSelected = activeSessionId === sess.id;
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setActiveSessionId(sess.id);
                      setConsoleOutput(null);
                    }}
                    className={cn(
                      "group p-3 rounded-lg border text-xs font-bold transition-all duration-150 flex items-center justify-between cursor-pointer relative",
                      isSelected
                        ? "bg-primary-soft text-primary-hover border-primary-hover/30"
                        : "bg-surface-2 hover:bg-surface-3 border-border"
                    )}
                  >
                    <span className="truncate max-w-[110px]">{sess.topic}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={sess.status === "active" ? "success" : "neutral"} className="scale-[0.85]">
                        {sess.status === "active" ? "Active" : "Closed"}
                      </Badge>
                      <button
                        onClick={(e) => handleDeleteClick(e, sess.id)}
                        disabled={deleteSessionMutation.isPending}
                        className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-surface-3 transition-all cursor-pointer shrink-0"
                        title="Delete session"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* 2. Main Workspace: Chat thread + Editor split */}
      <div className={cn("flex gap-6 items-stretch min-h-0", isSidebarOpen ? "lg:col-span-3" : "lg:col-span-4")}>
        <Card
          className={cn(
            "flex flex-col p-5 bg-surface border border-border rounded-lg shadow-sm transition-all duration-300 w-full min-h-0",
            activeTask ? "w-1/2" : "w-full"
          )}
        >
          {activeSession ? (
            <div className="flex-1 flex flex-col justify-between min-h-0">
              {/* Chat Header */}
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="text-text-muted hover:text-text p-1.5 rounded-lg border border-transparent shadow-none shrink-0"
                    title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                  >
                    {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                  </Button>
                  <div>
                    <h3 className="text-sm font-bold text-text">{activeSession.topic}</h3>
                    <p className="text-[11px] text-text-subtle">Personalized AI Tutor dialogue loop</p>
                  </div>
                </div>
                {activeSession.status === "active" && (
                  <Button
                    onClick={handleStopSession}
                    disabled={stopSessionMutation.isPending}
                    variant="danger"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Power size={12} />
                    End Lesson
                  </Button>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm min-h-0">
                {messages.map((msg) => {
                  if (msg.role === "system") {
                    return (
                      <div key={msg.id} className="flex flex-col gap-1 max-w-[85%] animate-in fade-in duration-150">
                        <span className="text-[11px] font-bold text-text-muted uppercase">Tutor</span>
                        <div className="bg-surface-2 border border-border p-3 rounded-lg rounded-tl-[2px] leading-relaxed text-text">
                          {msg.content}
                          {msg.code_assignment && (
                            <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-primary bg-primary-soft px-2 py-1 rounded w-fit">
                              <Code size={12} />
                              Coding Challenge Issued
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (msg.role === "reviewer") {
                    const isExpanded = expandedReviewId === msg.id;
                    return (
                      <div key={msg.id} className="flex flex-col gap-1 w-full animate-in fade-in duration-200">
                        <span className="text-[11px] font-bold text-primary uppercase">Code Reviewer Agent</span>
                        <div className="bg-primary-soft/10 border border-primary/20 p-4 rounded-lg leading-relaxed text-text-muted space-y-2">
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          
                          {/* Collapsible submitted code */}
                          {msg.code_submission && (
                            <div className="border-t border-primary/10 pt-2">
                              <button
                                onClick={() => setExpandedReviewId(isExpanded ? null : msg.id)}
                                className="flex items-center gap-1 text-[11px] font-bold text-text hover:text-primary transition-colors cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                {isExpanded ? "Hide Submission" : "View Submitted Code"}
                              </button>
                              {isExpanded && (
                                <pre className="mt-2 bg-[#1E1B2E] text-white p-3 rounded font-mono text-[12px] overflow-x-auto whitespace-pre-wrap border border-border">
                                  <code>{msg.code_submission}</code>
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Student User response
                  return (
                    <div key={msg.id} className="flex flex-col gap-1 max-w-[80%] ml-auto items-end animate-in fade-in duration-150">
                      <span className="text-[11px] font-bold text-text-subtle uppercase">Student</span>
                      <div className="bg-primary text-on-primary p-3 rounded-lg rounded-tr-[2px] leading-relaxed shadow-xs">
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Footer / Input area */}
              {activeSession.status === "active" ? (
                <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-border mt-4">
                  <Input
                    placeholder={isAssignmentActive ? "Submit your code in the sidebar workspace..." : "Type your answer or request code tasks..."}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={isAssignmentActive || sendMessageMutation.isPending}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={isAssignmentActive || !messageInput.trim() || sendMessageMutation.isPending}
                    className="flex items-center gap-1 px-4"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Send
                  </Button>
                </form>
              ) : (
                <div className="pt-3 border-t border-border text-center text-xs text-text-subtle font-semibold italic mt-4">
                  This practice lesson has ended.
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex justify-start items-center pb-3 border-b border-border mb-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="text-text-muted hover:text-text p-1.5 rounded-lg border border-transparent shadow-none shrink-0"
                  title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                </Button>
                <span className="text-xs font-bold text-text-muted uppercase ml-2">Tutor Workspace</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 h-[400px]">
                <MessageSquare className="text-text-subtle mb-3" size={32} />
                <h4 className="text-sm font-bold text-text">No active lesson selected</h4>
                <p className="text-xs text-text-muted mt-1 max-w-[280px] leading-relaxed">
                  {isSidebarOpen ? "Choose an ongoing session from the sidebar or enter a topic to start a personalized learning loop." : "Expand the sidebar using the button above to start or choose a lesson."}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* 3. Editor Workspace: Opens only when a task is issued */}
        {activeTask && activeSession && (
          <Card className="w-1/2 border border-primary/20 bg-surface rounded-lg p-5 flex flex-col justify-between gap-4 animate-in slide-in-from-right-4 duration-300 min-h-0">
            <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
              <div className="flex justify-between items-start gap-2 pb-2 border-b border-border">
                <div>
                  <h4 className="text-sm font-bold text-text">{activeTask.title}</h4>
                  <span className="text-[10px] font-mono font-bold uppercase bg-surface-3 px-2 py-0.5 rounded text-text-muted">
                    Language: {activeTask.language}
                  </span>
                </div>
              </div>

              {/* Assignment Details */}
              <div className="bg-surface-2 p-3 rounded border border-border text-[12.5px] text-text-muted max-h-[100px] overflow-y-auto leading-relaxed">
                <p className="font-semibold text-text mb-1">Task Requirements:</p>
                <p>{activeTask.description}</p>
              </div>

              {/* Editor Workspace */}
              <div className="flex-1 flex flex-col min-h-0">
                <label className="text-[11px] font-bold text-text-muted uppercase mb-1 flex items-center gap-1">
                  <Code size={12} />
                  Code Editor
                </label>
                <div 
                  className="flex-1 w-full rounded-lg overflow-hidden border min-h-[150px] bg-[#1e1e1e]"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <Editor
                    height="100%"
                    width="100%"
                    language={getMonacoLanguage(activeTask.language)}
                    theme="vs-dark"
                    value={codeValue}
                    onChange={(val) => setCodeValue(val || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      readOnly: runCodeMutation.isPending || submitCodeMutation.isPending,
                      tabSize: 4,
                      padding: { top: 8, bottom: 8 }
                    }}
                  />
                </div>
              </div>

              {/* Console logs output */}
              {consoleOutput && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-text-muted uppercase">Console Output</span>
                  <div className="bg-[#151221] p-3 rounded-lg border border-border text-[11px] font-mono max-h-[96px] overflow-y-auto select-text">
                    {consoleOutput.stderr ? (
                      <span className="text-danger-text whitespace-pre-wrap">{consoleOutput.stderr}</span>
                    ) : (
                      <span className="text-success-text whitespace-pre-wrap">{consoleOutput.stdout || "(run completed with no stdout)"}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Editor Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="secondary"
                onClick={handleRunCode}
                disabled={runCodeMutation.isPending || submitCodeMutation.isPending}
                size="sm"
                className="flex items-center gap-1 text-xs"
              >
                {runCodeMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} />
                )}
                Run Code
              </Button>
              
              <Button
                onClick={handleSubmitCode}
                disabled={submitCodeMutation.isPending || runCodeMutation.isPending}
                size="sm"
                className="flex items-center gap-1 text-xs min-w-[90px]"
              >
                {submitCodeMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin m-auto" />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                {submitCodeMutation.isPending ? "Reviewing..." : "Submit Code"}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        title="Delete Lesson"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setSessionToDelete(null)} disabled={deleteSessionMutation.isPending}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDeleteSession} disabled={deleteSessionMutation.isPending}>
              {deleteSessionMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        Are you sure you want to delete this learning session? All chat logs, reviews, and code submissions will be permanently deleted.
      </Modal>
    </div>
  );
}
