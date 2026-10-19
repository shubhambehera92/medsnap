import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Bandage, CreditCard, TestTube } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCaptureStore } from '@/stores/captureStore';
import { PhotoType } from '@/types';
import { motion } from 'framer-motion';

const modes: { type: PhotoType; icon: React.ElementType; hint: string }[] = [
  { type: 'Label', icon: Package, hint: 'Medication labels, charts and markings' },
  { type: 'Wound', icon: Bandage, hint: 'Adds a ruler for size reference' },
  { type: 'Insurance card', icon: CreditCard, hint: 'Capture a card at the correct ratio' },
  { type: 'Home test', icon: TestTube, hint: 'Photograph a test result at home' },
];

export const ModePicker = () => {
  const navigate = useNavigate();
  const { setMode, setStep, reset } = useCaptureStore();
  const [selected, setSelected] = useState<PhotoType | null>(null);

  // Starting a capture always begins from a clean slate.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (!selected) return;
    setMode(selected);
    setStep('capture');
    navigate('/capture/camera');
  };

  return (
    <MainLayout title="Choose Mode">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-ink">Choose capture mode</h1>
          <p className="text-ink2">Select the type of photo you're about to take</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modes.map((mode, index) => {
            const Icon = mode.icon;
            const isSelected = selected === mode.type;
            return (
              <motion.div
                key={mode.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelected(mode.type)}
                  aria-pressed={isSelected}
                >
                  <Card
                    className={`p-6 transition-all hover:border-primary/40 min-h-[140px] ${
                      isSelected ? 'border-2 border-primary ring-2 ring-primary/10' : 'border border-border'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-primary text-white dark:text-[#04211E]' : 'bg-primary-light text-primary'
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-ink">{mode.type}</h3>
                        <p className="text-sm text-ink2">{mode.hint}</p>
                      </div>
                    </div>
                  </Card>
                </button>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button className="flex-1" disabled={!selected} onClick={start}>
            Continue
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};
