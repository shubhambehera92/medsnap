import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAppStore } from '@/stores/appStore';
import { useSimulatedLoad } from '@/lib/useSimulatedLoad';

export const Patients = () => {
  const { patients } = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { loading, error, retry } = useSimulatedLoad();

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.msId.toLowerCase().includes(search.toLowerCase()) ||
      p.caseNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout title="Patients">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-ink">Patients</h1>
            <p className="text-ink2">Manage patient records</p>
          </div>
          <div className="w-full md:w-64">
            <Input
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              aria-label="Search patients"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading patients">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-4 md:p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="font-medium text-ink mb-1">Something went wrong</p>
            <p className="text-sm text-ink2 mb-4">{error}</p>
            <button
              onClick={retry}
              className="text-sm font-medium text-primary hover:text-primary-hover min-h-[44px]"
            >
              Try again
            </button>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <h3 className="font-medium text-ink mb-1">No patients found</h3>
            <p className="text-sm text-ink2">Try adjusting your search terms</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((patient) => (
              <Card key={patient.id} className="p-4 md:p-6 hover:border-primary/40 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-primary">
                        {patient.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-semibold text-ink">{patient.name}</h3>
                      <p className="text-sm text-ink2">
                        {patient.msId} • Case {patient.caseNumber} • {patient.ward} • Age {patient.age}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        patient.consentStatus === 'On record'
                          ? 'bg-success-light text-success'
                          : patient.consentStatus === 'Expired'
                          ? 'bg-danger-light text-danger'
                          : 'bg-warning-light text-warning'
                      }`}
                    >
                      Consent: {patient.consentStatus}
                    </span>
                    {patient.consentExpiry && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-muted border border-border">
                        Expires: {patient.consentExpiry}
                      </span>
                    )}
                    <button
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover min-h-[44px] px-2"
                    >
                      View
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};
