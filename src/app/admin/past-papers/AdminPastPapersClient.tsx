'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import PastPaperDataTable from '@/components/PastPaperDataTable';
import PastPaperModal from '@/components/PastPaperModal';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import ConfirmModal from '@/components/ui/confirm-modal';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { PastPaper, PastPaperFilters as PastPaperFiltersType } from '@/types/past-paper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pastPapersStaffService } from '@/services/pastPapersStaffService';
import { LuPlus as Plus, LuSearch as Search, LuX as X, LuFileText as LuFileText } from 'react-icons/lu';;

function PastPapersPageContent() {
  const { data: session } = useSession();
  
  const [pastPapers, setPastPapers] = useState<PastPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPaper, setEditingPaper] = useState<PastPaper | null>(null);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<PastPaper | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchPastPapers();
  }, [filters.page, filters.limit, filters.search]);

  const fetchPastPapers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.search && { search: filters.search })
      });

      const response = await pastPapersStaffService.listPastPapers(queryParams.toString());
      const data = await response.json();

      if (response.ok) {
        const pastPapersData = data?.data?.pastPapers ?? data?.pastPapers ?? [];
        const paginationData = data?.pagination ?? {
          page: filters.page,
          limit: filters.limit,
          total: Array.isArray(pastPapersData) ? pastPapersData.length : 0,
          pages: 1,
        };
        setPastPapers(Array.isArray(pastPapersData) ? pastPapersData : []);
        setPagination(paginationData);
      } else {
        console.error('Failed to fetch past papers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching past papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (searchValue: string) => {
    setSearch(searchValue);
    setFilters(prev => ({ ...prev, search: searchValue, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleAddPastPaper = () => {
    setEditingPaper(null);
    setShowForm(true);
  };

  const handleQuickSearch = () => {
    // Focus on the search input in the filters section
    const searchInput = document.querySelector('input[placeholder*="Search past papers"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleEditPastPaper = (paper: PastPaper) => {
    setEditingPaper(paper);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPaper(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPaper(null);
    fetchPastPapers();
  };

  const handleDeletePastPaper = (paper: PastPaper) => {
    setPaperToDelete(paper);
    setShowDeleteModal(true);
  };

  const confirmDeletePastPaper = async () => {
    if (!paperToDelete) return;

    setDeleting(true);
    try {
      const response = await pastPapersStaffService.deletePastPaper(paperToDelete._id);

      const data = await response.json();

      if (response.ok) {
        console.log('Past paper deleted successfully');
        fetchPastPapers();
        setShowDeleteModal(false);
        setPaperToDelete(null);
      } else {
        console.error('Failed to delete past paper:', data.error);
      }
    } catch (error) {
      console.error('Error deleting past paper:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeletePastPaper = () => {
    setShowDeleteModal(false);
    setPaperToDelete(null);
  };


  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title="Past Papers Management"
          description="Manage question papers, marks PDFs, and work solutions"
        />

        {/* Past Papers Table */}
        <PageSection 
          title="Past Papers"
          description="Complete list of all past papers in the system"
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search past papers..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10 w-full sm:w-64"
                  disabled={loading}
                />
                {search && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button 
                onClick={handleAddPastPaper}
                className="flex items-center gap-2 text-white w-full sm:w-auto transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                  boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #DB2777 0%, #9333EA 100%)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(236, 72, 153, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(236, 72, 153, 0.3)";
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Past Paper</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          }
        >
          <div className="w-full overflow-hidden">
            <PastPaperDataTable
              pastPapers={pastPapers}
              loading={loading}
              onEdit={handleEditPastPaper}
              onDelete={handleDeletePastPaper}
              pagination={pagination}
              onPageChange={handlePageChange}
              variant="table"
            />
          </div>
        </PageSection>

        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <Button
            onClick={handleAddPastPaper}
            size="lg"
            className="rounded-full w-14 h-14 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
              boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #DB2777 0%, #9333EA 100%)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(236, 72, 153, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(236, 72, 153, 0.3)";
            }}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>

        {/* Past Paper Modal */}
        <PastPaperModal
          open={showForm}
          pastPaper={editingPaper}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          onClose={cancelDeletePastPaper}
          onConfirm={confirmDeletePastPaper}
          title="Delete Past Paper"
          description={`Are you sure you want to delete "${paperToDelete?.sessionName} - ${paperToDelete?.subject}"? This action cannot be undone.`}
          confirmText="Delete Past Paper"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
      </main>
    </AdminRoleShell>
  );
}

export default function PastPapersPage() {
  return (
    <AdminPageWrapper>
      <PastPapersPageContent />
    </AdminPageWrapper>
  );
}
