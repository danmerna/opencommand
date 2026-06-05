import { useAuth } from "./_core/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import MissionControl from "./pages/MissionControl";
import IntentEngine from "./pages/IntentEngine";
import Blueprints from "./pages/Blueprints";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import ReceiptViewer from "./pages/ReceiptViewer";
import AppLayout from "./components/AppLayout";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import AgentOnboarding from "./pages/AgentOnboarding";
import AgentDetail from "./pages/AgentDetail";
import Creators from "./pages/Creators";
import Briefings from "./pages/Briefings";
import ExecutionDashboard from "./pages/ExecutionDashboard";
import Analytics from "./pages/Analytics";
import FeedbackAdmin from "./pages/FeedbackAdmin";
import Settings from "./pages/Settings";
import AdminUsers from "./pages/AdminUsers";
import AdminSurveyResponses from "./pages/AdminSurveyResponses";
import Waitlist from "./pages/Waitlist";
import AuthRelay from "./pages/AuthRelay";
import ProOnboarding from "./pages/ProOnboarding";
import { usePageTracking } from "./hooks/usePageTracking";
import { LeadResponsePage } from "./pages/LeadResponsePage";
import { LeadScoringDashboard } from "./pages/LeadScoringDashboard";
import { ROIAttribution } from "./pages/ROIAttribution";
import GoalsDashboard from "./pages/GoalsDashboard";
import BlueprintChat from "./pages/BlueprintChat";
import BlueprintBuilder from "./pages/BlueprintBuilder";
import ModelPerformance from "./pages/ModelPerformance";
import Dashboard from "./pages/Dashboard";

function Router() {
  usePageTracking();
  const { isAuthenticated } = useAuth();
  return (
    <Switch>
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Home />}
      </Route>
      <Route path="/dashboard">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/auth/relay" component={AuthRelay} />
      <Route path="/waitlist" component={Waitlist} />
      <Route path="/mission-control">
        <AppLayout><MissionControl /></AppLayout>
      </Route>
      <Route path="/intent-engine">
        <AppLayout><IntentEngine /></AppLayout>
      </Route>
      <Route path="/blueprints">
        <AppLayout><Blueprints /></AppLayout>
      </Route>
      <Route path="/blueprints/chat" component={BlueprintChat} />
      <Route path="/blueprints/:id/builder" component={BlueprintBuilder} />
      <Route path="/model-performance">
        <AppLayout><ModelPerformance /></AppLayout>
      </Route>

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

      <Route path="/creators" component={Creators} />
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
      <Route path="/admin/survey-responses" component={AdminSurveyResponses} />
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
