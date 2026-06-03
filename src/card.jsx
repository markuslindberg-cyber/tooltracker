import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, ZapOff } from 'lucide-react';

export default function TorchButton({ torchOn, torchSupported, toggleTorch }) {
  if (!torchSupported) return null;

  return (
    <Button
      onClick={toggleTorch}
      variant={torchOn ? 'default' : 'outline'}
      size="sm"
      className={torchOn ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
      title={torchOn ? 'Stäng av blixt' : 'Slå på blixt'}
    >
      {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
    </Button>
  );
}