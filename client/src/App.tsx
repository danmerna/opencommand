import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import MissionControl from "./pages/MissionControl";
import IntentEngine from "./pages/IntentEngine";
import Marketplace from "./pages/Marketplace";
import CreatorProgram from "./pages/CreatorProgram";
import AICeo from "./pages/AICeo";
import AppLayout from "./components/AppLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/mission-control">
        <AppLayout><MissionControl /></AppLayout>
      </Route>
      <Route path="/intent-engine">
        <AppLayout><IntentEngine /></AppLayout>
      </Route>
      <Route path="/ai-ceo">
        <AppLayout><AICeo /></AppLayout>
      </Route>
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/creator-program" component={CreatorProgram} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
