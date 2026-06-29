import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Settings, Trash2 } from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import { useIntegrationsStatus, useUpdateProfile, useDeleteAccount } from "../hooks/useSettings";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";

// Zod schema for profile validation
const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Full name must be under 100 characters"),
  email: z.string().email("Enter a valid email address"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function SettingsPage() {
  const { user } = useAuth();
  const { data: integrations, isLoading: isIntegrationsLoading, refetch: refetchIntegrations } = useIntegrationsStatus();
  
  const updateProfileMutation = useUpdateProfile();
  const deleteAccountMutation = useDeleteAccount();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name ?? "",
      email: user?.email ?? "",
    },
  });

  // Sync default values when user loads/changes
  useEffect(() => {
    if (user) {
      setValue("full_name", user.full_name);
      setValue("email", user.email);
    }
  }, [user, setValue]);

  async function handleProfileSubmit(data: ProfileFormValues) {
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      await updateProfileMutation.mutateAsync(data);
      setSubmitSuccess(true);
      // Auto fade success message
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail ?? "Failed to update profile details. Please try again.");
    }
  }

  async function handleDeleteConfirm() {
    if (deleteConfirmText !== "DELETE") return;
    try {
      await deleteAccountMutation.mutateAsync();
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("[settings] Delete account failed:", err);
    }
  }

  return (
    <div className="py-8 max-w-[760px] mx-auto space-y-8">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Settings className="w-8 h-8 text-primary" />
        <h1 className="text-h1 font-extrabold text-text tracking-tight">Settings</h1>
      </div>

      {/* Profile Card */}
      <Card className="p-6 space-y-4">
        <h2 className="text-h3 font-bold text-text">Profile</h2>
        <div className="h-[1px] bg-border w-full" />
        
        <form onSubmit={handleSubmit(handleProfileSubmit)} className="space-y-4">
          <Input
            label="Full name"
            {...register("full_name")}
            error={errors.full_name?.message}
          />
          <Input
            label="Email"
            type="email"
            {...register("email")}
            error={errors.email?.message}
          />
          
          {submitError && (
            <div className="text-xs font-semibold text-danger bg-danger-soft p-3 rounded-md">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="text-xs font-semibold text-success bg-success-soft p-3 rounded-md">
              Profile updated successfully!
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Integrations Card */}
      <Card className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-h3 font-bold text-text">Integrations</h2>
          <Button variant="secondary" size="sm" onClick={() => refetchIntegrations()}>
            Refresh
          </Button>
        </div>
        <div className="h-[1px] bg-border w-full" />

        <div className="space-y-3">
          {/* LangSmith Tracing */}
          <div className="flex justify-between items-center p-3 hover:bg-surface-2 border border-border hover:border-border-strong rounded-[10px] transition-all">
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-text">LangSmith tracing</div>
              <div className="text-xs text-text-muted">Cloud run tracing for every generation</div>
            </div>
            {isIntegrationsLoading ? (
              <span className="text-xs text-text-subtle">Checking...</span>
            ) : integrations?.langsmith === "Connected" ? (
              <Badge variant="success" showDot>Connected</Badge>
            ) : (
              <Badge variant="neutral">Not configured</Badge>
            )}
          </div>

          {/* Piston Sandbox */}
          <div className="flex justify-between items-center p-3 hover:bg-surface-2 border border-border hover:border-border-strong rounded-[10px] transition-all">
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-text">Piston sandbox</div>
              <div className="text-xs text-text-muted">Local code execution sandbox · Port 2000</div>
            </div>
            {isIntegrationsLoading ? (
              <span className="text-xs text-text-subtle">Checking...</span>
            ) : integrations?.piston === "Healthy" ? (
              <Badge variant="success" showDot>Healthy</Badge>
            ) : (
              <Badge variant="danger" showDot>Unreachable</Badge>
            )}
          </div>

          {/* Anki Export */}
          <div className="flex justify-between items-center p-3 hover:bg-surface-2 border border-border hover:border-border-strong rounded-[10px] transition-all">
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-text">Anki export</div>
              <div className="text-xs text-text-muted">Download study flashcard decks as .apkg</div>
            </div>
            {isIntegrationsLoading ? (
              <span className="text-xs text-text-subtle">Checking...</span>
            ) : integrations?.anki === "Available" ? (
              <Badge variant="sky" showDot>Available</Badge>
            ) : (
              <Badge variant="neutral">Not configured</Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-danger-soft p-6 space-y-4">
        <h2 className="text-h3 font-bold text-danger-text">Danger zone</h2>
        <div className="h-[1px] bg-danger-soft/20 w-full" />
        
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-text">Delete account</div>
            <div className="text-xs text-text-muted">
              Permanently removes your account and cascade deletes all boards, sources, and indexes.
            </div>
          </div>
          <div className="shrink-0">
            <Button variant="danger" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
              <Trash2 className="w-4 h-4 mr-1.5 inline" /> Delete account
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteConfirmText("");
        }}
        title="Delete account permanently"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
              onClick={handleDeleteConfirm}
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            This action is irreversible. All of your custom Boards, indexed PDF documents, generated study materials (Quizzes, Flashcards), and transcripts will be permanently purged.
          </p>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted">
              Type <strong className="text-danger">DELETE</strong> below to confirm:
            </label>
            <input
              type="text"
              className="w-full bg-surface border border-border-strong rounded-[10px] px-3.5 py-2 text-sm text-text focus:outline-none focus:border-danger focus:ring-2 focus:ring-danger-soft/30 transition-all font-mono"
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
