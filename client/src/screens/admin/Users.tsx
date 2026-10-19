import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DEMO_USERS } from '@/data/demo';
import { User } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { logAudit } from '@/lib/audit';
import { Search, UserX, UserCheck, MoreVertical, ShieldCheck, KeyRound } from 'lucide-react';

export const AdminUsers = () => {
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const [users, setUsers] = useState<User[]>(DEMO_USERS);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<User | null>(null);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (target: User) => {
    const next = target.status === 'Active' ? 'Disabled' : 'Active';
    setUsers((list) => list.map((u) => (u.id === target.id ? { ...u, status: next } : u)));
    logAudit({
      action: next === 'Active' ? 'Enable User' : 'Disable User',
      target: target.id,
      details: `${target.name} set to ${next}`,
    });
    showToast(`${target.name} is now ${next}`, 'success');
  };

  const resetMFA = (target: User) => {
    logAudit({ action: 'Reset MFA', target: target.id, details: `MFA reset for ${target.name}` });
    showToast(`MFA reset for ${target.name}`, 'info');
    setSelected(null);
  };

  return (
    <MainLayout title="Users & Roles">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-ink">Users & Roles</h1>
            <p className="text-ink2">Manage user accounts and permissions</p>
          </div>
          <div className="w-full md:w-64">
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              aria-label="Search users"
            />
          </div>
        </div>

        {/* Desktop table */}
        <Card className="hidden md:block overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ink2 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ink2 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ink2 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ink2 uppercase tracking-wider">Last active</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-ink2 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary text-white dark:text-[#04211E] flex items-center justify-center font-medium text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-ink">{u.name}</div>
                          <div className="text-sm text-ink2">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg text-ink2 border border-border">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.status === 'Active'
                            ? 'bg-success-light text-success'
                            : 'bg-warning-light text-warning'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink2">
                      {new Date(u.lastActive).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(u)}
                          aria-label={u.status === 'Active' ? `Disable ${u.name}` : `Enable ${u.name}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-ink2 hover:bg-bg"
                        >
                          {u.status === 'Active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => setSelected(u)}
                          aria-label={`${u.name} actions`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-ink2 hover:bg-bg"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filtered.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary text-white dark:text-[#04211E] flex items-center justify-center font-medium text-sm flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{u.name}</p>
                  <p className="text-sm text-ink2 truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg text-ink2 border border-border">
                      {u.role}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'Active'
                          ? 'bg-success-light text-success'
                          : 'bg-warning-light text-warning'
                      }`}
                    >
                      {u.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => toggleStatus(u)}
                  className="flex-1 min-h-[44px] rounded-xl border border-border text-sm font-medium text-ink inline-flex items-center justify-center gap-2"
                >
                  {u.status === 'Active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  {u.status === 'Active' ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => setSelected(u)}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-border text-ink2 inline-flex items-center justify-center"
                  aria-label={`${u.name} actions`}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card className="p-8 text-center">
            <p className="font-medium text-ink mb-1">No users found</p>
            <p className="text-sm text-ink2">Try a different search.</p>
          </Card>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || 'User'}>
        {selected && (
          <div className="space-y-4">
            <div className="text-sm text-ink2 space-y-1">
              <p><span className="text-muted">Email:</span> {selected.email}</p>
              <p><strong className="text-ink">Role:</strong> {selected.role}</p>
              <p><strong className="text-ink">Status:</strong> {selected.status}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => resetMFA(selected)}
                className="min-h-[44px] rounded-xl border border-border text-sm font-medium text-ink inline-flex items-center justify-center gap-2"
              >
                <KeyRound className="h-4 w-4" /> Reset MFA
              </button>
              <button
                onClick={() => {
                  logAudit({ action: 'Apply Least-Privilege', target: selected.id, details: `Role review for ${selected.name}` });
                  showToast('Role policy checked (demo)', 'info');
                  setSelected(null);
                }}
                className="min-h-[44px] rounded-xl border border-border text-sm font-medium text-ink inline-flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" /> Review permissions
              </button>
              <p className="text-xs text-muted">
                Signed in as {user?.name}. Every admin action is written to the audit log.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
};
