import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ToastContainer } from './components/ui/Toast';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { DemoHelper } from './components/DemoHelper';
import { InactivityGuard } from './components/InactivityGuard';
import { SyncManager } from './components/SyncManager';

// Auth screens
import { Login } from './screens/Login';
import { MFA } from './screens/MFA';

// Role homes
import { NurseHome } from './screens/nurse/Home';
import { DoctorHome } from './screens/doctor/Home';
import { AdminHome } from './screens/admin/Home';

// Capture flow
import { ModePicker } from './screens/capture/ModePicker';
import { CameraScreen } from './screens/capture/Camera';
import { Preview } from './screens/capture/Preview';
import { VerifyPatient } from './screens/capture/VerifyPatient';
import { Consent } from './screens/capture/Consent';
import { Receipt } from './screens/capture/Receipt';

// Shared
import { Patients } from './screens/Patients';
import { PatientRecord } from './screens/PatientRecord';
import { PhotoViewer } from './screens/PhotoViewer';
import { Sync } from './screens/Sync';
import { Settings } from './screens/Settings';
import { Chat } from './screens/chat/Chat';

// Doctor
import { DoctorInbox } from './screens/doctor/Inbox';

// Admin
import { AdminUsers } from './screens/admin/Users';
import { AdminPolicies } from './screens/admin/Policies';
import { AdminAudit } from './screens/admin/Audit';
import { AdminDevices } from './screens/admin/Devices';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role.toLowerCase()}/home`} replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    return <Navigate to={`/${user.role.toLowerCase()}/home`} replace />;
  }

  return <>{children}</>;
}

/**
 * Guards the MFA step. A user who has passed the password step has `user` set
 * but is *not* yet `isAuthenticated`, so this must not use ProtectedRoute.
 */
function MfaRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();

  if (isAuthenticated && user) {
    return <Navigate to={`/${user.role.toLowerCase()}/home`} replace />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <OfflineBanner />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/mfa" element={<MfaRoute><MFA /></MfaRoute>} />

        {/* Nurse home */}
        <Route path="/nurse/home" element={<ProtectedRoute allowedRoles={['Nurse']}><NurseHome /></ProtectedRoute>} />

        {/* Doctor */}
        <Route path="/doctor/home" element={<ProtectedRoute allowedRoles={['Doctor']}><DoctorHome /></ProtectedRoute>} />
        <Route path="/doctor/inbox" element={<ProtectedRoute allowedRoles={['Doctor']}><DoctorInbox /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/home" element={<ProtectedRoute allowedRoles={['Admin']}><AdminHome /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['Admin']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/policies" element={<ProtectedRoute allowedRoles={['Admin']}><AdminPolicies /></ProtectedRoute>} />
        <Route path="/admin/devices" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDevices /></ProtectedRoute>} />
        {/* Audit viewer: admins always; also reachable read-only from a filed receipt */}
        <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={['Admin']}><AdminAudit /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute><AdminAudit /></ProtectedRoute>} />

        {/* Capture flow */}
        <Route path="/capture/mode" element={<ProtectedRoute><ModePicker /></ProtectedRoute>} />
        <Route path="/capture/camera" element={<ProtectedRoute><CameraScreen /></ProtectedRoute>} />
        <Route path="/capture/review" element={<ProtectedRoute><Preview /></ProtectedRoute>} />
        <Route path="/capture/patient" element={<ProtectedRoute><VerifyPatient /></ProtectedRoute>} />
        <Route path="/capture/consent" element={<ProtectedRoute><Consent /></ProtectedRoute>} />
        <Route path="/capture/receipt" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />

        {/* Shared */}
        <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
        <Route path="/patients/:id" element={<ProtectedRoute><PatientRecord /></ProtectedRoute>} />
        <Route path="/photo/:id" element={<ProtectedRoute><PhotoViewer /></ProtectedRoute>} />
        <Route path="/sync" element={<ProtectedRoute><Sync /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <InactivityGuard />
      <SyncManager />
      <DemoHelper />
      <DemoCredits />
    </>
  );
}

function DemoCredits() {
  return (
    <div className="fixed bottom-2 left-2 z-[70] hidden xl:block">
      <span className="text-[10px] text-muted bg-surface/80 border border-border rounded-full px-2 py-1">
        Team Techbuzzers · Hackyard Round 2 · DEMO DATA only
      </span>
    </div>
  );
}