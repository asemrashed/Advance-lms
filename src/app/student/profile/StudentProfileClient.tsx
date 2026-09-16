'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { LuUser as User, LuBookOpen as BookOpen, LuClock as Clock, LuPencil as Edit, LuSave as Save, LuX as X, LuFileText as LuFileText, LuCircle as HelpCircle, LuUpload as Upload } from 'react-icons/lu';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { fetchAccountProfile, putAccountProfile } from '@/lib/accountClient';
import { useRecordedCoursesEnabled } from '@/hooks/useRecordedCoursesEnabled';
import {
  PUBLIC_ENROLL_HREF,
  RECORDED_COURSES_CATALOG_HREF,
} from '@/lib/studentPortalSettings';

interface StudentProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  enrollmentDate?: string;
  parentPhone?: string;
  education?: string;
  bio?: string;
  address?: string;
  socialLinks?: { linkedin?: string; twitter?: string; website?: string };
  createdAt: string;
  lastLogin?: string;
}

export default function StudentProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { recordedCoursesEnabled } = useRecordedCoursesEnabled();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    parentPhone: '',
    education: '',
    bio: '',
    address: '',
    linkedin: '',
    twitter: '',
    website: '',
  });
  const { uploadAvatar, isUploading, uploadProgress } = useAvatarUpload();

  useEffect(() => {
    if (status === 'loading') return;

    fetchProfile();
  }, [status, session?.user?.id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const response = await fetchAccountProfile();

      if (response.ok) {
        const json = (await response.json()) as { success?: boolean; data?: StudentProfile };
        if (json.success && json.data) {
          const u = json.data;
          setProfile(u);
          const sl = u.socialLinks || {};
          setFormData({
            parentPhone: u.parentPhone || '',
            education: u.education || '',
            bio: u.bio || '',
            address: u.address || '',
            linkedin: sl.linkedin || '',
            twitter: sl.twitter || '',
            website: sl.website || '',
          });
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
      parentPhone: profile?.parentPhone || '',
      education: profile?.education || '',
      bio: profile?.bio || '',
      address: profile?.address || '',
      linkedin: sl.linkedin || '',
      twitter: sl.twitter || '',
      website: sl.website || '',
    });
  };

  const handleSave = async () => {
    try {
      const response = await putAccountProfile({
        parentPhone: formData.parentPhone,
        education: formData.education,
        bio: formData.bio,
        address: formData.address,
        socialLinks: {
          linkedin: formData.linkedin,
          twitter: formData.twitter,
          website: formData.website,
        },
      });

      if (response.ok) {
        const json = (await response.json()) as { success?: boolean; data?: StudentProfile };
        if (json.success && json.data) {
          setProfile(json.data);
          setEditing(false);
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
        const json = (await response.json()) as { success?: boolean; data?: StudentProfile };
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
      <StudentRoleShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </StudentRoleShell>
    );
  }

  if (!profile) {
    return (
      <StudentRoleShell>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Profile not found</p>
        </div>
      </StudentRoleShell>
    );
  }

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title="My Profile 👤"
          description="Manage your personal information and account settings"
        />

        {/* Profile Photo */}
        <PageSection
          title="Profile Photo"
          description="Upload or change your profile picture"
          className="mb-2 sm:mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt="Profile avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-xs text-white">
                  <div className="mb-1">Uploading...</div>
                  <div>{uploadProgress}%</div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 block">
                Recommended size up to 5MB (JPEG, PNG, GIF, WebP)
              </label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleAvatarUpload(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </PageSection>

        {/* Profile Information */}
        <PageSection 
          title="Personal Information"
          description="Update your personal details and contact information"
          className="mb-2 sm:mb-4"
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
              <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.name}</p>
              <p className="text-xs text-amber-700 mt-1">Name cannot be changed by students.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Mobile Number
              </label>
              <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.phone || 'Not provided'}</p>
              <p className="text-xs text-amber-700 mt-1">Mobile number cannot be changed by students.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Email Address
              </label>
              <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.email || 'Not provided'}</p>
              <p className="text-xs text-amber-700 mt-1">Email is managed by support. Use Profile settings for LMS fields only.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Parent/Guardian Phone
              </label>
              {editing ? (
                <Input
                  value={formData.parentPhone}
                  onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                  placeholder="Enter parent/guardian phone number"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.parentPhone || 'Not provided'}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Education</label>
              {editing ? (
                <Input
                  value={formData.education}
                  onChange={(e) => handleInputChange('education', e.target.value)}
                  placeholder="School / level / program"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.education || 'Not provided'}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Bio</label>
              {editing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Short bio"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg min-h-[72px]">{profile.bio || 'Not provided'}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Address</label>
              {editing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Address"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={2}
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.address || 'Not provided'}</p>
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
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.socialLinks?.linkedin || 'Not provided'}</p>
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
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.socialLinks?.website || 'Not provided'}</p>
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
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.socialLinks?.twitter || 'Not provided'}</p>
              )}
            </div>
          </div>
        </PageSection>

        {/* Account Information & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Account Status */}
          <PageSection 
            title="Account Status"
            className="mb-2 sm:mb-4"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Status</span>
                <Badge className={profile.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {profile.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Role</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{profile.role}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(profile.enrollmentDate || profile.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Last Login</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(profile.lastLogin)}
                </span>
              </div>
            </div>
          </PageSection>

          {/* Learning Stats */}
          <PageSection 
            title="Learning Statistics"
            className="mb-2 sm:mb-4"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-600">Courses Enrolled</span>
                <span className="text-sm font-medium text-blue-900">0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-600">Courses Completed</span>
                <span className="text-sm font-medium text-green-900">0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Study Time</span>
                <span className="text-sm font-medium text-purple-900">0h 0m</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm text-gray-600">Average Progress</span>
                <span className="text-sm font-medium text-orange-900">0%</span>
              </div>
            </div>
          </PageSection>
        </div>

        {/* Quick Actions */}
        <PageSection 
          title="Quick Actions"
          description="Common tasks and shortcuts"
          className="mt-2"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() =>
                router.push(
                  recordedCoursesEnabled
                    ? RECORDED_COURSES_CATALOG_HREF
                    : PUBLIC_ENROLL_HREF,
                )
              }
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-sm">
                {recordedCoursesEnabled ? 'Browse Courses' : 'Enroll more'}
              </span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/student/dashboard')}
            >
              <Clock className="h-6 w-6" />
              <span className="text-sm">View Progress</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/student/assignments')}
            >
              <LuFileText className="h-6 w-6" />
              <span className="text-sm">Assignments</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/student/support')}
            >
              <HelpCircle className="h-6 w-6" />
              <span className="text-sm">Get Help</span>
            </Button>
          </div>
        </PageSection>
      </main>
    </StudentRoleShell>
  );
}
