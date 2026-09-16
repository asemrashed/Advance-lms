'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import {
  InstructorCard,
  InstructorPage,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  LuBookOpen as BookOpen,
  LuAward as Award,
  LuPencil as Edit,
  LuSave as Save,
  LuX as X,
  LuUsers as Users,
  LuCircle as HelpCircle,
  LuUser as User,
  LuUpload as Upload,
  LuTriangleAlert as AlertTriangle,
} from 'react-icons/lu';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { fetchAccountProfile, putAccountProfile } from '@/lib/accountClient';
import {
  hasCompleteBankDetails,
  type BankDetails,
} from '@/lib/bankDetails';

interface TeacherProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  specialization?: string;
  bio?: string;
  experience?: string;
  education?: string;
  address?: string;
  socialLinks?: { linkedin?: string; twitter?: string; website?: string };
  bankDetails?: BankDetails;
  createdAt: string;
  lastLogin?: string;
}

const emptyBankForm = {
  accountHolderName: '',
  bankName: '',
  branchName: '',
  accountNumber: '',
  routingNumber: '',
};

export default function TeacherProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const { uploadAvatar, isUploading, uploadProgress } = useAvatarUpload();
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    bio: '',
    experience: '',
    education: '',
    address: '',
    linkedin: '',
    twitter: '',
    website: '',
  });
  const [bankForm, setBankForm] = useState(emptyBankForm);

  const bankComplete = hasCompleteBankDetails(profile?.bankDetails);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (session?.user?.role !== 'instructor') {
      router.push('/unauthorized');
      return;
    }
    
    fetchProfile();
  }, [status, session?.user?.id, session?.user?.role, router]);

  const syncBankForm = (bank?: BankDetails) => {
    setBankForm({
      accountHolderName: bank?.accountHolderName || '',
      bankName: bank?.bankName || '',
      branchName: bank?.branchName || '',
      accountNumber: bank?.accountNumber || '',
      routingNumber: bank?.routingNumber || '',
    });
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const response = await fetchAccountProfile();

      if (response.ok) {
        const json = (await response.json()) as { success?: boolean; data?: TeacherProfile };
        if (json.success && json.data) {
          const u = json.data;
          setProfile(u);
          const sl = u.socialLinks || {};
          setFormData({
            name: u.name || '',
            specialization: u.specialization || '',
            bio: u.bio || '',
            experience: u.experience != null ? String(u.experience) : '',
            education: u.education || '',
            address: u.address || '',
            linkedin: sl.linkedin || '',
            twitter: sl.twitter || '',
            website: sl.website || '',
          });
          syncBankForm(u.bankDetails);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    const sl = profile?.socialLinks || {};
    setFormData({
      name: profile?.name || '',
      specialization: profile?.specialization || '',
      bio: profile?.bio || '',
      experience: profile?.experience != null ? String(profile.experience) : '',
      education: profile?.education || '',
      address: profile?.address || '',
      linkedin: sl.linkedin || '',
      twitter: sl.twitter || '',
      website: sl.website || '',
    });
  };

  const handleSave = async () => {
    try {
      const response = await putAccountProfile({
        name: formData.name,
        specialization: formData.specialization,
        bio: formData.bio,
        experience: formData.experience,
        education: formData.education,
        address: formData.address,
        socialLinks: {
          linkedin: formData.linkedin,
          twitter: formData.twitter,
          website: formData.website,
        },
      });

      if (response.ok) {
        const json = (await response.json()) as { success?: boolean; data?: TeacherProfile };
        if (json.success && json.data) {
          setProfile(json.data);
          setEditing(false);
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleBankCancel = () => {
    setEditingBank(false);
    syncBankForm(profile?.bankDetails);
  };

  const handleBankSave = async () => {
    try {
      const response = await putAccountProfile({
        bankDetails: {
          accountHolderName: bankForm.accountHolderName,
          bankName: bankForm.bankName,
          branchName: bankForm.branchName,
          accountNumber: bankForm.accountNumber,
          routingNumber: bankForm.routingNumber,
        },
      });

      if (response.ok) {
        const json = (await response.json()) as { success?: boolean; data?: TeacherProfile };
        if (json.success && json.data) {
          setProfile(json.data);
          syncBankForm(json.data.bankDetails);
          setEditingBank(false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('instructor-profile-updated'));
          }
        }
      }
    } catch (error) {
      console.error('Error updating bank details:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBankInputChange = (field: keyof typeof emptyBankForm, value: string) => {
    setBankForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (file: File) => {
    const userId = session?.user?.id;
    if (!file || !userId) return;

    const result = await uploadAvatar(file);
    if (!result || !result.success || !result.imageUrl) {
      return;
    }

    try {
      const response = await putAccountProfile({ avatar: result.imageUrl });

      if (response.ok) {
        const json = (await response.json()) as { success?: boolean; data?: TeacherProfile };
        if (json.success && json.data) {
          setProfile(json.data);
        }
      }
    } catch (error) {
      console.error('Error saving avatar to profile:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <InstructorRoleShell>
        <InstructorPage>
          <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        </InstructorPage>
      </InstructorRoleShell>
    );
  }

  if (!profile) {
    return (
      <InstructorRoleShell>
        <InstructorPage>
          <div className="flex h-64 items-center justify-center">
            <p className="text-gray-500">Profile not found</p>
          </div>
        </InstructorPage>
      </InstructorRoleShell>
    );
  }

  return (
    <InstructorRoleShell>
      <InstructorPage className="p-2 sm:p-4">
        <InstructorTopbar
          title="Profile"
          subtitle="Manage your teaching profile and account settings"
        />

        {!bankComplete ? (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold">Complete your profile</p>
              <p className="mt-0.5 text-sm text-amber-800">
                Add your bank details below so admins can process your payouts after approval.
              </p>
            </div>
          </div>
        ) : null}

        <InstructorCard title="Profile photo">
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt="Profile avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-xs text-white">
                  <div className="mb-1">Uploading...</div>
                  <div>{uploadProgress}%</div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-gray-700">
                Recommended size up to 5MB (JPEG, PNG, GIF, WebP)
              </label>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleAvatarUpload(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </InstructorCard>

        {/* Profile information */}
        <InstructorCard
          title="Personal information"
          actions={
            !editing ? (
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Name
              </label>
              {editing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your name"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.name}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Email Address
              </label>
              <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.email || 'Not provided'}</p>
              <p className="text-xs text-amber-700 mt-1">Email and phone are not editable here.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Specialization
              </label>
              {editing ? (
                <Input
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  placeholder="e.g., Mathematics, Science, English"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.specialization || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Teaching experience
              </label>
              {editing ? (
                <Input
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  placeholder="e.g. 5 years or summary"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.experience || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Education
              </label>
              {editing ? (
                <Input
                  value={formData.education}
                  onChange={(e) => handleInputChange('education', e.target.value)}
                  placeholder="e.g., Master's in Education"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.education || 'Not specified'}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Bio
              </label>
              {editing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself and your teaching philosophy..."
                  className="w-full rounded-lg border border-border bg-card p-3 focus:border-primary focus:ring-2 focus:ring-primary/15"
                  rows={4}
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg min-h-[100px]">
                  {profile.bio || 'No bio provided'}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Address</label>
              {editing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Address"
                  className="w-full rounded-lg border border-border bg-card p-3 focus:border-primary focus:ring-2 focus:ring-primary/15"
                  rows={2}
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.address || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">LinkedIn</label>
              {editing ? (
                <Input
                  value={formData.linkedin}
                  onChange={(e) => handleInputChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.socialLinks?.linkedin || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Website</label>
              {editing ? (
                <Input
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://..."
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.socialLinks?.website || 'Not specified'}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Twitter / X</label>
              {editing ? (
                <Input
                  value={formData.twitter}
                  onChange={(e) => handleInputChange('twitter', e.target.value)}
                  placeholder="Profile URL or handle"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.socialLinks?.twitter || 'Not specified'}</p>
              )}
            </div>
          </div>
        </InstructorCard>

        <InstructorCard
          title="Bank details"
          actions={
            !editingBank ? (
              <Button variant="outline" onClick={() => setEditingBank(true)}>
                <Edit className="mr-2 h-4 w-4" />
                {bankComplete ? 'Edit Bank Details' : 'Add Bank Details'}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => void handleBankSave()}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Bank Details
                </Button>
                <Button variant="outline" onClick={handleBankCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )
          }
        >
          <p className="mb-4 text-sm text-gray-600">
            Required for payouts. Account holder name, bank name, and account number are mandatory.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Account holder name *
              </label>
              {editingBank ? (
                <Input
                  value={bankForm.accountHolderName}
                  onChange={(e) => handleBankInputChange('accountHolderName', e.target.value)}
                  placeholder="Name as on bank account"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 p-3 text-gray-900">
                  {profile.bankDetails?.accountHolderName || 'Not provided'}
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Bank name *
              </label>
              {editingBank ? (
                <Input
                  value={bankForm.bankName}
                  onChange={(e) => handleBankInputChange('bankName', e.target.value)}
                  placeholder="e.g. Dutch Bangla Bank"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 p-3 text-gray-900">
                  {profile.bankDetails?.bankName || 'Not provided'}
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Branch name
              </label>
              {editingBank ? (
                <Input
                  value={bankForm.branchName}
                  onChange={(e) => handleBankInputChange('branchName', e.target.value)}
                  placeholder="Branch name"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 p-3 text-gray-900">
                  {profile.bankDetails?.branchName || 'Not provided'}
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Account number *
              </label>
              {editingBank ? (
                <Input
                  value={bankForm.accountNumber}
                  onChange={(e) => handleBankInputChange('accountNumber', e.target.value)}
                  placeholder="Bank account number"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 p-3 text-gray-900">
                  {profile.bankDetails?.accountNumber || 'Not provided'}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Routing number
              </label>
              {editingBank ? (
                <Input
                  value={bankForm.routingNumber}
                  onChange={(e) => handleBankInputChange('routingNumber', e.target.value)}
                  placeholder="Optional routing number"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 p-3 text-gray-900">
                  {profile.bankDetails?.routingNumber || 'Not provided'}
                </p>
              )}
            </div>
          </div>
        </InstructorCard>

        {/* Account information & stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Account Status */}
          <InstructorCard title="Account status">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Status</span>
                <Badge className={profile.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {profile.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <span className="text-sm text-gray-600">Profile</span>
                <Badge className={bankComplete ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                  {bankComplete ? 'Complete' : 'Needs bank details'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Role</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{profile.role}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(profile.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Last Login</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(profile.lastLogin)}
                </span>
              </div>
            </div>
          </InstructorCard>

          {/* Teaching Stats */}
          <InstructorCard title="Teaching statistics">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3">
                <span className="text-sm text-gray-600">Courses Created</span>
                <span className="text-sm font-medium text-primary">0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-600">Students Taught</span>
                <span className="text-sm font-medium text-blue-900">0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-600">Average Rating</span>
                <span className="text-sm font-medium text-green-900">0.0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm text-gray-600">Teaching Hours</span>
                <span className="text-sm font-medium text-orange-900">0h</span>
              </div>
            </div>
          </InstructorCard>
        </div>

        {/* Quick Actions */}
        <InstructorCard title="Quick actions" className="mt-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/instructor/courses')}
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-sm">My Courses</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/instructor/students')}
            >
              <Users className="h-6 w-6" />
              <span className="text-sm">Students</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/instructor/assignments')}
            >
              <Award className="h-6 w-6" />
              <span className="text-sm">Assignments</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/instructor/support')}
            >
              <HelpCircle className="h-6 w-6" />
              <span className="text-sm">Get Help</span>
            </Button>
          </div>
        </InstructorCard>
      </InstructorPage>
    </InstructorRoleShell>
  );
}
