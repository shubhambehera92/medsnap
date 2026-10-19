import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAppStore } from '@/stores/appStore';
import { useUIStore } from '@/stores/uiStore';
import { useSimulatedLoad } from '@/lib/useSimulatedLoad';
import { logAudit } from '@/lib/audit';
import { Search, Download, Shield } from 'lucide-react';

export const AdminAudit = () => {
  const { auditLog } = useAppStore();
  const { showToast } = useUIStore();
  const { loading } = useSimulatedLoad(450);
  const [search, setSearch] = useState('');

  const filtered = auditLog.filter(
    (entry) =>
      entry.action.toLowerCase().includes(search.toLowerCase()) ||
      entry.userName.toLowerCase().includes(search.toLowerCase()) ||
      (entry.patient || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    const header = ['Timestamp', 'User', 'Role', 'Action', 'Patient', 'Device', 'Details'];
    const rows = filtered.map((e) => [
      e.timestamp,
      e.userName,
      e.role,
      e.action,
      e.patient || '',
      e.device,
      e.details || '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medsnap-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logAudit({ action: 'Export Audit CSV', details: `Exported ${filtered.length} entries` });
    showToast(`Exported ${filtered.length} entries (logged)`, 'success');
  };

  return (
    <MainLayout title="Audit Log">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-ink">Audit Log</h1>
            <p className="text-ink2">Immutable record of all system actions</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="w-full md:w-64">
              <Input
                placeholder="Search audit log..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                aria-label="Search audit log"
              />
            </div>
            <Button variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card className="p-4 bg-info-light/30 border-info/20">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-info">Audit log integrity</p>
              <p className="text-xs text-info/80">
                Entries are append-only and cannot be edited or deleted. Every action is permanently recorded.
              </p>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading audit log">
            {[0, 1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-medium text-ink mb-1">No audit entries</p>
            <p className="text-sm text-ink2">Actions will appear here as staff use the system.</p>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-bg border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink2 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink2 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink2 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink2 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink2 uppercase tracking-wider">Device</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ink2 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => (
                      <tr key={entry.id} className="border-b border-border last:border-0">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink tabular-nums">
                          {new Date(entry.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium text-ink">{entry.userName}</div>
                          <div className="text-xs text-ink2">{entry.role}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg text-ink2 border border-border">
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">{entry.patient || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink2">{entry.device}</td>
                        <td className="px-6 py-4 text-sm text-ink2 max-w-xs">{entry.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((entry) => (
                <Card key={entry.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg text-ink2 border border-border">
                      {entry.action}
                    </span>
                    <span className="text-xs text-muted tabular-nums flex-shrink-0">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-ink">
                    {entry.userName} <span className="text-ink2">({entry.role})</span>
                  </p>
                  {entry.patient && <p className="text-xs text-ink2">Patient: {entry.patient}</p>}
                  {entry.details && <p className="text-xs text-ink2">{entry.details}</p>}
                  <p className="text-[11px] text-muted">Device: {entry.device}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};
