'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Teacher } from '@/types/teacher';
import Modal from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { hasCompleteBankDetails } from '@/lib/bankDetails';
import { LuCheck as Check, LuCopy as Copy } from 'react-icons/lu';

type TeacherDetailsModalProps = {
  open: boolean;
  teacher: Teacher | null;
  onClose: () => void;
};

function DetailField({
  label,
  value,
  copyable = false,
  emphasize,
}: {
  label: string;
  value?: string | null;
  copyable?: boolean;
  emphasize?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const display = value?.trim() ? value.trim() : 'Not provided';
  const hasValue = Boolean(value?.trim());

  const copy = async () => {
    if (!hasValue) return;
    try {
      await navigator.clipboard.writeText(value!.trim());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={`rounded-lg border p-3 ${
        emphasize ? 'border-amber-200 bg-amber-50/60' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
        {copyable ? (
          <button
            type="button"
            onClick={() => void copy()}
            disabled={!hasValue}
            title={hasValue ? `Copy ${label}` : 'Nothing to copy'}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}
      </div>
      <p
        className={`break-all text-sm font-medium ${
          hasValue ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {display}
      </p>
    </div>
  );
}

export default function TeacherDetailsModal({
  open,
  teacher,
  onClose,
}: TeacherDetailsModalProps) {
  if (!teacher) return null;

  const displayName = teacher.name || 'Instructor';
  const bankComplete = hasCompleteBankDetails(teacher.bankDetails);
  const createdAt = teacher.createdAt
    ? format(new Date(teacher.createdAt), 'MMM dd, yyyy')
    : '—';
  const lastLogin = teacher.lastLogin
    ? format(new Date(teacher.lastLogin), 'MMM dd, yyyy')
    : 'Never';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Instructor details"
      description={displayName}
      size="xl"
      showCancelButton={false}
      footer={
        <div className="flex w-full justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              teacher.accountStatus === 'active'
                ? 'default'
                : teacher.accountStatus === 'blocked'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {teacher.accountStatus === 'active'
              ? 'Active'
              : teacher.accountStatus === 'blocked'
                ? 'Blocked'
                : 'Pending'}
          </Badge>
          <Badge
            className={
              bankComplete
                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
            }
          >
            {bankComplete ? 'Bank details complete' : 'Bank details missing'}
          </Badge>
        </div>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Personal</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField label="Full name" value={displayName} />
            <DetailField label="Email" value={teacher.email} copyable />
            <DetailField label="Phone" value={teacher.phone} copyable />
            <DetailField label="Specialization" value={teacher.specialization} />
            <DetailField label="Experience" value={teacher.experience} />
            <DetailField label="Education" value={teacher.education} />
            <DetailField
              label="Pass-out institute"
              value={teacher.passOutInstitute}
            />
            <DetailField
              label="Address"
              value={teacher.address?.fullAddress}
            />
            <div className="sm:col-span-2">
              <DetailField label="Bio" value={teacher.bio} />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Social links</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField
              label="LinkedIn"
              value={teacher.socialLinks?.linkedin}
            />
            <DetailField
              label="Website"
              value={teacher.socialLinks?.website}
            />
            <DetailField
              label="Twitter / X"
              value={teacher.socialLinks?.twitter}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Bank details</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField
              label="Account holder"
              value={teacher.bankDetails?.accountHolderName}
              copyable
              emphasize
            />
            <DetailField
              label="Bank name"
              value={teacher.bankDetails?.bankName}
              copyable
              emphasize
            />
            <DetailField
              label="Branch name"
              value={teacher.bankDetails?.branchName}
              copyable
              emphasize
            />
            <DetailField
              label="Account number"
              value={teacher.bankDetails?.accountNumber}
              copyable
              emphasize
            />
            <DetailField
              label="Routing number"
              value={teacher.bankDetails?.routingNumber}
              copyable
              emphasize
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Account</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField label="Member since" value={createdAt} />
            <DetailField label="Last login" value={lastLogin} />
            <DetailField label="Instructor ID" value={teacher._id} />
          </div>
        </section>
      </div>
    </Modal>
  );
}
