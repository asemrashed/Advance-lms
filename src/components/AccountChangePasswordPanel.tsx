'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AttractiveInput } from '@/components/ui/attractive-input';
import PageSection from '@/components/PageSection';
import { postAccountChangePassword } from '@/lib/accountClient';
import { LuKey, LuRefreshCw as RefreshCw, LuTriangleAlert as AlertTriangle } from 'react-icons/lu';

export default function AccountChangePasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmToastOpen, setConfirmToastOpen] = useState(false);

  const validateFields = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = 'Current password is required';
    if (!newPassword) errs.newPassword = 'New password is required';
    else if (newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your new password';
    else if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleChangePasswordClick = () => {
    setGeneralError(null);
    setSuccess(null);
    const errs = validateFields();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setConfirmToastOpen(true);
  };

  const performPasswordChange = async () => {
    setConfirmToastOpen(false);
    setGeneralError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const response = await postAccountChangePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (!response.ok || !data.success) {
        const msg = data.error || 'Failed to change password';
        setGeneralError(msg);
        if (msg.toLowerCase().includes('current password')) {
          setFieldErrors((prev) => ({ ...prev, currentPassword: msg }));
        }
        return;
      }
      setSuccess(data.message || 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFieldErrors({});
    } catch {
      setGeneralError('An error occurred while changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative space-y-6">
      {confirmToastOpen && (
        <div
          className="fixed bottom-6 right-6 z-[100] flex max-w-md animate-in fade-in slide-in-from-bottom-2 flex-col gap-3 rounded-lg border-2 border-amber-200 bg-white p-4 shadow-xl duration-200"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="password-confirm-toast-title"
          aria-describedby="password-confirm-toast-desc"
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div>
              <p id="password-confirm-toast-title" className="text-sm font-semibold text-foreground">
                Confirm password change
              </p>
              <p id="password-confirm-toast-desc" className="mt-1 text-sm text-muted-foreground">
                Your password will be updated immediately. Continue?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-semibold"
              onClick={() => setConfirmToastOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-gradient-to-r from-red-600 to-pink-600 font-semibold text-white hover:from-red-700 hover:to-pink-700"
              onClick={() => void performPasswordChange()}
            >
              Change password
            </Button>
          </div>
        </div>
      )}
      {confirmToastOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[90] bg-black/30"
          aria-label="Dismiss password confirmation"
          onClick={() => setConfirmToastOpen(false)}
        />
      )}
      <PageSection
        title="Change Password"
        description="Update your account password"
        className="bg-gradient-to-br from-red-50 via-white to-pink-50 border-2 border-red-200 shadow-lg hover:shadow-xl transition-all duration-200 my-6"
      >
        <div className="space-y-6">
          {generalError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{generalError}</div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              {success}
            </div>
          )}
          <AttractiveInput
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            icon="lock"
            variant="default"
            colorScheme="primary"
            size="md"
            error={fieldErrors.currentPassword}
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <AttractiveInput
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              icon="lock"
              variant="default"
              colorScheme="primary"
              size="md"
              error={fieldErrors.newPassword}
              helperText="Minimum 8 characters"
            />
            <AttractiveInput
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              icon="lock"
              variant="default"
              colorScheme="primary"
              size="md"
              error={fieldErrors.confirmPassword}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleChangePasswordClick}
              disabled={loading}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white border-2 border-red-400 shadow-lg transition-all duration-200 font-semibold"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <LuKey className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
