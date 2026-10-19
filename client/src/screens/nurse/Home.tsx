import { useNavigate } from 'react-router-dom';
import { Clock, Users, Camera } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useUIStore } from '@/stores/uiStore';
import { motion } from 'framer-motion';

export const NurseHome = () => {
  const { user } = useAuthStore();
  const { patients, photos } = useAppStore();
  const { isOnline } = useUIStore();
  const navigate = useNavigate();
  
  const queuedCount = photos.filter((p) => p.status === 'Queued').length;
  const heldCount = photos.filter((p) => p.status === 'Held').length;
  const todayPatients = patients.slice(0, 3);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  
  return (
    <MainLayout title="Home">
      <div className="space-y-6">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-1"
        >
          <h1 className="text-2xl font-semibold text-ink">
            {getGreeting()}, {user?.name}
          </h1>
          <p className="text-ink2">Nurse, Ward 4, City General Demo Hospital</p>
        </motion.div>
        
        {/* Big Capture Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <Button
            onClick={() => navigate('/capture/mode')}
            className="w-full h-24 md:h-32 text-lg md:text-xl shadow-float"
            size="lg"
          >
            <Camera className="h-8 w-8 md:h-10 md:w-10" />
            Start Capture
          </Button>
        </motion.div>
        
        {/* Status cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink2">Sync Status</p>
                <p className="text-lg font-semibold text-ink mt-1">
                  {isOnline ? 'Online' : `${queuedCount} queued`}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                isOnline ? 'bg-success-light' : 'bg-warning-light'
              }`}>
                <Clock className={`h-5 w-5 ${isOnline ? 'text-success' : 'text-warning'}`} />
              </div>
            </div>
            {!isOnline && queuedCount > 0 && (
              <Badge variant="warning" className="mt-3">
                {queuedCount} items queued
              </Badge>
            )}
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink2">Held Photos</p>
                <p className="text-lg font-semibold text-ink mt-1">{heldCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-info-light flex items-center justify-center">
                <Camera className="h-5 w-5 text-info" />
              </div>
            </div>
            {heldCount > 0 && (
              <Button variant="ghost" size="sm" className="mt-3 p-0 h-auto" onClick={() => navigate('/sync')}>
                View held photos
              </Button>
            )}
          </Card>
        </motion.div>
        
        {/* Today's patients */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink">Today's Patients</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/patients')}>
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {todayPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-bg transition-colors cursor-pointer"
                  onClick={() => navigate(`/patients/${patient.id}`)}
                >
                  <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-ink">{patient.name}</p>
                    <p className="text-sm text-ink2">
                      {patient.msId} • {patient.ward} • Age {patient.age}
                    </p>
                  </div>
                  <Badge variant={
                    patient.consentStatus === 'On record' ? 'success' :
                    patient.consentStatus === 'Expired' ? 'danger' : 'warning'
                  }>
                    {patient.consentStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
};