import { useState, useEffect } from 'react';
import { Calendar, Clock, Snowflake, Sun, Leaf, Flower2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SeasonalClockProps {
  className?: string;
}

const SeasonalClock = ({ className }: SeasonalClockProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const getSeason = () => {
    const month = currentTime.getMonth();
    if (month >= 2 && month <= 4) return { name: 'Spring', icon: Flower2, colors: 'from-pink-500/20 to-green-500/20' };
    if (month >= 5 && month <= 7) return { name: 'Summer', icon: Sun, colors: 'from-yellow-500/20 to-orange-500/20' };
    if (month >= 8 && month <= 10) return { name: 'Autumn', icon: Leaf, colors: 'from-orange-500/20 to-red-500/20' };
    return { name: 'Winter', icon: Snowflake, colors: 'from-blue-500/20 to-cyan-500/20' };
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysInMonth = () => {
    const year = currentTime.getFullYear();
    const month = currentTime.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    const year = currentTime.getFullYear();
    const month = currentTime.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const season = getSeason();
  const SeasonIcon = season.icon;
  const daysInMonth = getDaysInMonth();
  const firstDay = getFirstDayOfMonth();
  const today = currentTime.getDate();
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <Card className={cn(
      `bg-gradient-to-br ${season.colors} border-primary/20 backdrop-blur-sm`,
      className
    )}>
      <CardContent className="p-4 space-y-4">
        {/* Season Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SeasonIcon className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">{season.name}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <Clock className="h-4 w-4" />
          </div>
        </div>

        {/* Time Display */}
        <div className="text-center space-y-1">
          <div className="text-3xl font-bold font-mono tracking-wider text-foreground">
            {formatTime()}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate()}
          </div>
        </div>

        {/* Mini Calendar */}
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1 text-center">
            {dayNames.map((day) => (
              <div key={day} className="text-xs text-muted-foreground font-medium">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty cells for days before the first day of the month */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="text-xs p-1" />
            ))}
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today;
              return (
                <div 
                  key={day} 
                  className={cn(
                    "text-xs p-1 rounded transition-colors",
                    isToday 
                      ? "bg-primary text-primary-foreground font-bold" 
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeasonalClock;