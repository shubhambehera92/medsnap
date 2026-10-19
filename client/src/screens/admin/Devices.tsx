import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { Smartphone, Laptop, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminDevices = () => {
  const { devices, updateDevice, addAuditEntry } = useAppStore();
  const { user } = useAuthStore();
  const [confirmDevice, setConfirmDevice] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState('');
  
  const getDeviceIcon = (os: string) => {
    if (os.includes('iPad') || os.includes('iOS') || os.includes('Android')) {
      return Smartphone;
    }
    return Laptop;
  };
  
  const handleWipe = (deviceId: string, deviceName: string) => {
    setConfirmDevice(deviceId);
    setConfirmName(deviceName);
  };
  
  const confirmWipe = () => {
    if (confirmDevice && confirmName && confirmName === devices.find(d => d.id === confirmDevice)?.name) {
      updateDevice(confirmDevice, { status: 'Wiped' });
      addAuditEntry({
        userId: user?.id || '',
        userName: user?.name || '',
        role: user?.role || 'Admin',
        action: 'Remote Wipe',
        target: confirmDevice,
        details: `Wiped device: ${confirmName}`,
      });
      setConfirmDevice(null);
      setConfirmName('');
    }
  };
  
  return (
    <MainLayout title="Devices">
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-ink">Devices</h1>
          <p className="text-ink2">Manage registered devices and remote wipe</p>
        </div>
        
        <div className="space-y-3">
          {devices.map((device, index) => {
            const Icon = getDeviceIcon(device.os);
            return (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-bg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-ink2" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium text-ink">{device.name}</h3>
                        <p className="text-sm text-ink2">
                          {device.os} • Last seen: {new Date(device.lastSeen).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted">Registered by: {device.registeredBy}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          device.status === 'Active'
                            ? 'success'
                            : device.status === 'Wipe pending'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {device.status}
                      </Badge>
                      {device.status !== 'Wiped' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleWipe(device.id, device.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remote Wipe
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
        
        {/* Confirm Dialog */}
        <AnimatePresence>
          {confirmDevice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]"
              onClick={() => setConfirmDevice(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-soft"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-danger-light flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-danger" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-ink">Confirm Remote Wipe</h3>
                      <p className="text-sm text-ink2">
                        This action will permanently delete all data from this device. This cannot be undone.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-ink">
                      Type the device name to confirm:
                    </label>
                    <Input
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={devices.find(d => d.id === confirmDevice)?.name}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setConfirmDevice(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      className="flex-1"
                      onClick={confirmWipe}
                      disabled={confirmName !== devices.find(d => d.id === confirmDevice)?.name}
                    >
                      Wipe Device
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
};