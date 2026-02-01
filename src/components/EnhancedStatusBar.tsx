import { useEffect, useState } from 'react';
import { Moon, Sun, Volume2, VolumeX, Bell, BellOff, Wifi, WifiOff, Battery, Signal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface EnhancedStatusBarProps {
  showQuickSettings?: boolean;
  onToggleQuickSettings?: () => void;
}

const EnhancedStatusBar = ({ showQuickSettings, onToggleQuickSettings }: EnhancedStatusBarProps) => {
  const [time, setTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Battery API (if available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      });
    }

    // Online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getBatteryColor = () => {
    if (isCharging) return 'text-green-500';
    if (batteryLevel <= 20) return 'text-red-500';
    if (batteryLevel <= 50) return 'text-yellow-500';
    return 'text-foreground';
  };

  return (
    <div 
      className="bg-background/95 backdrop-blur-sm border-b border-border px-4 py-1.5 flex items-center justify-between text-xs cursor-pointer select-none"
      onClick={onToggleQuickSettings}
    >
      {/* Left side - Time & Date */}
      <div className="flex items-center gap-3">
        <span className="font-semibold">{formatTime(time)}</span>
        <span className="text-muted-foreground hidden sm:inline">{formatDate(time)}</span>
      </div>

      {/* Center - Notch area (decorative) */}
      <div className="hidden sm:flex items-center gap-1">
        <div className="w-20 h-5 bg-foreground/5 rounded-full" />
      </div>

      {/* Right side - Status indicators */}
      <div className="flex items-center gap-2">
        {/* Network status */}
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Signal className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-destructive" />
          )}
        </div>

        {/* Battery */}
        <div className={`flex items-center gap-1 ${getBatteryColor()}`}>
          <span className="font-medium">{batteryLevel}%</span>
          <div className="relative">
            <Battery className="w-4 h-4" />
            {isCharging && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px]">⚡</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedStatusBar;
