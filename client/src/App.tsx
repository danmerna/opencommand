import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import MissionControl from "./pages/MissionControl";
import IntentEngine from "./pages/IntentEngine";
// Marketplace hidden — will be re-added later
// import Marketplace from "./pages/Marketplace";
// import CreatorProgram from "./pages/CreatorProgram";
import AICeo from "./pages/AICeo";
import Blueprints from "./pages/Blueprints";
import Governance from "./pages/Governance";
// import BlueprintDashboard from "./pages/BlueprintDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import IntegrationHub from "./pages/IntegrationHub";
// import CompatibilityChecker from "./pages/CompatibilityChecker";
import ContextHistory from "./pages/ContextHistory";
import PaymentHistory from "./pages/PaymentHistory";
import ReceiptViewer from "./pages/ReceiptViewer";
import AppLayout from "./components/AppLayout";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import AgentOnboarding from "./pages/AgentOnboarding";
import AgentDetail from "./pages/AgentDetail";
import Pricing from "./pages/Pricing";
import Creators from "./pages/Creators";
import ProOnboarding from "./pages/ProOnboarding";
import Briefings from "./pages/Briefings";
import Analytics from "./pages/Analytics";

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
      <Route path="/blueprints">
        <AppLayout><Blueprints /></AppLayout>
      </Route>
      {/* Blueprint Dashboard hidden — will be re-added later */}
      <Route path="/governance">
        <AppLayout><Governance /></AppLayout>
      </Route>
      <Route path="/integration-hub">
        <AppLayout><IntegrationHub /></AppLayout>
      </Route>
      {/* Compatibility hidden — will be re-added later */}
      <Route path="/context-history">
        <AppLayout><ContextHistory /></AppLayout>
      </Route>
      <Route path="/creators" component={Creators} />
      {/* Marketplace & Creator Program hidden — will be re-added later */}
      <Route path="/payments">
        <AppLayout><PaymentHistory /></AppLayout>
      </Route>
      <Route path="/pricing">
        <AppLayout><Pricing /></AppLayout>
      </Route>
      <Route path="/projects">
        <AppLayout><Projects /></AppLayout>
      </Route>
      <Route path="/projects/:id">
        <AppLayout><ProjectDetail /></AppLayout>
      </Route>
      <Route path="/agents/:id">
        <AppLayout><AgentDetail /></AppLayout>
      </Route>
      <Route path="/briefings" component={Briefings} />
      <Route path="/analytics">
        <AppLayout><Analytics /></AppLayout>
      </Route>
      <Route path="/onboarding/pro" component={ProOnboarding} />
      <Route path="/onboarding/:agentId">
        <AppLayout><AgentOnboarding /></AppLayout>
      </Route>
      <Route path="/receipt/:receiptNumber" component={ReceiptViewer} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />
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
