import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UploadCloud, File, Globe, X, BookOpen } from "lucide-react";

import { useCreateBoard } from "../hooks/useBoards";
import { uploadPdf, triggerScraping } from "../api/sources";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";

const onboardingSchema = z.object({
  name: z.string().min(1, "Board name is required").max(120, "Name must be less than 120 characters"),
  description: z.string().optional(),
  scrapeQuery: z.string().optional(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

export function OnboardingPage() {
  const navigate = useNavigate();
  const createBoardMutation = useCreateBoard();
  
  const [activeSourceTab, setActiveSourceTab] = useState<"none" | "pdf" | "web">("none");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
  });

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setApiError(null);
      } else {
        setApiError("Only PDF files are supported for ingestion.");
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setApiError(null);
    }
  }

  async function onSubmit(data: OnboardingForm) {
    setIsLoading(true);
    setApiError(null);

    try {
      // 1. Create Board
      const board = await createBoardMutation.mutateAsync({
        name: data.name,
        description: data.description || "",
      });

      const boardId = board.id;

      // 2. Trigger source ingestion if configured
      if (activeSourceTab === "pdf" && selectedFile) {
        await uploadPdf(boardId, selectedFile);
      } else if (activeSourceTab === "web" && data.scrapeQuery) {
        await triggerScraping(boardId, data.scrapeQuery);
      }

      // Redirect to the newly created board's sources view
      navigate(`/boards/${boardId}/sources`);
    } catch (err: any) {
      console.error("[OnboardingPage] create error", err);
      const detail = err.response?.data?.detail || "Failed to create board workspace. Please try again.";
      setApiError(detail);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex flex-col md:grid md:grid-cols-12 md:gap-8 items-center py-12 px-2 max-w-[1120px] mx-auto">
      {/* Left Column: Explanations */}
      <div className="hidden md:flex md:col-span-5 flex-col space-y-6 pr-6">
        <div className="space-y-3">
          <h2 className="text-display font-extrabold text-text tracking-tight text-[36px] leading-tight">
            Configure your workspace
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Boards bind study resources together. By linking source docs, you configure the retrieval knowledge scope prep.ai uses to run learning reviews.
          </p>
        </div>

        <div className="p-5 bg-surface-2 rounded-lg border border-border flex items-start gap-4">
          <BookOpen className="text-primary mt-1 shrink-0" size={20} />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-text">What is a Board?</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Think of a Board as a target subject (e.g., "Kubernetes Core", "FastAPI Reference"). Grounding vectors are sandbox-scoped to this board only.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Setup Card */}
      <div className="col-span-12 md:col-span-7 flex justify-center w-full">
        <Card className="w-full max-w-[540px] space-y-6">
          <div>
            <h1 className="text-h2 font-extrabold text-text">New Board Workspace</h1>
            <p className="text-xs text-text-muted mt-1">
              Provide workspace details and optionally attach your first learning source.
            </p>
          </div>

          {apiError && (
            <div className="bg-danger-soft border border-danger/20 rounded-md p-3 text-xs text-danger-text font-semibold">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Board Info */}
            <div className="space-y-4">
              <Input
                label="Board Name"
                type="text"
                placeholder="e.g. Systems Architecture"
                error={errors.name?.message}
                disabled={isLoading}
                {...register("name")}
              />
              <Textarea
                label="Description (Optional)"
                placeholder="Brief summary of topics covered in this study board..."
                error={errors.description?.message}
                disabled={isLoading}
                rows={2}
                {...register("description")}
              />
            </div>

            {/* Step 2: Optional Source Selection */}
            <div className="space-y-3 border-t border-border pt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                Add First Source (Optional)
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(["none", "pdf", "web"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      if (!isLoading) setActiveSourceTab(tab);
                    }}
                    className={`py-2 px-3 border rounded-md text-xs font-semibold select-none cursor-pointer transition-all ${
                      activeSourceTab === tab
                        ? "bg-primary border-primary text-on-primary shadow-sm"
                        : "bg-surface border-border text-text-muted hover:text-text hover:border-border-strong"
                    }`}
                  >
                    {tab === "none" && "Skip Source"}
                    {tab === "pdf" && "Upload PDF"}
                    {tab === "web" && "Fetch Doc"}
                  </button>
                ))}
              </div>

              {/* PDF upload field */}
              {activeSourceTab === "pdf" && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isLoading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all select-none ${
                    dragOver
                      ? "border-primary bg-primary-soft/10"
                      : "border-border-strong hover:border-primary/50 hover:bg-surface-2"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf"
                    className="hidden"
                    disabled={isLoading}
                  />

                  {selectedFile ? (
                    <div className="flex items-center gap-3 w-full bg-surface-3 p-3 rounded border border-border">
                      <File className="text-primary shrink-0" size={24} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-text-muted">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-text-muted hover:text-danger p-1 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={28} className="text-text-muted" />
                      <span className="text-xs font-semibold text-text">Drag and drop PDF here</span>
                      <span className="text-[10px] text-text-muted">or click to browse local files (max 10MB)</span>
                    </>
                  )}
                </div>
              )}

              {/* Web scraper field */}
              {activeSourceTab === "web" && (
                <div className="space-y-2">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
                    <input
                      type="text"
                      placeholder="e.g. FastAPI docs scraper query"
                      disabled={isLoading}
                      className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-md text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
                      {...register("scrapeQuery")}
                    />
                  </div>
                  {errors.scrapeQuery?.message && (
                    <p className="text-xs text-danger-text">{errors.scrapeQuery.message}</p>
                  )}
                  <p className="text-[10px] text-text-muted leading-relaxed">
                    The web crawler will fetch target pages and ingest text content into your vector index.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigate("/dashboard")}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? "Creating workspace..." : "Create Board"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
