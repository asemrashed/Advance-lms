"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AdminRoleShell } from "@/components/role-area/AdminRoleShell";
import AdminPageWrapper from "@/components/AdminPageWrapper";
import PageSection from "@/components/PageSection";
import WelcomeSection from "@/components/WelcomeSection";
import ConfirmModal from "@/components/ui/confirm-modal";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSuperAdmin } from "@/lib/roles";
import {
  DEFAULT_ADMIN_PERMISSIONS,
  type AdminPermission,
} from "@/lib/adminPermissions";
import { AdminPermissionChecklist } from "@/components/admin/AdminPermissionChecklist";
import { LuPlus, LuShield, LuSlidersHorizontal, LuTrash2 } from "react-icons/lu";

type AdminRow = {
  _id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  accountStatus?: string;
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string;
  adminPermissions?: AdminPermission[];
};

function AdminsPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const canManage = isSuperAdmin(session?.user?.role);

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<AdminPermission[]>([
    ...DEFAULT_ADMIN_PERMISSIONS,
  ]);
  const [toRemove, setToRemove] = useState<AdminRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([]);
  const [savingLimits, setSavingLimits] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!canManage) {
      router.replace("/admin/dashboard");
    }
  }, [canManage, router, status]);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/admins", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load admins");
        return;
      }
      setAdmins(Array.isArray(data.admins) ? data.admins : []);
    } catch {
      setError("Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) void fetchAdmins();
  }, [canManage, fetchAdmins]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setTemporaryPassword("");
    setInvitePermissions([...DEFAULT_ADMIN_PERMISSIONS]);
    setShowForm(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          temporaryPassword,
          adminPermissions: invitePermissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create admin");
        return;
      }
      setSuccess(
        data.warning ||
          `Admin invited. Login details were emailed to ${email.trim()}.`,
      );
      resetForm();
      await fetchAdmins();
    } catch {
      setError("Failed to create admin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/admins/${toRemove._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to remove admin");
        return;
      }
      setToRemove(null);
      await fetchAdmins();
    } catch {
      setError("Failed to remove admin");
    } finally {
      setRemoving(false);
    }
  };

  const openLimits = (admin: AdminRow) => {
    setEditing(admin);
    setEditPermissions(admin.adminPermissions ?? [...DEFAULT_ADMIN_PERMISSIONS]);
  };

  const saveLimits = async () => {
    if (!editing) return;
    setSavingLimits(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/admins/${editing._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPermissions: editPermissions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update work limits");
        return;
      }
      setEditing(null);
      setSuccess(`Updated work limits for ${editing.name}.`);
      await fetchAdmins();
    } catch {
      setError("Failed to update work limits");
    } finally {
      setSavingLimits(false);
    }
  };

  if (status === "loading" || !canManage) {
    return (
      <AdminRoleShell>
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </AdminRoleShell>
    );
  }

  return (
    <AdminRoleShell>
      <div className="space-y-6 p-4 md:p-6">
        <WelcomeSection
          title="Admins"
          description="Invite admins and choose which work they can do. Super admins keep full platform control."
        />

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </p>
        ) : null}

        <PageSection
          title="Team"
          actions={
            <Button type="button" onClick={() => setShowForm((v) => !v)} className="gap-2">
              <LuPlus className="h-4 w-4" />
              {showForm ? "Cancel" : "Add admin"}
            </Button>
          }
        >
          {showForm ? (
            <form
              onSubmit={handleInvite}
              className="mb-6 grid max-w-2xl gap-4 rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="space-y-2">
                <Label htmlFor="admin-name">Name (optional)</Label>
                <Input
                  id="admin-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Gmail / email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-temp-pass">Temporary password</Label>
                <Input
                  id="admin-temp-pass"
                  type="text"
                  required
                  minLength={6}
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  They sign in with this password. Ask them to change it under Settings → Password.
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">Work limits</p>
                <AdminPermissionChecklist
                  value={invitePermissions}
                  onChange={setInvitePermissions}
                  disabled={submitting}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-fit gap-2">
                <LuShield className="h-4 w-4" />
                {submitting ? "Sending…" : "Create & send invite"}
              </Button>
            </form>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading admins…</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admins found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => {
                    const blocked = admin.accountStatus === "blocked" || admin.isActive === false;
                    const isSelf = admin._id === session?.user?.id;
                    return (
                      <tr key={admin._id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium text-gray-900">{admin.name}</td>
                        <td className="px-4 py-3 text-gray-600">{admin.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              admin.role === "super_admin"
                                ? "rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800"
                                : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                            }
                          >
                            {admin.role === "super_admin" ? "Super admin" : "Admin"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {blocked ? "Blocked" : "Active"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {admin.role === "admin" && !blocked ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                onClick={() => openLimits(admin)}
                              >
                                <LuSlidersHorizontal className="h-4 w-4" />
                                Limits
                              </Button>
                              {!isSelf ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => setToRemove(admin)}
                                >
                                  <LuTrash2 className="h-4 w-4" />
                                  Block
                                </Button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PageSection>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Work limits — ${editing.name}` : "Work limits"}
        description="Choose what this admin can do. Unchecked work stays with super admins."
        size="lg"
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={savingLimits}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveLimits()}
              disabled={savingLimits}
              className="flex-1"
            >
              {savingLimits ? "Saving…" : "Save limits"}
            </Button>
          </div>
        }
      >
        <AdminPermissionChecklist
          value={editPermissions}
          onChange={setEditPermissions}
          disabled={savingLimits}
        />
      </Modal>

      <ConfirmModal
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        onConfirm={handleRemove}
        title="Block admin?"
        description={
          toRemove
            ? `${toRemove.name} (${toRemove.email}) will no longer be able to sign in.`
            : undefined
        }
        confirmText={removing ? "Blocking…" : "Block admin"}
        loading={removing}
        variant="danger"
      />
    </AdminRoleShell>
  );
}

export default function AdminsPage() {
  return (
    <AdminPageWrapper>
      <AdminsPageContent />
    </AdminPageWrapper>
  );
}
