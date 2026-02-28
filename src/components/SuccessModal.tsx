'use client';

import React from 'react';
import { CheckCircle2, X, ArrowRight } from 'lucide-react';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  primaryButtonLabel: string;
  onPrimaryAction: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  onClose,
  title,
  message,
  primaryButtonLabel,
  onPrimaryAction,
}) => {
  if (!open) return null;

  const handlePrimaryClick = () => {
    onPrimaryAction();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            {title}
          </h3>
          
          <p className="text-slate-600 text-lg leading-relaxed mb-8">
            {message}
          </p>

          <button
            onClick={handlePrimaryClick}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
          >
            {primaryButtonLabel}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
