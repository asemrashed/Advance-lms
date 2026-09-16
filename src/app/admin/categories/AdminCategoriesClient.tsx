'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { useCourseCategories } from '@/hooks/useCourseCategories';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import CategoryDataTable from '@/components/CategoryDataTable';
import CategoryModal from '@/components/CategoryModal';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import ConfirmModal from '@/components/ui/confirm-modal';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { CourseCategory } from '@/types/course-category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { LuPlus as Plus, LuSearch as Search, LuX as X } from 'react-icons/lu';;

function CategoriesPageContent() {
  const { user } = useAppSelector((state) => state.auth);
  
  // Use the course categories hook
  const {
    categories,
    loading,
    error,
    pagination,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCourseCategories();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CourseCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 10
  });

  // Fetch categories when filters change
  useEffect(() => {
    fetchCategories(filters);
  }, [filters, fetchCategories]);

  const handleSearchChange = (searchValue: string) => {
    setSearch(searchValue);
    setFilters(prev => ({ ...prev, search: searchValue, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEditCategory = (category: CourseCategory) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDeleteCategory = (category: CourseCategory) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setDeleting(true);
    try {
      const success = await deleteCategory(categoryToDelete._id);
      if (success) {
        console.log('Category deleted successfully');
        setShowDeleteModal(false);
        setCategoryToDelete(null);
      } else {
        console.error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteCategory = () => {
    setShowDeleteModal(false);
    setCategoryToDelete(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCategory(null);
    // The hook will automatically refresh the data after create/update
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCategory(null);
  };


  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title="Category Management"
          description="Manage course categories and their settings"
        />

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <Button
                onClick={() => fetchCategories(filters)}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Categories Table */}
        <PageSection 
          title="Categories"
          description="Complete list of all course categories in the system"
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="flex-1 min-w-0">
                <AttractiveInput
                  placeholder="Search categories..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
                  icon={<Search className="w-5 h-5" />}
                  rightAddon={search ? (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  ) : undefined}
                  variant="default"
                  colorScheme="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full sm:w-64 h-12"
                />
              </div>
              <Button 
                onClick={handleAddCategory}
                size="lg"
                className="flex items-center gap-2 text-white w-full sm:w-auto h-12 px-6 transition-all duration-200"
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
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline font-semibold">Add Category</span>
                <span className="sm:hidden font-semibold">Add</span>
              </Button>
            </div>
          }
        >
          <div className="w-full overflow-hidden">
            <CategoryDataTable
              categories={categories}
              loading={loading}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              pagination={pagination}
              onPageChange={handlePageChange}
              variant="table"
            />
          </div>
        </PageSection>

        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <Button
            onClick={handleAddCategory}
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

        {/* Category Modal */}
        <CategoryModal
          open={showForm}
          category={editingCategory}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          createCategory={createCategory}
          updateCategory={updateCategory}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          onClose={cancelDeleteCategory}
          onConfirm={confirmDeleteCategory}
          title="Delete Category"
          description={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete Category"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
      </main>
    </AdminRoleShell>
  );
}

export default function CategoriesPage() {
  return (
    <AdminPageWrapper>
      <CategoriesPageContent />
    </AdminPageWrapper>
  );
}
