import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/layout/Logo';
import { useAuthStore } from '@/stores/authStore';
import { logAudit } from '@/lib/audit';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'nurse' | 'doctor' | 'admin'>('nurse');
  
  const { login } = useAuthStore();
  const navigate = useNavigate();
  
  const demoCredentials = {
    nurse: { email: 'sarah.johnson@medsnap.demo', password: 'demo123', name: 'Sarah Johnson' },
    doctor: { email: 'michael.brown@medsnap.demo', password: 'demo123', name: 'Dr. Michael Brown' },
    admin: { email: 'david.wilson@medsnap.demo', password: 'demo123', name: 'David Wilson' },
  };
  
  const handleDemoFill = () => {
    const creds = demoCredentials[activeTab];
    setEmail(creds.email);
    setPassword(creds.password);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await login(email, password);
      if (result.success && result.requiresMFA) {
        navigate('/mfa');
      } else if (!result.success) {
        setError(result.message || 'Login failed');
        logAudit({ action: 'Failed Login', details: result.message || `Failed sign-in for ${email}` });
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left panel - Desktop */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden lg:block space-y-8"
          >
            <div className="space-y-4">
              <Logo size="lg" />
              <h1 className="text-2xl font-semibold text-ink">Secure clinical photos. Every action accountable.</h1>
              <p className="text-lg text-ink2">MedSnap provides secure clinical photo capture and sharing for hospital staff with full audit trail and compliance controls.</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border shadow-soft">
                <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-ink">End-to-End Encryption</h3>
                  <p className="text-sm text-ink2">All photos encrypted at rest and in transit</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border shadow-soft">
                <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-ink">MFA Authentication</h3>
                  <p className="text-sm text-ink2">Multi-factor authentication for all users</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border shadow-soft">
                <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-ink">Complete Audit Trail</h3>
                  <p className="text-sm text-ink2">Every action logged and immutable</p>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Right panel - Login form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="p-6 md:p-8">
              <div className="space-y-6">
                <div className="text-center lg:hidden">
                  <Logo size="lg" className="justify-center mb-4" />
                </div>
                
                <div className="space-y-2 text-center">
                  <h2 className="text-xl font-semibold text-ink">Sign In</h2>
                  <p className="text-sm text-ink2">Authorized staff only. All activity is logged.</p>
                </div>
                
                {/* Demo credentials box */}
                <div className="bg-primary-light/30 border border-primary/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-ink text-sm">Demo Credentials</h3>
                    <Badge variant="info">MFA: 123456</Badge>
                  </div>
                  
                  <div className="flex gap-1 bg-bg rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('nurse')}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        activeTab === 'nurse'
                          ? 'bg-primary text-white dark:text-[#04211E]'
                          : 'text-ink2 hover:text-ink'
                      }`}
                    >
                      Nurse
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('doctor')}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        activeTab === 'doctor'
                          ? 'bg-primary text-white dark:text-[#04211E]'
                          : 'text-ink2 hover:text-ink'
                      }`}
                    >
                      Doctor
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('admin')}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        activeTab === 'admin'
                          ? 'bg-primary text-white dark:text-[#04211E]'
                          : 'text-ink2 hover:text-ink'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                  
                  <div className="text-xs text-ink2 space-y-1">
                    <p><span className="font-medium">Email:</span> {demoCredentials[activeTab].email}</p>
                    <p><span className="font-medium">Password:</span> demo123</p>
                  </div>
                  
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleDemoFill}
                    className="w-full"
                  >
                    Autofill Demo Credentials
                  </Button>
                </div>
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-danger-light border border-danger/20 rounded-xl text-danger text-sm"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    leftIcon={<Mail className="h-4 w-4" />}
                    required
                  />
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-ink">Password</label>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    loading={isLoading}
                    disabled={!email || !password}
                  >
                    Sign In
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};