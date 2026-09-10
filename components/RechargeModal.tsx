'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, KeyRound, AlertCircle, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { redeemRechargeCode } from '@/lib/rechargeCodes';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRechargeSuccess: (amount: number) => void;
  currentBalance: number;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  onRechargeSuccess,
  currentBalance,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto focus first input when opened
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setDigits(['', '', '', '']);
      setErrorMsg(null);
      setSuccessMsg(null);
      inputRefs.current[0]?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // If pasted multiple digits
    if (clean.length > 1) {
      const chars = clean.slice(0, 4).split('');
      const newDigits = ['', '', '', ''];
      chars.forEach((ch, i) => {
        newDigits[i] = ch;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(3, chars.length);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const single = clean.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = single;
    setDigits(newDigits);
    setErrorMsg(null);

    // Auto advance to next input
    if (index < 3 && single) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const fullCode = digits.join('');
    if (fullCode.length !== 4) {
      setErrorMsg('Por favor, digite todos os 4 dígitos do código de recarga.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = redeemRechargeCode(fullCode);

    if (result.success && result.amount) {
      setSuccessMsg(result.message);
      onRechargeSuccess(result.amount);
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      setErrorMsg(result.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-blue-800/60 rounded-2xl shadow-[0_0_50px_rgba(14,165,233,0.3)] overflow-hidden">
        {/* Header decoration */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-sky-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7">
          {/* Icon Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Recarga de Saldo Virtual
              </h3>
              <p className="text-xs text-cyan-300/90 font-medium">
                Liberação de +R$ 500,00 em créditos
              </p>
            </div>
          </div>

          {/* Zero Balance Alert if applicable */}
          {currentBalance <= 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Seu saldo virtual está zerado. Digite o código de 4 dígitos fornecido pelo administrador para continuar jogando.
              </span>
            </div>
          )}

          <p className="text-xs text-slate-300 mb-5 leading-relaxed">
            Insira o código numérico de <strong>4 dígitos</strong> para creditar{' '}
            <span className="text-cyan-300 font-bold font-mono">+R$ 500,00</span> na sua conta.
          </p>

          {/* 4 Digits Input Field */}
          <div className="flex justify-center gap-3 sm:gap-4 my-5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={successMsg !== null}
                className={`w-14 h-16 sm:w-16 sm:h-18 text-center font-mono text-3xl font-black rounded-xl bg-slate-950 border-2 transition-all outline-none select-none ${
                  successMsg
                    ? 'border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : errorMsg
                    ? 'border-red-500/80 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : digit
                    ? 'border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-blue-950/40'
                    : 'border-blue-900/60 text-white focus:border-cyan-400 focus:bg-slate-900/80'
                }`}
              />
            ))}
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/40 flex items-start gap-2 text-red-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-2 text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || successMsg !== null || digits.join('').length !== 4}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition shadow-lg flex items-center justify-center gap-2 ${
              successMsg
                ? 'bg-emerald-600 text-white'
                : digits.join('').length === 4
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {successMsg ? 'Recarga Efetuada!' : 'Confirmar e Recarregar R$ 500,00'}
          </button>

          {/* Helper note */}
          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-400">
              Não possui um código de 4 dígitos?{' '}
              <span className="text-cyan-400 font-medium">
                Solicite ao administrador para receber o seu código de recarga.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
