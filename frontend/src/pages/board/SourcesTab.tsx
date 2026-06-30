import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import { FileText, Globe, Plus, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useSources, useUploadPdf, useTriggerScraping, useDeleteSource } from "../../hooks/useSources";
import { Button } from "../../components/ui/Button";
import { Badge, BadgeVariant } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { MAX_PDF_MB } from "../../lib/constants";

export function SourcesTab() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: sources, isLoading, isError } = useSources(boardId);
  const uploadPdfMutation = useUploadPdf(boardId);
  const triggerScrapingMutation = useTriggerScraping(boardId);
  const deleteSourceMutation = useDeleteSource(boardId);

  // Modal & Tab States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pdf" | "web">("pdf");
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);

  // PDF Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Web Scraping States
  const [webQuery, setWebQuery] = useState("");
  const [webError, setWebError] = useState<string | null>(null);

  // Modal Handlers
  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedFile(null);
    setUploadError(null);
    setWebQuery("");
    setWebError(null);
  }

  function handleDeleteConfirm() {
    if (!deletingSourceId) return;
    deleteSourceMutation.mutate(deletingSourceId, {
      onSuccess: () => {
        setDeletingSourceId(null);
      },
    });
  }

  // Drag & Drop Handlers
  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  // Handle Drag Leave
  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  }

  function validateAndSetFile(file: File) {
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are supported.");
      return;
    }
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_PDF_MB) {
      setUploadError(`File size exceeds the limit of ${MAX_PDF_MB}MB.`);
      return;
    }
    setSelectedFile(file);
  }

  // Submit Handlers
  async function handleUploadSubmit() {
    if (!selectedFile) return;
    setUploadError(null);

    uploadPdfMutation.mutate(
      { file: selectedFile },
      {
        onSuccess: () => {
          handleCloseModal();
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.detail || "Failed to upload PDF. Please try again.";
          setUploadError(errMsg);
        },
      }
    );
  }

  async function handleWebSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!webQuery.trim()) return;
    setWebError(null);

    triggerScrapingMutation.mutate(
      { query: webQuery },
      {
        onSuccess: () => {
          handleCloseModal();
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.detail || "Failed to trigger documentation scrape. Please try again.";
          setWebError(errMsg);
        },
      }
    );
  }

  // Helper for Badge Mapping
  function getStatusBadge(status: string, errorMsg: string | null) {
    let variant: BadgeVariant = "neutral";
    let text = status;

    switch (status) {
      case "pending":
        variant = "sky";
        text = "Pending";
        break;
      case "processing":
        variant = "warning";
        text = "Processing";
        break;
      case "indexed":
        variant = "success";
        text = "Indexed";
        break;
      case "failed":
        variant = "danger";
        text = "Failed";
        break;
    }

    return (
      <div className="flex flex-col items-end gap-1">
        <Badge variant={variant} showDot={status !== "indexed"}>
          {text}
        </Badge>
        {status === "failed" && errorMsg && (
          <span className="text-[11px] text-danger-text font-semibold max-w-[200px] text-right truncate" title={errorMsg}>
            {errorMsg}
          </span>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-text-muted text-sm font-semibold">Loading sources...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-danger-soft border border-danger/20 rounded-lg p-4 text-sm text-danger-text font-semibold flex items-center gap-2">
        <AlertCircle size={16} />
        Could not load sources for this workspace. Please refresh the page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center bg-surface border border-border rounded-lg p-5 shadow-xs">
        <div>
          <h2 className="text-h2 font-bold text-text">Workspace Sources</h2>
          <p className="text-sm text-text-muted mt-1">
            Manage files and technical documentation scraped by the Agent to build the active learning workspace.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus size={16} />
          Add source
        </Button>
      </div>

      {/* Main List */}
      {!sources || sources.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No sources added"
          description="Upload a learning PDF or specify online technical documentation. The Agent will parse, summarize, and semantically index it for active recall."
          action={
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <Plus size={16} />
              Add first source
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sources.map((source) => (
            <Card
              key={source.id}
              className="flex items-center justify-between gap-4 p-[14px] bg-surface border border-border rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted shrink-0">
                  {source.type === "PDF" ? <FileText size={20} /> : <Globe size={20} />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-bold text-text truncate max-w-md" title={source.title}>
                    {source.title}
                  </h4>
                  <p className="text-[12px] text-text-subtle mt-[2px]">
                    Added on {new Date(source.created_at).toLocaleDateString()} · {source.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(source.status, source.error_message)}
                <Button
                  variant="ghost"
                  onClick={() => setDeletingSourceId(source.id)}
                  className="text-danger-text hover:bg-danger-soft p-2 shrink-0 border border-transparent shadow-none"
                  title="Delete source"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Source Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Add Learning Source">
        <div className="space-y-5">
          {/* Tab selector */}
          <div className="flex bg-surface-2 p-[3px] rounded-lg border border-border">
            <button
              onClick={() => setActiveTab("pdf")}
              className={`flex-1 py-2 text-[13px] font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === "pdf"
                  ? "bg-surface text-text shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Upload PDF
            </button>
            <button
              onClick={() => setActiveTab("web")}
              className={`flex-1 py-2 text-[13px] font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === "web"
                  ? "bg-surface text-text shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Fetch Documentation
            </button>
          </div>

          {/* PDF Upload Tab */}
          {activeTab === "pdf" && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-[1.5px] border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary-soft/10"
                    : "border-border-strong bg-surface hover:bg-surface-2"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
                <FileText className="text-text-muted mb-2" size={32} />
                <p className="text-sm font-semibold text-text mb-1">
                  {selectedFile ? selectedFile.name : "Drag & drop your PDF here"}
                </p>
                <p className="text-[12px] text-text-subtle">
                  {selectedFile
                    ? `Size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : `Supports files up to ${MAX_PDF_MB}MB`}
                </p>
              </div>

              {uploadError && (
                <div className="bg-danger-soft border border-danger/10 text-danger-text text-[13px] rounded-md p-3 flex items-start gap-2 font-semibold">
                  <AlertCircle size={16} className="shrink-0 mt-[2px]" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadSubmit}
                  disabled={!selectedFile || uploadPdfMutation.isPending}
                  className="min-w-[100px]"
                >
                  {uploadPdfMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Upload & Ingest"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Web Scraping Tab */}
          {activeTab === "web" && (
            <form onSubmit={handleWebSubmit} className="space-y-4">
              <div className="space-y-1">
                <p className="text-[13px] text-text-muted leading-relaxed">
                  Provide a library name or documentation URL. The Web Scraper Agent will resolve, fetch, and summarize the relevant documentation pages.
                </p>
              </div>
              <Input
                label="Technology or Docs URL"
                placeholder="e.g. FastAPI, or https://fastapi.tiangolo.com/tutorial/"
                value={webQuery}
                onChange={(e) => setWebQuery(e.target.value)}
                disabled={triggerScrapingMutation.isPending}
                required
              />

              {webError && (
                <div className="bg-danger-soft border border-danger/10 text-danger-text text-[13px] rounded-md p-3 flex items-start gap-2 font-semibold">
                  <AlertCircle size={16} className="shrink-0 mt-[2px]" />
                  <span>{webError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!webQuery.trim() || triggerScrapingMutation.isPending}
                  className="min-w-[100px]"
                >
                  {triggerScrapingMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Fetch & Ingest"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingSourceId}
        onClose={() => setDeletingSourceId(null)}
        title="Delete Source"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            Are you sure you want to delete this source? This will permanently remove the document, its Postgres database records, and all corresponding semantic chunks from the vector database.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeletingSourceId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={deleteSourceMutation.isPending}
              className="min-w-[100px]"
            >
              {deleteSourceMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
