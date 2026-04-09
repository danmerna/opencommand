import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import MissionControl from "./pages/MissionControl";
import IntentEngine from "./pages/IntentEngine";
// Marketplace hidden — will be re-added later
// import Marketplace from "./pages/Marketplace";
// import CreatorProgram from "./pages/CreatorProgram";
import Blueprints from "./pages/Blueprints";
// import BlueprintDashboard from "./pages/BlueprintDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
// import CompatibilityChecker from "./pages/CompatibilityChecker";
import ReceiptViewer from "./pages/ReceiptViewer";
import AppLayout from "./components/AppLayout";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import AgentOnboarding from "./pages/AgentOnboarding";
import AgentDetail from "./pages/AgentDetail";
import Creators from "./pages/Creators";
import ProOnboarding from "./pages/ProOnboarding";
import Briefings from "./pages/Briefings";
import ExecutiveBoard from "./pages/ExecutiveBoard";
import ExecutionDashboard from "./pages/ExecutionDashboard";
import Analytics from "./pages/Analytics";
import FeedbackAdmin from "./pages/FeedbackAdmin";
import Settings from "./pages/Settings";
import AdminUsers from "./pages/AdminUsers";
import Waitlist from "./pages/Waitlist";
import AuthRelay from "./pages/AuthRelay";
import { OnboardingSigma } from "./pages/OnboardingSigma";
import { SigmaImportModal } from "./components/SigmaImportModal";
import { SigmaBadge } from "./components/SigmaBadge";
import { usePageTracking } from "./hooks/usePageTracking";
import { LeadResponsePage } from "./pages/LeadResponsePage";
import { SigmaChatUI } from "./components/SigmaChatUI";
import { LeadScoringDashboard } from "./pages/LeadScoringDashboard";
import { ROIAttribution } from "./pages/ROIAttribution";
import GoalsDashboard from "./pages/GoalsDashboard";

function Router() {
  usePageTracking();
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth/relay" component={AuthRelay} />
      <Route path="/waitlist" component={Waitlist} />
      <Route path="/onboarding/sigma">
        <AppLayout><OnboardingSigma /></AppLayout>
      </Route>
      <Route path="/mission-control">
        <AppLayout><MissionControl /></AppLayout>
      </Route>
      <Route path="/intent-engine">
        <AppLayout><IntentEngine /></AppLayout>
      </Route>
      {/* AI CEO redirects to Executive Board (ARCH is there now) */}
      <Route path="/ai-ceo">
        <Redirect to="/executive-board?exec=ceo" />
      </Route>
      <Route path="/executive-board">
        <AppLayout><ExecutiveBoard /></AppLayout>
      </Route>
      <Route path="/blueprints">
        <AppLayout><Blueprints /></AppLayout>
      </Route>
      {/* Blueprint Dashboard hidden — will be re-added later */}

      {/* Settings page — consolidates Governance, Integrations, Context History, Payments, Pricing, What's New */}
      <Route path="/settings">
        <AppLayout><Settings /></AppLayout>
      </Route>

      {/* Legacy deep-link redirects → Settings tabs */}
      <Route path="/governance">
        <Redirect to="/settings?tab=governance" />
      </Route>
      <Route path="/integration-hub">
        <Redirect to="/settings?tab=connections" />
      </Route>
      <Route path="/context-history">
        <Redirect to="/settings?tab=history" />
      </Route>
      <Route path="/payments">
        <Redirect to="/settings?tab=account" />
      </Route>
      <Route path="/pricing">
        <Redirect to="/settings?tab=account" />
      </Route>
      <Route path="/whats-new">
        <Redirect to="/settings?tab=about" />
      </Route>

      {/* Compatibility hidden — will be re-added later */}
      <Route path="/creators" component={Creators} />
      {/* Marketplace & Creator Program hidden — will be re-added later */}
      <Route path="/projects">
        <AppLayout><Projects /></AppLayout>
      </Route>
      <Route path="/projects/:id">
        <AppLayout><ProjectDetail /></AppLayout>
      </Route>
      <Route path="/agents/:id">
        <AppLayout><AgentDetail /></AppLayout>
      </Route>
      <Route path="/execution">
        <AppLayout><ExecutionDashboard /></AppLayout>
      </Route>
      <Route path="/briefings" component={Briefings} />
      <Route path="/analytics">
        <AppLayout><Analytics /></AppLayout>
      </Route>
      <Route path="/lead-response">
        <AppLayout><LeadResponsePage /></AppLayout>
      </Route>
      <Route path="/sigma-chat">
        <AppLayout><SigmaChatUI /></AppLayout>
      </Route>
      <Route path="/lead-scoring">
        <AppLayout><LeadScoringDashboard /></AppLayout>
      </Route>
      <Route path="/roi-attribution">
        <AppLayout><ROIAttribution /></AppLayout>
      </Route>
      <Route path="/goals">
        <AppLayout><GoalsDashboard /></AppLayout>
      </Route>
      <Route path="/feedback-admin">
        <AppLayout><FeedbackAdmin /></AppLayout>
      </Route>
      <Route path="/admin/users" component={AdminUsers} />
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
