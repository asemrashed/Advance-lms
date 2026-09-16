'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/hooks';
import useStudentSettings from '@/hooks/useStudentSettings';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import { Button } from '@/components/ui/button';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { LuSave as Save, LuRefreshCw as RefreshCw, LuTriangleAlert as AlertTriangle, LuCheck as CheckCircle, LuRotateCcw, LuKey, LuUser as User, LuBell, LuMail as Mail } from 'react-icons/lu';
import AccountChangePasswordPanel from '@/components/AccountChangePasswordPanel';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import { fetchAccountProfile, putAccountProfile } from '@/lib/accountClient';

type AccountDraft = {
  email: string;
  phone: string;
  bio: string;
  parentPhone: string;
  education: string;
  address: string;
  linkedin: string;
  twitter: string;
  website: string;
};

const emptyAccountDraft: AccountDraft = {
  email: '',
  phone: '',
  bio: '',
  parentPhone: '',
  education: '',
  address: '',
  linkedin: '',
  twitter: '',
  website: '',
};

function StudentSettingsPageContent() {
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [hasChanges, setHasChanges] = useState(false);
  const [accountDraft, setAccountDraft] = useState<AccountDraft>(emptyAccountDraft);
  const [accountDirty, setAccountDirty] = useState(false);

  // Local state to track changes without API calls
  const [localSettings, setLocalSettings] = useState<Record<string, Record<string, any>>>({});

  const {
    settings,
    isLoading,
    error,
    saveStatus,
    saveAllSettings,
    resetSettings,
    refetch,
  } = useStudentSettings();

  const loadAccount = useCallback(async () => {
    try {
      const res = await fetchAccountProfile();
      if (!res.ok) return;
      const json = (await res.json()) as { success?: boolean; data?: Record<string, unknown> };
      const d = json.data;
      if (!d || json.success === false) return;
      const sl = (d.socialLinks as Record<string, string> | undefined) || {};
      setAccountDraft({
        email: String(d.email || ''),
        phone: String(d.phone || ''),
        bio: String(d.bio || ''),
        parentPhone: String(d.parentPhone || ''),
        education: String(d.education || ''),
        address: String(d.address || ''),
        linkedin: String(sl.linkedin || ''),
        twitter: String(sl.twitter || ''),
        website: String(sl.website || ''),
      });
      setAccountDirty(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const anyDirty = hasChanges || accountDirty;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: LuBell },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'password', label: 'Password', icon: LuKey },
  ];

  const handleSave = async () => {
    if (!hasChanges && !accountDirty) return;

    try {
      if (accountDirty) {
        const res = await putAccountProfile({
          bio: accountDraft.bio,
          parentPhone: accountDraft.parentPhone,
          education: accountDraft.education,
          address: accountDraft.address,
          socialLinks: {
            linkedin: accountDraft.linkedin,
            twitter: accountDraft.twitter,
            website: accountDraft.website,
          },
        });
        if (!res.ok) {
          console.error('Account profile save failed');
        } else {
          await loadAccount();
        }
      }

      if (hasChanges) {
        const mergedSettings = { ...settings } as any;
        Object.keys(localSettings).forEach((category) => {
          mergedSettings[category] = {
            ...mergedSettings[category],
            ...localSettings[category],
          };
        });

        await saveAllSettings(mergedSettings);
        setHasChanges(false);
        setLocalSettings({});
      }

      await refetch();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleReset = async () => {
    try {
      await resetSettings();
      setHasChanges(false);
      setLocalSettings({});
      await loadAccount();
      await refetch();
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  // Helper function to get current setting value (original + local changes)
  const getCurrentSetting = (category: string, key: string) => {
    const originalValue = (settings as any)[category]?.[key];
    const localValue = localSettings[category]?.[key];
    return localValue !== undefined ? localValue : originalValue;
  };

  const patchAccountDraft = (partial: Partial<AccountDraft>) => {
    setAccountDraft((prev) => ({ ...prev, ...partial }));
    setAccountDirty(true);
  };

  const handleSettingChange = (category: string, key: string, value: any) => {
    // Update local state instead of calling API immediately
    setLocalSettings((prev: Record<string, Record<string, any>>) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const renderProfileSettings = () => {
    return (
      <div className="space-y-6">
        <PageSection
          title="Profile Information"
          description="Manage your student profile details"
          className="bg-gradient-to-br from-purple-50 via-white to-pink-50 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-200 my-6"
        >
          <div className="space-y-6">
            <div className="rounded-lg border border-purple-100 bg-white/80 p-4 text-sm text-slate-700 shadow-sm">
              <p>
                <span className="font-semibold text-foreground">Name:</span> {user?.name || '—'}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-foreground">Email:</span>{' '}
                {accountDraft.email || user?.email || '—'}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-foreground">Phone:</span> {accountDraft.phone || '—'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Login email and phone are account identifiers and cannot be changed here. Full profile editor:{' '}
                <Link href="/student/profile" className="font-medium text-primary underline">
                  My Profile
                </Link>
                .
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-200 shadow-md hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Profile Visibility</label>
                    <p className="text-sm text-muted-foreground">Make your profile visible to instructors and other students</p>
                  </div>
                  <Button
                    variant={getCurrentSetting('student', 'profileVisibility') ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSettingChange('student', 'profileVisibility', !getCurrentSetting('student', 'profileVisibility'))}
                    className="border-2 border-blue-300 hover:border-blue-400 transition-all duration-200 font-semibold"
                  >
                    {getCurrentSetting('student', 'profileVisibility') ? "Visible" : "Hidden"}
                  </Button>
                </div>
              </div>
            </div>
            <AttractiveInput
              label="Bio"
              value={accountDraft.bio}
              onChange={(e) => patchAccountDraft({ bio: e.target.value })}
              placeholder="Tell others about yourself and your learning journey..."
              icon="user"
              variant="default"
              colorScheme="primary"
              size="md"
              helperText="Saved to your account (not notification settings)."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AttractiveInput
                label="Parent/Guardian phone"
                value={accountDraft.parentPhone}
                onChange={(e) => patchAccountDraft({ parentPhone: e.target.value })}
                placeholder="Parent or guardian contact"
                icon="user"
                variant="default"
                colorScheme="primary"
                size="md"
              />
              <AttractiveInput
                label="Education"
                value={accountDraft.education}
                onChange={(e) => patchAccountDraft({ education: e.target.value })}
                placeholder="School / program"
                icon="book"
                variant="default"
                colorScheme="primary"
                size="md"
              />
            </div>
            <AttractiveInput
              label="Address"
              value={accountDraft.address}
              onChange={(e) => patchAccountDraft({ address: e.target.value })}
              placeholder="Mailing address"
              icon="edit"
              variant="default"
              colorScheme="primary"
              size="md"
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <AttractiveInput
                label="LinkedIn"
                value={accountDraft.linkedin}
                onChange={(e) => patchAccountDraft({ linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/..."
                icon="user"
                variant="default"
                colorScheme="primary"
                size="md"
              />
              <AttractiveInput
                label="Website"
                value={accountDraft.website}
                onChange={(e) => patchAccountDraft({ website: e.target.value })}
                placeholder="https://..."
                icon="mail"
                variant="default"
                colorScheme="primary"
                size="md"
              />
              <AttractiveInput
                label="Twitter / X"
                value={accountDraft.twitter}
                onChange={(e) => patchAccountDraft({ twitter: e.target.value })}
                placeholder="Profile URL"
                icon="mail"
                variant="default"
                colorScheme="primary"
                size="md"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AttractiveInput
                label="Interests"
                value={getCurrentSetting('student', 'interests') || ''}
                onChange={(e) => handleSettingChange('student', 'interests', e.target.value)}
                placeholder="e.g., Web Development, Data Science, Design"
                icon="star"
                variant="default"
                colorScheme="primary"
                size="md"
                helperText="Your areas of interest"
              />
              <AttractiveInput
                label="Learning Goals"
                value={getCurrentSetting('student', 'learningGoals') || ''}
                onChange={(e) => handleSettingChange('student', 'learningGoals', e.target.value)}
                placeholder="e.g., Master React, Learn Python"
                icon="book"
                variant="default"
                colorScheme="primary"
                size="md"
                helperText="Your learning objectives"
              />
            </div>
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200 shadow-md hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Allow Instructor Messages</label>
                    <p className="text-sm text-muted-foreground">Let instructors contact you directly</p>
                  </div>
                  <Button
                    variant={getCurrentSetting('student', 'allowInstructorMessages') ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSettingChange('student', 'allowInstructorMessages', !getCurrentSetting('student', 'allowInstructorMessages'))}
                    className="border-2 border-purple-300 hover:border-purple-400 transition-all duration-200 font-semibold"
                  >
                    {getCurrentSetting('student', 'allowInstructorMessages') ? "Allowed" : "Disabled"}
                  </Button>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-green-200 shadow-md hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Show Progress</label>
                    <p className="text-sm text-muted-foreground">Display your learning progress to instructors</p>
                  </div>
                  <Button
                    variant={getCurrentSetting('student', 'showProgress') ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSettingChange('student', 'showProgress', !getCurrentSetting('student', 'showProgress'))}
                    className="border-2 border-green-300 hover:border-green-400 transition-all duration-200 font-semibold"
                  >
                    {getCurrentSetting('student', 'showProgress') ? "Visible" : "Hidden"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PageSection>
      </div>
    );
  };

  const renderNotificationSettings = () => {
    return (
      <div className="space-y-6">
        <PageSection
          title="Notification Preferences"
          description="Configure your notification settings"
          className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-200 my-6"
        >
          <div className="space-y-4">
            {[
              { key: 'courseNotifications', label: 'Course Notifications', description: 'Get notified about course updates and new content' },
              { key: 'assignmentNotifications', label: 'Assignment Notifications', description: 'Get notified about new assignments and deadlines' },
              { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
              { key: 'reminderNotifications', label: 'Reminder Notifications', description: 'Get reminded about upcoming deadlines and events' },
            ].map((setting) => (
              <div key={setting.key} className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-emerald-100 hover:bg-white/70 transition-all duration-200">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-slate-700">{setting.label}</label>
                  <p className="text-sm text-slate-600 mt-1">{setting.description}</p>
                </div>
                <Button
                  variant={getCurrentSetting('student', setting.key) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSettingChange('student', setting.key, !getCurrentSetting('student', setting.key))}
                  className={`transition-all duration-200 font-semibold ${
                    getCurrentSetting('student', setting.key)
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-2 border-emerald-400 shadow-lg'
                      : 'border-2 border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {getCurrentSetting('student', setting.key) ? "Enabled" : "Disabled"}
                </Button>
              </div>
            ))}
          </div>
        </PageSection>
      </div>
    );
  };

  const renderPasswordSettings = () => <AccountChangePasswordPanel />;

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <PageSection
        title="Email Configuration"
        description="Configure your email preferences"
        className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-200 my-6"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AttractiveInput
              label="Preferred Email"
              value={getCurrentSetting('student', 'preferredEmail') || user?.email || ''}
              onChange={(e) => handleSettingChange('student', 'preferredEmail', e.target.value)}
              placeholder="your-email@example.com"
              icon="mail"
              variant="default"
              colorScheme="primary"
              size="md"
              helperText="Email address for notifications"
            />
            <AttractiveInput
              label="Email Signature"
              value={getCurrentSetting('student', 'emailSignature') || ''}
              onChange={(e) => handleSettingChange('student', 'emailSignature', e.target.value)}
              placeholder="Best regards, [Your Name]"
              icon="edit"
              variant="default"
              colorScheme="primary"
              size="md"
              helperText="Signature for outgoing emails"
            />
          </div>
          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-200 shadow-md hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-foreground">Email Notifications</label>
                  <p className="text-sm text-muted-foreground">Receive email notifications for important updates</p>
                </div>
                <Button
                  variant={getCurrentSetting('student', 'emailNotifications') ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSettingChange('student', 'emailNotifications', !getCurrentSetting('student', 'emailNotifications'))}
                  className="border-2 border-blue-300 hover:border-blue-400 transition-all duration-200 font-semibold"
                >
                  {getCurrentSetting('student', 'emailNotifications') ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageSection>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'password':
        return renderPasswordSettings();
      case 'email':
        return renderEmailSettings();
      default:
        return renderProfileSettings();
    }
  };

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        <WelcomeSection 
          title="Student Settings" 
          description="Manage your student account settings and preferences"
          className="mb-6"
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <PageSection
            title="Settings"
            description="Choose a category to configure"
            className="bg-gradient-to-br from-slate-50 via-white to-gray-50 border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-200 my-6"
          >
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 rounded-lg border-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-lg'
                        : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 hover:shadow-md border-transparent'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                    <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-700'}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </PageSection>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading settings...</p>
                </div>
              </div>
            ) : (
              renderTabContent()
            )}
            
            {/* Error Display */}
            {error && (
              <PageSection
                title="Error"
                description={error}
                className="bg-gradient-to-br from-red-50 via-white to-pink-50 border-2 border-red-200 shadow-lg hover:shadow-xl transition-all duration-200 my-6"
              >
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Please check the error details above</span>
                </div>
              </PageSection>
            )}

            {/* Save Button */}
            <PageSection
              title="Save Changes"
              description={anyDirty ? 'You have unsaved changes' : 'All changes saved'}
              className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-200 my-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {anyDirty ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  )}
                  <span className={`text-sm font-medium ${anyDirty ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {anyDirty ? 'You have unsaved changes' : 'All changes saved'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleReset()}
                    disabled={!anyDirty}
                    className="border-2 border-emerald-300 hover:border-emerald-400 transition-all duration-200 font-semibold"
                  >
                    <LuRotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!anyDirty || saveStatus === 'saving'}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-2 border-emerald-400 shadow-lg transition-all duration-200 font-semibold"
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </PageSection>
          </div>
        </div>
      </main>
    </StudentRoleShell>
  );
}

export default function StudentSettingsPage() {
  return <StudentSettingsPageContent />;
}
