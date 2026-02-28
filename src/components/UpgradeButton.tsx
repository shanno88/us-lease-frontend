"use client";

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface UpgradeButtonProps {
  label?: string;
  className?: string;
}

const MARKETING_UPGRADE_URL = 'https://tutorbox.cc/upgrade';

export default function UpgradeButton({ 
  label = '升级到专业版',
  className = ''
}: UpgradeButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClick = () => {
    setIsRedirecting(true);
    window.location.href = MARKETING_UPGRADE_URL;
  };

  return (
    <button
      onClick={handleClick}
      disabled={isRedirecting}
      className={`w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${className}`}
    >
      {isRedirecting ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          跳转中...
        </>
      ) : (
        label
      )}
    </button>
  );
}
