import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MobileUIToggle, { MobileUIProvider } from "./components/MobileUIToggle";
import ClippyButton from "./components/ClippyButton";
import GlobalReadAloud from "./components/GlobalReadAloud";
import { useCmdModeSettings } from "./hooks/useCmdModeSettings";
import { useGamepadBridge } from "./hooks/useGamepad";

// Lazy load pages to reduce initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Plaza = lazy(() => import("./pages/Plaza"));
const Games = lazy(() => import("./pages/Games"));
const Benchmark = lazy(() => import("./pages/Benchmark"));

const queryClient = new QueryClient();

// Simple loading fallback that matches the app skeleton
const PageLoader = () => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: 'hsl(var(--background))'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        width: '2rem', 
        height: '2rem', 
        border: '2px solid hsl(var(--muted))',
        borderTopColor: 'hsl(var(--primary))',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto'
      }} />
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const App = () => {
  useCmdModeSettings(); // applies CSS vars for scanline + caret
  useGamepadBridge(); // maps game controllers → keyboard events app-wide
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <MobileUIProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/plaza" element={<Plaza />} />
              <Route path="/games" element={<Games />} />
              <Route path="/benchmark" element={<Benchmark />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <MobileUIToggle />
        <ClippyButton />
        <GlobalReadAloud />
      </MobileUIProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
