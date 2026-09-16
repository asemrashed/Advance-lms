'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import { Student, StudentFormData, StudentUpdateData } from '@/types/student';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import FormModal from '@/components/ui/form-modal';
import { AttractiveInput } from '@/components/ui/attractive-input';
import AvatarUpload from '@/components/AvatarUpload';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { LuUser as User, LuMail as Mail, LuUserCheck as UserCheck, LuLoader as Loader2, LuPhone as Phone, LuUpload as Upload, LuLock as Lock } from 'react-icons/lu';
import { isValidBdPhone, toBdLocalPhone } from '@/lib/phone';
import { isValidEmail, normalizeEmail } from '@/lib/email';

interface StudentModalProps {
  open: boolean;
  student?: Student | null;
  onClose: () => void;
  onSuccess: () => void;
  apiEndpoint?: string; // Optional prop to specify API endpoint
}

export default function StudentModal({ open, student, onClose, onSuccess, apiEndpoint }: StudentModalProps) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { uploadAvatar, uploadProgress } = useAvatarUpload();
  const isEdit = !!student;

  const [formData, setFormData] = useState<StudentFormData>({
    email: '',
    phone: '',
    name: '',
    isActive: true,
    avatar: '',
    parentPhone: '',
    address: {
      fullAddress: ''
    },
    password: isEdit ? undefined : 'Student123!' // Default password for new students
  });
  const [errors, setErrors] = useState<Partial<StudentFormData>>({});

  // Debounced phone check
  const debouncedPhoneCheck = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (phone: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (phone && phone.trim()) {
            // Only check for new students or when phone is changed
            if (!isEdit || (isEdit && phone !== (student as any)?.phone)) {
              const phoneExists = await checkPhoneExists(phone);
              if (phoneExists) {
                setErrors(prev => ({ ...prev, phone: 'Phone number already exists' }));
              } else {
                setErrors(prev => ({ ...prev, phone: undefined }));
              }
            }
          }
        }, 500);
      };
    })(),
    [isEdit, student]
  );

  // Check if phone exists
  const checkPhoneExists = async (phone: string): Promise<boolean> => {
    if (!phone || !phone.trim()) {
      return false;
    }

    try {
      setCheckingPhone(true);
      const response = await fetch(`/api/users?phone=${encodeURIComponent(phone)}&checkExists=true`);
      const data = await response.json();
      return data.exists || false;
    } catch (error) {
      console.error('Error checking phone:', error);
      return false;
    } finally {
      setCheckingPhone(false);
    }
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    if (!email || !email.trim()) {
      return false;
    }

    try {
      setCheckingEmail(true);
      const response = await fetch(`/api/users?email=${encodeURIComponent(email)}&checkExists=true`);
      const data = await response.json();
      return data.exists || false;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  const debouncedEmailCheck = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (email: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (email && email.trim()) {
            if (!isEdit || (isEdit && normalizeEmail(email) !== normalizeEmail(String(student?.email || '')))) {
              const emailExists = await checkEmailExists(email);
              if (emailExists) {
                setErrors(prev => ({ ...prev, email: 'Email already exists' }));
              } else {
                setErrors(prev => ({ ...prev, email: undefined }));
              }
            }
          }
        }, 500);
      };
    })(),
    [isEdit, student?.email]
  );

  // Reset form when modal opens or student changes
  useEffect(() => {
    if (open) {
      if (student) {
        // Edit mode - populate form with student data
        setFormData({
          email: student.email || '',
          phone: (student as any).phone || '',
          name: student.name,
          isActive: student.isActive,
          avatar: student.avatar || '',
          parentPhone: student.parentPhone || '',
          address: student.address || {
            fullAddress: ''
          }
        });
      } else {
        // Create mode - reset form to default values
        setFormData({
          email: '',
          phone: '',
          name: '',
          isActive: true,
          avatar: '',
          parentPhone: '',
          address: {
            fullAddress: ''
          },
          password: 'Student123!' // Default password for new students
        });
      }
      // Clear any existing errors when modal opens
      setErrors({});
    }
  }, [open, student, isEdit]);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Partial<StudentFormData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    } else if (
      !isEdit ||
      (isEdit && normalizeEmail(formData.email) !== normalizeEmail(String(student?.email || '')))
    ) {
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        newErrors.email = 'Email already exists';
      }
    }

    if (formData.phone.trim()) {
      const localPhone = toBdLocalPhone(formData.phone);
      if (!isValidBdPhone(formData.phone)) {
        newErrors.phone = 'Phone number is invalid. Use 01XXXXXXXXX or +8801XXXXXXXXX';
      } else if (!isEdit || (isEdit && localPhone !== toBdLocalPhone(String((student as any)?.phone || '')))) {
        const phoneExists = await checkPhoneExists(localPhone);
        if (phoneExists) {
          newErrors.phone = 'Phone number already exists';
        }
      }
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!isEdit && formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.parentPhone && formData.parentPhone.trim()) {
      if (!isValidBdPhone(formData.parentPhone)) {
        newErrors.parentPhone = 'Parent phone number is invalid. Use 01XXXXXXXXX or +8801XXXXXXXXX';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await validateForm())) {
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/students/${student._id}` : (apiEndpoint || '/api/students');
      const normalizedPhone = formData.phone.trim() ? toBdLocalPhone(formData.phone) : '';
      const normalizedParentPhone = formData.parentPhone ? toBdLocalPhone(formData.parentPhone) : '';
      const payload = isEdit
        ? {
            ...formData,
            email: normalizeEmail(formData.email),
            phone: normalizedPhone,
            parentPhone: normalizedParentPhone || undefined,
            address: formData.address?.fullAddress ? { fullAddress: formData.address.fullAddress } : undefined
          } as StudentUpdateData
        : {
            ...formData,
            email: normalizeEmail(formData.email),
            phone: normalizedPhone || undefined,
            parentPhone: normalizedParentPhone || undefined,
            address: formData.address?.fullAddress ? { fullAddress: formData.address.fullAddress } : undefined,
            password: formData.password || 'Student123!'
          };

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(isEdit ? 'Student updated successfully' : 'Student created successfully');
        onSuccess();
      } else {
        console.error(`Failed to ${isEdit ? 'update' : 'create'} student:`, data.error);
      }
    } catch (error) {
      console.error('Error saving student:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof StudentFormData, value: string | boolean | {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  }) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (field === 'phone' && typeof value === 'string') {
      debouncedPhoneCheck(value);
    }
    if (field === 'email' && typeof value === 'string') {
      debouncedEmailCheck(value);
    }
  };

  const handleAddressChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        fullAddress: value
      }
    }));
    if (errors.address && errors.address?.fullAddress) {
      setErrors(prev => ({
        ...prev,
        address: {
          fullAddress: undefined
        }
      }));
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Student' : 'Add New Student'}
      description={isEdit ? 'Update student information and settings' : 'Create a new student account with address and password'}
      onSubmit={handleSubmit}
      loading={loading}
      size="2xl"
      formId="student-form"
      submitText={isEdit ? 'Update Student' : 'Create Student'}
    >
      {/* Avatar Upload */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-800">
          <User className="w-3 h-3 text-blue-600" />
          Profile Picture
        </label>
        <div className="flex items-center gap-3">
          {/* Small Circular Image Display */}
          <div className="flex-shrink-0">
            <AvatarUpload
              currentAvatar={formData.avatar}
              onAvatarChange={(imageUrl, publicId) => {
                setFormData(prev => ({ ...prev, avatar: imageUrl }));
              }}
              onAvatarRemove={() => {
                setFormData(prev => ({ ...prev, avatar: '' }));
              }}
              size="sm"
              disabled={loading}
            />
          </div>
          
          {/* LuFile Input Field */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="file"
                id="avatar-file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadingAvatar(true);
                    try {
                      const result = await uploadAvatar(file);
                      if (result?.success && result.imageUrl) {
                        setFormData(prev => ({ ...prev, avatar: result.imageUrl }));
                      }
                    } catch (error) {
                      console.error('Error uploading avatar:', error);
                    } finally {
                      setUploadingAvatar(false);
                    }
                  }
                }}
                className="hidden"
                disabled={loading || uploadingAvatar}
              />
              <label
                htmlFor="avatar-file"
                className={`flex items-center justify-center w-full h-9 px-3 text-xs font-medium text-gray-700 bg-white border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                  uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                      <span className="text-xs">Uploading... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 text-gray-500" />
                      <span className="text-xs">
                        {formData.avatar ? 'Change Image' : 'Choose Image'}
                      </span>
                    </>
                  )}
                </div>
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Click to select an image file (JPG, PNG, GIF)
            </p>
            {uploadingAvatar && (
              <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AttractiveInput
        label="Email"
        icon={<Mail className="w-4 h-4" />}
        type="email"
        placeholder="Enter student email"
        value={formData.email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
        error={errors.email}
        loading={checkingEmail}
        variant="default"
        colorScheme="primary"
        size="md"
      />

      <AttractiveInput
        label="Phone Number (optional)"
        icon={<Phone className="w-4 h-4" />}
        type="tel"
        placeholder="Enter student phone number"
        value={formData.phone}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('phone', e.target.value)}
        error={errors.phone}
        loading={checkingPhone}
        variant="default"
        colorScheme="primary"
        size="md"
      />

      <AttractiveInput
        label="Name"
        icon={<User className="w-4 h-4" />}
        type="text"
        placeholder="Enter student name"
        value={formData.name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
        error={errors.name}
        variant="default"
        colorScheme="primary"
        size="md"
      />


      <AttractiveInput
        label="Parent/Guardian Phone"
        icon={<Phone className="w-4 h-4" />}
        type="tel"
        placeholder="Enter parent/guardian phone number (optional)"
        value={formData.parentPhone}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('parentPhone', e.target.value)}
        error={errors.parentPhone}
        variant="default"
        colorScheme="primary"
        size="md"
      />

      {/* Address Field */}
      <AttractiveInput
        label="Address"
        icon={<User className="w-4 h-4" />}
        type="text"
        placeholder="Enter full address"
        value={formData.address?.fullAddress || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAddressChange(e.target.value)}
        variant="default"
        colorScheme="primary"
        size="md"
      />

      {!isEdit && (
        <AttractiveInput
          label="Password"
          icon={<Lock className="w-4 h-4" />}
          type="password"
          placeholder="Enter password for student"
          value={formData.password || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('password', e.target.value)}
          error={errors.password}
          variant="default"
          colorScheme="primary"
          size="md"
        />
      )}

      {/* Active Status */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <Checkbox
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)}
            className="w-4 h-4 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <div className="flex-1">
            <label htmlFor="isActive" className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
              <UserCheck className="w-3 h-3 text-blue-600" />
              Active Student
            </label>
            <p className="text-xs text-gray-600 mt-1">
              Student can log in and access the system
            </p>
          </div>
        </div>
      </div>
    </FormModal>
  );
}
