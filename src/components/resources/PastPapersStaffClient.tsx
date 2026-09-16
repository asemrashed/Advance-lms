"use client";

import { useState, type ReactNode } from "react";
import { AdminRoleShell } from "@/components/role-area/AdminRoleShell";
import { InstructorRoleShell } from "@/components/role-area/InstructorRoleShell";
import AdminPageWrapper from "@/components/AdminPageWrapper";
import PastPaperModal from "@/components/PastPaperModal";
import WelcomeSection from "@/components/WelcomeSection";
import ConfirmModal from "@/components/ui/confirm-modal";
import { PastPapersBrowseClient } from "@/components/resources/PastPapersBrowseClient";
import { pastPapersStaffService } from "@/services/pastPapersStaffService";
import type { PublicPastPaperRow } from "@/services/pastPapersPublicService";
import type { PastPaper } from "@/types/past-paper";

type PastPapersStaffClientProps = {
  role: "admin" | "instructor";
};

function Shell({
  role,
  children,
}: {
  role: "admin" | "instructor";
  children: ReactNode;
}) {
  if (role === "admin") {
    return (
      <AdminRoleShell>
        <AdminPageWrapper>{children}</AdminPageWrapper>
      </AdminRoleShell>
    );
  }
  return <InstructorRoleShell>{children}</InstructorRoleShell>;
}

export function PastPapersStaffClient({ role }: PastPapersStaffClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingPaper, setEditingPaper] = useState<PastPaper | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<PublicPastPaperRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddPastPaper = () => {
    setEditingPaper(null);
    setShowForm(true);
  };

  const handleEditPastPaper = async (paper: PublicPastPaperRow) => {
    try {
      const response = await pastPapersStaffService.getPastPaper(paper._id);
      const data = await response.json();
      const full = (data?.pastPaper || data?.data?.pastPaper) as
        | PastPaper
        | undefined;
      if (!response.ok || !full) {
        console.error("Failed to load past paper:", data?.error);
        return;
      }
      setEditingPaper(full);
      setShowForm(true);
    } catch (error) {
      console.error("Error loading past paper:", error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPaper(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPaper(null);
    setRefreshKey((key) => key + 1);
  };

  const confirmDeletePastPaper = async () => {
    if (!paperToDelete) return;

    setDeleting(true);
    try {
      const response = await pastPapersStaffService.deletePastPaper(
        paperToDelete._id,
      );
      if (response.ok) {
        setShowDeleteModal(false);
        setPaperToDelete(null);
        setRefreshKey((key) => key + 1);
      } else {
        const data = await response.json();
        console.error("Failed to delete past paper:", data.error);
      }
    } catch (error) {
      console.error("Error deleting past paper:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Shell role={role}>
      <main className="relative z-10 p-2 sm:p-4">
        <WelcomeSection
          title="Past Papers"
          description="Upload and manage past exam question papers (PDF only)"
        />

        <PastPapersBrowseClient
          context="admin"
          showPageHeader={false}
          manage
          refreshKey={refreshKey}
          onAdd={handleAddPastPaper}
          onEdit={(paper) => void handleEditPastPaper(paper)}
          onDelete={(paper) => {
            setPaperToDelete(paper);
            setShowDeleteModal(true);
          }}
        />

        <PastPaperModal
          open={showForm}
          pastPaper={editingPaper}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />

        <ConfirmModal
          open={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setPaperToDelete(null);
          }}
          onConfirm={confirmDeletePastPaper}
          title="Delete Past Paper"
          description={`Are you sure you want to delete "${paperToDelete?.sessionName} - ${paperToDelete?.subject}"? This action cannot be undone.`}
          confirmText="Delete Past Paper"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
      </main>
    </Shell>
  );
}
