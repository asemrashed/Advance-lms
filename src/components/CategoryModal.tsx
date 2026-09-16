'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CourseCategory, CreateCourseCategoryRequest, UpdateCourseCategoryRequest } from '@/types/course-category';
import { Input } from '@/components/ui/input';
import FormModal from '@/components/ui/form-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import CustomEditor from '@/components/custom-editor';
import { LuTag as Tag, LuPalette as Palette, LuType as Type, LuLoader as Loader2, LuSearch as Search, LuX as X } from 'react-icons/lu';;
import { htmlToPlainText } from '@/lib/utils';

interface CategoryModalProps {
  open: boolean;
  category?: CourseCategory | null;
  onClose: () => void;
  onSuccess: () => void;
  createCategory?: (categoryData: any) => Promise<CourseCategory | null>;
  updateCategory?: (id: string, categoryData: any) => Promise<CourseCategory | null>;
}

const predefinedColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6B7280', // Gray
];

const predefinedIcons = [
  '📚', '🎓', '💻', '🔬', '🎨', '🏃', '🎵', '🌍', '⚡', '🔧',
  '📊', '💡', '🚀', '🎯', '🌟', '💼', '🏆', '🎪', '🔍', '📝',
  '🎮', '🎭', '🎪', '🎨', '🎬', '🎤', '🎧', '🎸', '🎹', '🎺',
  '🏠', '🏢', '🏭', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🏰',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
  '🎯', '🎲', '🎳', '🎮', '🕹️', '🎰', '🎲', '🃏', '🀄', '🎴',
  '📊', '💡', '🚀', '🎯', '🌟', '💼', '🏆', '🎪', '🔍', '📝',
  '🎮', '🎭', '🎪', '🎨', '🎬', '🎤', '🎧', '🎸', '🎹', '🎺',
  '🏠', '🏢', '🏭', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🏰',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
  '🎯', '🎲', '🎳', '🎮', '🕹️', '🎰', '🎲', '🃏', '🀄', '🎴',
  '📊', '💡', '🚀', '🎯', '🌟', '💼', '🏆', '🎪', '🔍', '📝',
  '🎮', '🎭', '🎪', '🎨', '🎬', '🎤', '🎧', '🎸', '🎹', '🎺',
  '🏠', '🏢', '🏭', '🏪', '🏫', '🏬', '🏭', '🏮', '🏯', '🏰',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
  '🎯', '🎲', '🎳', '🎮', '🕹️', '🎰', '🎲', '🃏', '🀄', '🎴'
] as const;

// Memoized icon button component for better performance
const IconButton = React.memo(({ 
  icon, 
  isSelected, 
  onSelect, 
  disabled 
}: { 
  icon: string; 
  isSelected: boolean; 
  onSelect: (icon: string) => void; 
  disabled: boolean; 
}) => (
  <button
    type="button"
    onClick={() => onSelect(icon)}
    className={`w-8 h-8 rounded border text-lg hover:bg-gray-100 transition-colors ${
      isSelected ? 'bg-blue-100 border-blue-300' : 'border-gray-200'
    }`}
    disabled={disabled}
    aria-label={`Select ${icon} icon`}
  >
    {icon}
  </button>
));

IconButton.displayName = 'IconButton';

// Icon Picker Dropdown Component
const IconPickerDropdown = React.memo(({ 
  open, 
  onClose, 
  onSelect, 
  selectedIcon 
}: { 
  open: boolean; 
  onClose: () => void; 
  onSelect: (icon: string) => void; 
  selectedIcon: string; 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredIcons, setFilteredIcons] = useState<string[]>([...predefinedIcons]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = predefinedIcons.filter(icon => 
        icon.includes(searchTerm) || 
        icon.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredIcons([...filtered]);
    } else {
      setFilteredIcons([...predefinedIcons]);
    }
  }, [searchTerm]);

  const handleIconSelect = (icon: string) => {
    onSelect(icon);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden left-0 right-0 min-w-0">
      {/* Search */}
      <div className="p-2 sm:p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
          <Input
            placeholder="Search icons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:pl-10 h-7 sm:h-8 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Icons Grid */}
      <div className="p-2 sm:p-3 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 gap-1">
          {filteredIcons.map((icon) => (
            <button
              key={icon}
              onClick={() => handleIconSelect(icon)}
              className={`w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 rounded-lg border-2 text-xs xs:text-sm sm:text-lg hover:bg-gray-100 transition-all duration-200 flex items-center justify-center ${
                selectedIcon === icon 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              title={icon}
            >
              {icon}
            </button>
          ))}
        </div>
        
        {filteredIcons.length === 0 && (
          <div className="text-center py-4 sm:py-6 text-gray-500">
            <Type className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs sm:text-sm">No icons found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''} available
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-5 sm:h-6 px-1 sm:px-2 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Close</span>
          </Button>
        </div>
      </div>
    </div>
  );
});

IconPickerDropdown.displayName = 'IconPickerDropdown';

export default function CategoryModal({
  open,
  category,
  onClose,
  onSuccess,
  createCategory,
  updateCategory
}: CategoryModalProps) {
  const [formData, setFormData] = useState<CreateCourseCategoryRequest>({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showIconDropdown, setShowIconDropdown] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        color: category.color || '#3B82F6',
        icon: category.icon || '',
        isActive: category.isActive
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        icon: '',
        isActive: true
      });
    }
    setErrors({});
  }, [category, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }

    if (formData.name.length > 100) {
      newErrors.name = 'Category name cannot exceed 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    if (formData.icon && formData.icon.length > 50) {
      newErrors.icon = 'Icon name cannot exceed 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let result: CourseCategory | null = null;
      
      if (category && updateCategory) {
        result = await updateCategory(category._id, formData);
      } else if (createCategory) {
        result = await createCategory(formData);
      }

      if (result) {
        console.log(category ? 'Category updated successfully' : 'Category created successfully');
        onSuccess();
      } else {
        setErrors({ submit: 'Failed to save category' });
      }
    } catch (error) {
      console.error('Error saving category:', error);
      setErrors({ submit: 'An error occurred while saving the category' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateCourseCategoryRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Memoized icon selection handler for quick select
  const handleQuickIconSelect = useCallback((icon: string) => {
    handleInputChange('icon', icon);
  }, []);

  // Optimized input handlers for better performance
  const handleIconInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleInputChange('icon', value);
  }, []);

  const handleColorInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleInputChange('color', value);
  }, []);

  // Icon picker dropdown handlers
  const handleOpenIconDropdown = useCallback(() => {
    setShowIconDropdown(true);
  }, []);

  const handleCloseIconDropdown = useCallback(() => {
    setShowIconDropdown(false);
  }, []);

  const handleIconSelect = useCallback((icon: string) => {
    handleInputChange('icon', icon);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showIconDropdown) {
        const target = event.target as Element;
        if (!target.closest('.icon-picker-container')) {
          setShowIconDropdown(false);
        }
      }
    };

    if (showIconDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showIconDropdown]);

  // Memoized icon grid to prevent unnecessary re-renders
  const iconGrid = useMemo(() => (
    <div className="grid grid-cols-10 gap-1">
      {predefinedIcons.map((icon) => (
        <IconButton
          key={icon}
          icon={icon}
          isSelected={formData.icon === icon}
          onSelect={handleIconSelect}
          disabled={loading}
        />
      ))}
    </div>
  ), [formData.icon, handleIconSelect, loading]);

  // Memoized preview component
  const previewComponent = useMemo(() => (
    <div className="flex items-center space-x-4">
      <div 
        className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-lg transition-all duration-200 hover:scale-105"
        style={{ backgroundColor: formData.color }}
      >
        {formData.icon ? (
          <span className="text-2xl">{formData.icon}</span>
        ) : (
          <Tag className="w-8 h-8" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-lg font-semibold text-gray-900">
          {formData.name || 'Category Name'}
        </p>
        <p className="text-sm text-gray-600">
          {formData.description ? htmlToPlainText(formData.description) : 'No description'}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div 
            className="w-4 h-4 rounded-full border border-gray-300"
            style={{ backgroundColor: formData.color }}
          ></div>
          <span className="text-xs font-mono text-gray-500">{formData.color}</span>
          {formData.icon && (
            <span className="text-sm">{formData.icon}</span>
          )}
        </div>
      </div>
    </div>
  ), [formData.color, formData.icon, formData.name, formData.description]);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={category ? 'Edit Category' : 'Add New Category'}
      description={category ? 'Update category information and settings' : 'Create a new category to organize your courses'}
      submitText={category ? 'Update Category' : 'Create Category'}
      loading={loading}
      size="md"
      formId="category-form"
    >
      <div className="space-y-4 sm:space-y-6 pr-1 -mr-1">
      {/* Category Name */}
      <div className="space-y-2">
        <label htmlFor="name" className="flex items-center gap-2 text-xs font-semibold text-gray-800">
          <Tag className="w-3 h-3 text-blue-600" />
          Category Name
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Tag className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <Input
            id="name"
            type="text"
            placeholder="Enter category name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`pl-8 h-9 text-xs sm:text-sm border-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 ${
              errors.name
                ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100'
                : 'border-gray-200 hover:border-gray-300 focus:border-blue-500'
            }`}
            disabled={loading}
          />
        </div>
        {errors.name && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
            <div className="w-1 h-1 bg-red-500 rounded-full"></div>
            {errors.name}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="flex items-center gap-2 text-xs font-semibold text-gray-800">
          <Type className="w-3 h-3 text-blue-600" />
          Description
        </label>
        <CustomEditor
          value={formData.description}
          onChange={(data) => handleInputChange('description', data)}
          placeholder="Enter category description"
        />
        {errors.description && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
            <div className="w-1 h-1 bg-red-500 rounded-full"></div>
            {errors.description}
          </div>
        )}
      </div>

        {/* Color and Icon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Color */}
          <div className="space-y-2">
            <label htmlFor="color" className="flex items-center gap-2 text-xs font-semibold text-gray-800">
              <Palette className="w-3 h-3 text-blue-600" />
              Color
            </label>
            <div className="space-y-3">
              {/* Color Picker Section */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  {/* Main Color Picker */}
                  <div className="relative">
                    <input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
                      disabled={loading}
                    />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center">
                      <Palette className="w-2 h-2 text-gray-600" />
                    </div>
                  </div>
                  
                  {/* Color Input */}
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={handleColorInputChange}
                      placeholder="#3B82F6"
                      className="h-9 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter hex color code</p>
                  </div>
                </div>
              </div>

   
            </div>
          </div>

        {/* Icon */}
        <div className="space-y-2 min-w-0">
          <label htmlFor="icon" className="flex items-center gap-2 text-xs font-semibold text-gray-800">
            <Type className="w-3 h-3 text-blue-600" />
            Icon
          </label>
          <div className="space-y-3">
            {/* Icon Picker Section */}
            <div className="icon-picker-container relative bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-2 sm:p-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                {/* Icon Input */}
                <div className="flex-1 w-full">
                  <Input
                    id="icon"
                    type="text"
                    value={formData.icon}
                    onChange={handleIconInputChange}
                    placeholder="Enter emoji or icon"
                    className="h-8 sm:h-9 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter emoji or click to browse</p>
                </div>

                {/* Icon Picker Button */}
                <div className="relative w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleOpenIconDropdown}
                    className="w-full sm:w-12 h-8 sm:h-12 rounded-lg border-2 border-gray-300 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center bg-white hover:bg-gray-50"
                    disabled={loading}
                  >
                    {formData.icon ? (
                      <span className="text-lg sm:text-2xl">{formData.icon}</span>
                    ) : (
                      <Type className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />
                    )}
                  </button>
                  <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center">
                    <Type className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Icon Dropdown */}
              <IconPickerDropdown
                open={showIconDropdown}
                onClose={handleCloseIconDropdown}
                onSelect={handleIconSelect}
                selectedIcon={formData.icon || ''}
              />
            </div>

            {/* Quick Icon Selection */}
            {/* <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Quick Select</p>
              <div className="grid grid-cols-10 gap-1">
                {predefinedIcons.slice(0, 20).map((icon) => (
                  <IconButton
                    key={icon}
                    icon={icon}
                    isSelected={formData.icon === icon}
                    onSelect={handleQuickIconSelect}
                    disabled={loading}
                  />
                ))}
              </div>
            </div> */}
          </div>
          {errors.icon && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
              <div className="w-1 h-1 bg-red-500 rounded-full"></div>
              {errors.icon}
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-800">Live Preview</label>
        <div className="p-4 border-2 border-gray-200 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50">
          {previewComponent}
        </div>
      </div>

      {/* Active Status */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)}
              className="w-4 h-4 border-2 border-green-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-md">
              <Tag className="w-3 h-3 text-green-600" />
            </div>
            <div>
              <label htmlFor="isActive" className="text-xs font-semibold text-gray-800 cursor-pointer">
                Active Category
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Category will be available for course assignment
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}
      </div>
    </FormModal>
  );
}
