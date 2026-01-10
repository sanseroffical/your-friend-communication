import { useState, useEffect } from 'react';
import { Battery, Wifi, Signal, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileUI } from './MobileUIToggle';

interface StatusBarProps {
  className?: string;
}

const StatusBar = ({ className }: StatusBarProps) => {
  const [time, setTime] = useState(new Date());
  const { isMobileUI } = useMobileUI();
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isMobileUI) return null;

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-1 bg-background/95 border-b text-xs font-medium",
      className
    )}>
      <div className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Signal className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <div className="flex items-center gap-1">
          <Battery className="h-3 w-3" />
          <span className="text-[10px]">100%</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;