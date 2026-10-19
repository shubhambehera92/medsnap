import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { OTPInput } from '@/components/ui/OTPInput';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { logAudit } from '@/lib/audit';

export const MFA = () => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [shake, setShake] = useState(false);
  
  const { verifyMFA, user, logout } = useAuthStore();
  const { showToast } = useUIStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    if (code.length === 6) {
      handleVerify();
    }
  }, [code]);
  
  const handleVerify = async () => {
    if (code.length !== 6) return;
    setIsLoading(true);
    setError('');
    
    try {
      const result = await verifyMFA(code);
      if (result.success) {
        logAudit({ action: 'Login', details: 'MFA verified' });
        showToast('Login successful', 'success');
        if (user) {
          navigate(`/${user.role.toLowerCase()}/home`);
        } else {
          navigate('/');
        }
      } else {
        logAudit({ action: 'Failed MFA', details: 'Invalid verification code' });
        setError(result.message || 'Invalid code');
        setShake(true);
        setCode('');
        setTimeout(() => setShake(false), 500);
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResend = () => {
    if (!canResend) return;
    setResendTimer(30);
    setCanResend(false);
    showToast('Verification code sent', 'info');
    // Restart timer
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const handleBack = () => {
    logAudit({ action: 'Login Cancelled', details: 'Left the MFA step' });
    logout();
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="p-6 md:p-8">
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 bg-primary-light rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-ink">Two-Factor Authentication</h2>
                <p className="text-sm text-ink2 mt-2">
                  Enter the 6-digit code sent to your device
                </p>
                <p className="text-xs text-muted mt-1">Demo code: 123456</p>
              </div>
            </div>
            
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 p-3 bg-danger-light border border-danger/20 rounded-xl text-danger text-sm"
              >
                <AlertCircle className="h-4 w-4" />
                {error}
              </motion.div>
            )}
            
            <motion.div
              animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.5 }}
              className="flex justify-center"
            >
              <OTPInput
                value={code}
                onChange={setCode}
                error={!!error}
                disabled={isLoading}
              />
            </motion.div>
            
            <div className="space-y-3">
              <Button
                onClick={handleVerify}
                className="w-full"
                loading={isLoading}
                disabled={code.length !== 6}
              >
                Verify
              </Button>
              
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={handleResend}
                  disabled={!canResend || isLoading}
                  className="text-primary hover:text-primary-hover disabled:text-muted disabled:cursor-not-allowed min-h-[44px] px-2"
                >
                  {canResend ? 'Resend code' : `Resend code in ${resendTimer}s`}
                </button>
                
                <button
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-ink2 hover:text-ink min-h-[44px] px-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};