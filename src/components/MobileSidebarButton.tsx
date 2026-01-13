import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

const MobileSidebarButton = () => {
  const { toggleSidebar, isMobile } = useSidebar();

  // Only show on mobile
  if (!isMobile) return null;

  return (
    <Button
      onClick={toggleSidebar}
      size="icon"
      variant="outline"
      className="fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-lg z-[60]"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
};

export default MobileSidebarButton;
