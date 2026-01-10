import { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface QuickSettingsProps {
  className?: string;
}

const QuickSettings = ({ className }: QuickSettingsProps) => {
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState([75]);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    // Check initial dark mode state
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    if (newValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          <Bell className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="h-auto">
        <SheetHeader>
          <SheetTitle>Quick Settings</SheetTitle>
        </SheetHeader>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Card className="cursor-pointer hover:bg-muted transition-colors" onClick={toggleDarkMode}>
            <CardContent className="flex flex-col items-center justify-center p-4">
              {darkMode ? <Moon className="h-6 w-6 mb-2" /> : <Sun className="h-6 w-6 mb-2" />}
              <span className="text-sm">{darkMode ? 'Dark' : 'Light'}</span>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-muted transition-colors" onClick={() => setNotifications(!notifications)}>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <Bell className={`h-6 w-6 mb-2 ${!notifications ? 'opacity-50' : ''}`} />
              <span className="text-sm">{notifications ? 'On' : 'Off'}</span>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <Label>Sound</Label>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
          
          {soundEnabled && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Volume</Label>
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickSettings;