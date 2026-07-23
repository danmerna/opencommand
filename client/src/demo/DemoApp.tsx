import { Redirect, Route, Switch, useParams } from "wouter";
import {
  COMMAND_CENTER_SUBTABS,
  SIGMA_SUBTABS,
  WORKSPACE_SUBTABS,
  type PrimaryTab,
} from "./domain/types";
import { AnnouncerProvider } from "./hooks/useAnnouncer";
import { DemoStoreProvider } from "./hooks/useDemoStore";
import { useWorkflowRunner } from "./hooks/useWorkflowRunner";
import { DemoShell } from "./components/Shell";
import { UiSignalProvider } from "./components/interaction";
import { ApprovalsView, RecommendationsView, UpdatesView } from "./components/commandCenter";
import { ThinkView } from "./components/sigmaThink";
import { AdvisorView } from "./components/sigmaAdvisor";
import { DoView } from "./components/sigmaDo";
import { AgentsView, AuditLogView, BlueprintsView, WorkflowsView } from "./components/workspace";

const VALID: Record<PrimaryTab, readonly string[]> = {
  "command-center": COMMAND_CENTER_SUBTABS,
  sigma: SIGMA_SUBTABS,
  workspace: WORKSPACE_SUBTABS,
};

const DEFAULTS: Record<PrimaryTab, string> = {
  "command-center": "updates",
  sigma: "think",
  workspace: "blueprints",
};

function SubtabView({ primary, sub }: { primary: PrimaryTab; sub: string }) {
  switch (`${primary}/${sub}`) {
    case "command-center/updates":
      return <UpdatesView />;
    case "command-center/approvals":
      return <ApprovalsView />;
    case "command-center/recommendations":
      return <RecommendationsView />;
    case "sigma/think":
      return <ThinkView />;
    case "sigma/advisor":
      return <AdvisorView />;
    case "sigma/do":
      return <DoView />;
    case "workspace/blueprints":
      return <BlueprintsView />;
    case "workspace/workflows":
      return <WorkflowsView />;
    case "workspace/agents":
      return <AgentsView />;
    case "workspace/audit-log":
      return <AuditLogView />;
    default:
      return null;
  }
}

function DemoRoute() {
  const params = useParams<{ primary: string; sub?: string }>();
  const primary = params.primary as PrimaryTab;
  if (!(primary in VALID)) return <Redirect to="/demo/command-center/updates" replace />;
  const sub = params.sub ?? DEFAULTS[primary];
  if (!VALID[primary].includes(sub)) return <Redirect to={`/demo/${primary}/${DEFAULTS[primary]}`} replace />;
  return (
    <DemoShell primary={primary} sub={sub}>
      <SubtabView primary={primary} sub={sub} />
    </DemoShell>
  );
}

/** Ticks the deterministic simulation while any demo surface is mounted. */
function SimulationClock() {
  useWorkflowRunner();
  return null;
}

/**
 * The chatbot-free IntelligenceOS demo. Self-contained and client-only:
 * no auth, no backend calls, no external writes — deterministic fixtures.
 */
export default function DemoApp() {
  return (
    <DemoStoreProvider>
      <AnnouncerProvider>
        <UiSignalProvider>
          <SimulationClock />
          <Switch>
            <Route path="/demo/:primary/:sub" component={DemoRoute} />
            <Route path="/demo/:primary" component={DemoRoute} />
            <Route path="/demo">
              <Redirect to="/demo/command-center/updates" replace />
            </Route>
          </Switch>
        </UiSignalProvider>
      </AnnouncerProvider>
    </DemoStoreProvider>
  );
}
