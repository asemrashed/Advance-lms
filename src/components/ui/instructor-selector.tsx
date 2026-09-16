"use client"

import React, { useState, useEffect, useRef } from 'react';
import { LuUser as User, LuSearch as Search, LuX as X, LuChevronDown as ChevronDown, LuLoader as Loader2 } from 'react-icons/lu';;
import { AttractiveInput } from './attractive-input';
import { useTeachers } from '@/hooks/useTeachers';

interface InstructorSelectorProps {
  value?: string;
  onChange: (instructorId: string | undefined) => void;
  onSave?: (instructorId: string | undefined) => Promise<void>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const InstructorSelector: React.FC<InstructorSelectorProps> = ({
  value,
  onChange,
  onSave,
  label = "Instructor",
  placeholder = "Select an instructor",
  disabled = false,
  error,
  className = ""
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { teachers, loading: loadingTeachers } = useTeachers();

  // Filter teachers based on search
  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(search.toLowerCase()) ||
    teacher.email.toLowerCase().includes(search.toLowerCase())
  );

  // Get selected instructor info
  const selectedInstructor = teachers.find(teacher => teacher._id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInstructorSelect = async (instructorId: string | undefined) => {
    onChange(instructorId);
    setShowDropdown(false);
    setSearch('');
    
    if (onSave) {
      try {
        await onSave(instructorId);
      } catch (error) {
        console.error('Error saving instructor:', error);
      }
    }
  };

  const displayValue = selectedInstructor 
    ? selectedInstructor.name
    : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <AttractiveInput
        label={label}
        placeholder={placeholder}
        value={displayValue}
        readOnly
        disabled={disabled}
        error={error}
        icon="user"
        variant="default"
        colorScheme="primary"
        onClick={() => !disabled && setShowDropdown(!showDropdown)}
        rightAddon={
          <button
            type="button"
            onClick={() => !disabled && setShowDropdown(!showDropdown)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={disabled}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        }
      />

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search instructors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* No instructor option */}
          <div className="p-2">
            <button
              type="button"
              onClick={() => handleInstructorSelect(undefined)}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-md"
            >
              No instructor assigned
            </button>
          </div>

          {/* Instructor list */}
          {filteredTeachers.map((teacher) => (
            <div key={teacher._id} className="p-2">
              <button
                type="button"
                onClick={() => handleInstructorSelect(teacher._id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md flex items-center gap-3"
              >
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {teacher.name}
                  </div>
                  <div className="text-xs text-gray-500">{teacher.email}</div>
                </div>
              </button>
            </div>
          ))}

          {/* Loading state */}
          {loadingTeachers && (
            <div className="p-4 text-center text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              Loading instructors...
            </div>
          )}

          {/* No results */}
          {!loadingTeachers && filteredTeachers.length === 0 && search && (
            <div className="p-4 text-center text-sm text-gray-500">
              No instructors found matching "{search}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
