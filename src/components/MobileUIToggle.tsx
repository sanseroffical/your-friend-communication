import { useState, createContext, useContext, ReactNode } from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileUIContextType {
  isMobileUI: boolean;
  toggleMobileUI: () => void;
}

const MobileUIContext = createContext<MobileUIContextType>({
  isMobileUI: false,
  toggleMobileUI: () => {},
});

export const useMobileUI = () => useContext(MobileUIContext);

export const MobileUIProvider = ({ children }: { children: ReactNode }) => {
  const [isMobileUI, setIsMobileUI] = useState(false);

  const toggleMobileUI = () => setIsMobileUI(prev => !prev);

  return (
    <MobileUIContext.Provider value={{ isMobileUI, toggleMobileUI }}>
      <div className={cn(
        isMobileUI && "max-w-[430px] mx-auto h-screen overflow-hidden shadow-2xl border-x border-border"
      )}>
        {children}
      </div>
    </MobileUIContext.Provider>
  );
};

const MobileUIToggle = () => {
  const { isMobileUI, toggleMobileUI } = useMobileUI();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleMobileUI}
      className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-background border-primary/50"
      title={isMobileUI ? "Switch to Desktop View" : "Switch to Mobile View"}
    >
      {isMobileUI ? (
        <Monitor className="h-5 w-5" />
      ) : (
        <Smartphone className="h-5 w-5" />
      )}
    </Button>
  );
};

export default MobileUIToggle;