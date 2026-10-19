import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Shield, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminPolicies = () => {
  const { idleTimeout, retentionDays, consentText, updatePolicy, addAuditEntry } = useAppStore();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  
  const [formData, setFormData] = useState({
    idleTimeout,
    retentionDays,
    consentText,
  });

  // Keep the form in step if policy is changed elsewhere (e.g. Settings).
  useEffect(() => {
    setFormData({ idleTimeout, retentionDays, consentText });
  }, [idleTimeout, retentionDays, consentText]);
  
  const handleSave = () => {
    addAuditEntry({
      userId: user?.id || '',
      userName: user?.name || '',
      role: user?.role || 'Admin',
      action: 'Update Policy',
      details: `Idle ${formData.idleTimeout}m • Retention ${formData.retentionDays}d`,
    });
    updatePolicy(formData);
    showToast('Policies saved and logged', 'success');
  };
  
  return (
    <MainLayout title="Policies">
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-ink">Policies</h1>
          <p className="text-ink2">Configure security, retention, and consent policies</p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-6 space-y-6">
            <h2 className="font-semibold text-ink flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Policies
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink">Idle Timeout (minutes)</label>
                <Input
                  type="number"
                  value={formData.idleTimeout}
                  onChange={(e) => setFormData({ ...formData, idleTimeout: parseInt(e.target.value) })}
                  min="1"
                  max="30"
                  helperText="Auto-logout after inactivity"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink">Retention Days</label>
                <Input
                  type="number"
                  value={formData.retentionDays}
                  onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value) })}
                  min="30"
                  max="730"
                  helperText="Days before auto-deletion"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-ink">Consent Text</label>
              <textarea
                value={formData.consentText}
                onChange={(e) => setFormData({ ...formData, consentText: e.target.value })}
                className="w-full h-24 rounded-xl border border-border bg-surface px-3 py-2 text-ink shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>
          </Card>
        </motion.div>
        
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};