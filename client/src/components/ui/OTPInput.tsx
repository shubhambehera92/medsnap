import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export const OTPInput = ({ length = 6, value, onChange, error = false, disabled = false }: OTPInputProps) => {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputRefs = useRef<HTMLInputElement[]>([]);
  
  useEffect(() => {
    const digits = value.split('').slice(0, length);
    const newOtp = Array(length).fill('');
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
  }, [value, length]);
  
  const handleChange = (index: number, digit: string) => {
    if (disabled) return;
    if (!/^\d*$/.test(digit)) return;
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    
    const newValue = newOtp.join('');
    onChange(newValue);
    
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newOtp = Array(length).fill('');
    pasteData.split('').forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
    onChange(newOtp.join(''));
    
    if (pasteData.length > 0) {
      inputRefs.current[Math.min(pasteData.length - 1, length - 1)]?.focus();
    }
  };
  
  return (
    <div className="flex gap-2 md:gap-3 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el!)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            'w-11 h-12 md:w-14 md:h-14 text-center text-lg font-semibold rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px] min-w-[44px]',
            error
              ? 'border-danger bg-danger-light'
              : 'border-border bg-surface hover:border-primary/50 focus:border-primary',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  );
};