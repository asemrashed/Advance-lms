'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import { Teacher, TeacherFormData, TeacherUpdateData } from '@/types/teacher';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import FormModal from '@/components/ui/form-modal';
import { AttractiveInput } from '@/components/ui/attractive-input';
import AvatarUpload from '@/components/AvatarUpload';
import { LuUser as User, LuMail as Mail, LuPhone as Phone, LuUserCheck as UserCheck, LuLoader as Loader2, LuLock as Lock } from 'react-icons/lu';
import { isValidBdPhone, toBdLocalPhone } from '@/lib/phone';
import { isValidEmail, normalizeEmail } from '@/lib/email';

interface TeacherModalProps {
  open: boolean;
  teacher?: Teacher | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TeacherModal({ open, teacher, onClose, onSuccess }: TeacherModalProps) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const isEdit = !!teacher;

  const [formData, setFormData] = useState<TeacherFormData>({
    email: '',
    phone: '',
    name: '',
    isActive: true,
    avatar: '',
    experience: '',
    address: {
      fullAddress: ''
    },
    password: isEdit ? undefined : 'Teacher123!' // Default password for new teachers
  });
  const [errors, setErrors] = useState<Partial<TeacherFormData>>({});

  // Debounced phone check
  const debouncedPhoneCheck = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (phone: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (phone && phone.trim()) {
            // Only check for new teachers or when phone is changed
            if (!isEdit || (isEdit && phone !== (teacher as any)?.phone)) {
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
    [isEdit, (teacher as any)?.phone]
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
            if (!isEdit || (isEdit && normalizeEmail(email) !== normalizeEmail(String(teacher?.email || '')))) {
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
    [isEdit, teacher?.email]
  );

  // Reset form when modal opens or teacher changes
  useEffect(() => {
    if (open) {
      if (teacher) {
        // Edit mode - populate form with teacher data
        setFormData({
          email: teacher.email || '',
          phone: (teacher as any).phone || '',
          name: teacher.name,
          isActive: teacher.accountStatus === 'active',
          avatar: teacher.avatar || '',
          experience: teacher.experience || '',
          address: teacher.address || {
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
          address: {
            fullAddress: ''
          },
          password: 'Teacher123!' // Default password for new teachers
        });
      }
      // Clear any existing errors when modal opens
      setErrors({});
    }
  }, [open, teacher, isEdit]);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Partial<TeacherFormData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    } else if (
      !isEdit ||
      (isEdit && normalizeEmail(formData.email) !== normalizeEmail(String(teacher?.email || '')))
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
      } else if (!isEdit || (isEdit && localPhone !== toBdLocalPhone(String((teacher as any)?.phone || '')))) {
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
      const url = isEdit ? `/api/teachers/${teacher._id}` : '/api/teachers';
      const method = isEdit ? 'PUT' : 'POST';
      const localPhone = formData.phone.trim() ? toBdLocalPhone(formData.phone) : '';

      const payload = isEdit
        ? {
            email: normalizeEmail(formData.email),
            phone: localPhone,
            name: formData.name,
            isActive: formData.isActive,
            avatar: formData.avatar,
            experience: formData.experience?.trim() || '',
            address: formData.address?.fullAddress ? { fullAddress: formData.address.fullAddress } : undefined
          } as TeacherUpdateData
        : {
            ...formData,
            email: normalizeEmail(formData.email),
            phone: localPhone || undefined,
            address: formData.address?.fullAddress ? { fullAddress: formData.address.fullAddress } : undefined,
            password: formData.password || 'Teacher123!' // Default password for new teachers
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(isEdit ? 'Teacher updated successfully' : 'Teacher created successfully');
        onSuccess();
      } else {
        console.error(`Failed to ${isEdit ? 'update' : 'create'} teacher:`, data.error);
        if (typeof data.error === 'string' && data.error.toLowerCase().includes('phone')) {
          setErrors((prev) => ({ ...prev, phone: data.error }));
        }
        if (typeof data.error === 'string' && data.error.toLowerCase().includes('email')) {
          setErrors((prev) => ({ ...prev, email: data.error }));
        }
      }
    } catch (error) {
      console.error('Error saving teacher:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TeacherFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Check phone/email existence in real-time
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
      onSubmit={handleSubmit}
      title={isEdit ? 'Edit Teacher' : 'Add New Teacher'}
      description={isEdit ? 'Update teacher information and settings' : 'Create a new teacher with address and password'}
      submitText={isEdit ? 'Update Teacher' : 'Create Teacher'}
      loading={loading}
      size="2xl"
      formId="teacher-form"
    >
        {/* Avatar Upload */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-800">
            <User className="w-3 h-3 text-blue-600" />
            Profile Picture
          </label>
          <div className="flex justify-center">
            <AvatarUpload
              currentAvatar={formData.avatar}
              onAvatarChange={(imageUrl, publicId) => {
                setFormData(prev => ({ ...prev, avatar: imageUrl }));
              }}
              onAvatarRemove={() => {
                setFormData(prev => ({ ...prev, avatar: '' }));
              }}
              size="md"
              disabled={loading}
            />
          </div>
        </div>

        <AttractiveInput
          label="Email"
          icon={<Mail className="w-4 h-4" />}
          type="email"
          placeholder="teacher@example.com"
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
          placeholder="01XXXXXXXXX"
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
          placeholder="Enter teacher name"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
          error={errors.name}
          variant="default"
          colorScheme="primary"
          size="md"
        />

        <AttractiveInput
          label="Teaching experience (optional)"
          icon={<User className="w-4 h-4" />}
          type="text"
          placeholder="e.g. 8+ years in web development"
          value={formData.experience || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleInputChange('experience', e.target.value)
          }
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
            // placeholder="Enter password for teacher"
            value={formData.password || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('password', e.target.value)}
            error={errors.password}
            variant="default"
            colorScheme="primary"
            size="md"
          />
        )}

        {/* Active Status */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)}
                className="w-4 h-4 border-2 border-green-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded-md">
                <UserCheck className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <label htmlFor="isActive" className="text-xs font-semibold text-gray-800 cursor-pointer">
                  Active Teacher
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Uncheck to block this instructor from signing in
                </p>
              </div>
            </div>
          </div>
        </div>
    </FormModal>
  );
}
