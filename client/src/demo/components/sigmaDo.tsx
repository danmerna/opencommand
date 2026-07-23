import { useLocation } from "wouter";
import { FileCheck, OctagonX, Play, ShieldCheck, Workflow as WorkflowIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { selectActivePlan, selectActiveUpdate, selectActiveWorkflow } from "../domain/selectors";
import { AGENT_BY_ID } from "../fixtures/agents";
import { SCENARIO, fmtPct } from "../fixtures/scenario";
import { useAnnounce } from "../hooks/useAnnouncer";
import { useDemoStore } from "../hooks/useDemoStore";
import { EmptyState, MonoValue, PanelCard, SectionLabel, SourceChip, StatusBadge } from "./bits";
import { HoldToConfirmButton, ScrubSlider } from "./interaction";
import { CanvasHeader } from "./sigmaShared";

const STATUS_LABELS: Record<string, string> = {
  draft: "draft — editable",
  reviewing: "reviewing",
  "awaiting-approval": "awaiting approval",
  confirmed: "confirmed",
  cancelled: "cancelled",
};

export function DoView() {
  const { state, dispatch } = useDemoStore();
  const [, navigate] = useLocation();
  const announce = useAnnounce();
  const plan = selectActivePlan(state);
  const update = selectActiveUpdate(state);
  const workflow = selectActiveWorkflow(state);
  const approval = plan ? state.approvals.find(a => a.planId === plan.id) : null;

  if (!plan || plan.status === "cancelled") {
    return (
      <section aria-labelledby="do-heading" className="flex flex-col gap-4">
        <h2 id="do-heading" className="sr-only">
          Do
        </h2>
        <EmptyState
          title="No plan on the canvas"
          hint="Do converts a recommendation, Think result, or Advisor synthesis into an inspectable, governed plan. Agents only ever run inside one."
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => dispatch({ type: "do/open" })}>
                <Play aria-hidden />
                Create plan from current context
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/demo/command-center/recommendations")}>
                Start from a recommendation
              </Button>
            </div>
          }
        />
      </section>
    );
  }

  const editable = plan.status === "draft" || plan.status === "reviewing";
  const preflightOpen = plan.status === "awaiting-approval" || plan.status === "confirmed";
  const executed = plan.status === "confirmed" && !plan.undoWindowOpen && workflow;

  return (
    <section aria-labelledby="do-heading" className="flex flex-col gap-4">
      <h2 id="do-heading" className="sr-only">
        Do — governed action
      </h2>

      <CanvasHeader
        mode="do"
        question={plan.goal}
        objectTitle={update?.title ?? null}
        dataScope={plan.requiredData}
        confidence={null}
        saveState={STATUS_LABELS[plan.status]}
        handoffs={
          <>
            {!preflightOpen && (
              <Button size="sm" onClick={() => { dispatch({ type: "do/open-preflight" }); announce("Preflight open. Review the boundaries, then confirm with the hold control."); }}>
                <ShieldCheck aria-hidden />
                Open preflight
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { dispatch({ type: "do/cancel" }); announce("Plan cancelled. Nothing was executed."); }} disabled={plan.status === "confirmed"}>
              <OctagonX aria-hidden />
              Cancel
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* Editable plan */}
        <PanelCard className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Plan {editable ? "— editable before preflight" : "— locked during review"}</SectionLabel>
            <StatusBadge tone={plan.status === "confirmed" ? "success" : "accent"}>{plan.status}</StatusBadge>
          </div>

          <div>
            <SectionLabel className="mb-1">Selected option</SectionLabel>
            <p className="text-xs text-secondary-foreground">{plan.selectedOption}</p>
          </div>

          {editable ? (
            <ScrubSlider
              idPrefix="do"
              value={plan.adjustmentPct}
              defaultValue={SCENARIO.proposal.recommendedAdjustmentPct}
              onChange={pct => dispatch({ type: "do/set-adjustment", adjustmentPct: pct })}
              onReset={() => dispatch({ type: "do/set-adjustment", adjustmentPct: SCENARIO.proposal.recommendedAdjustmentPct })}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Locked adjustment: <MonoValue className="text-accent">{fmtPct(plan.adjustmentPct)}</MonoValue>
            </p>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <SectionLabel>Agent team — bounded executors</SectionLabel>
            {(["agt-listing", "agt-photo", "agt-lead"] as const).map(id => {
              const agent = AGENT_BY_ID[id];
              const included = plan.agentTeamIds.includes(id);
              const optional = id === "agt-photo";
              return (
                <div key={id} className={cn("flex flex-col gap-1 rounded-md border p-2.5", included ? "border-border" : "border-border/50 opacity-60")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{agent.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{agent.throughput}</span>
                      {optional && editable ? (
                        <Button size="sm" variant="outline" onClick={() => dispatch({ type: "do/toggle-photo-agent" })}>
                          {included ? "Remove" : "Add back"}
                        </Button>
                      ) : (
                        <StatusBadge>{included ? "required" : "excluded"}</StatusBadge>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{agent.commandBoundary[0]}</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.dataScope.map(s => (
                      <SourceChip key={s} source={s} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border pt-3">
            <SectionLabel className="mb-1.5">Ordered steps</SectionLabel>
            <ol className="flex flex-col gap-1.5">
              {plan.steps.map((s, i) => (
                <li key={s.id} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                  <span className="flex flex-col">
                    <span className={cn("text-secondary-foreground", s.isCheckpoint && "text-amber-200")}>
                      {s.title}
                      {s.isCheckpoint && " ⏸"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{s.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </PanelCard>

        {/* Governance column */}
        <div className="flex flex-col gap-4">
          <PanelCard className="flex flex-col gap-3 p-4">
            <SectionLabel>Guardrails</SectionLabel>
            <ul className="list-inside list-disc text-xs text-secondary-foreground">
              {plan.guardrails.map(g => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <SectionLabel>Approvals required</SectionLabel>
            <ul className="list-inside list-disc text-xs text-secondary-foreground">
              {plan.approvals.map(a => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <SectionLabel>Illustrative tools</SectionLabel>
            <p className="text-xs text-muted-foreground">{plan.tools.join(" · ")}</p>
            <SectionLabel>Expected outcome</SectionLabel>
            <p className="text-xs text-secondary-foreground">{plan.expectedOutcome}</p>
            <SectionLabel>Exception behavior</SectionLabel>
            <p className="text-xs text-muted-foreground">{plan.exceptionBehavior}</p>
            <SectionLabel>Proof of Outcome</SectionLabel>
            <p className="text-xs text-muted-foreground">{plan.receiptDefinition}</p>
            {plan.blueprintId && (
              <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                Reuses blueprint{" "}
                <button type="button" className="underline hover:text-foreground" onClick={() => navigate("/demo/workspace/blueprints")}>
                  {state.blueprint.name} v{state.blueprint.version}
                </button>
              </p>
            )}
          </PanelCard>

          {/* Execution preflight */}
          {preflightOpen && approval && (
            <PanelCard className="flex flex-col gap-3 border-accent/50 p-4" role="region" aria-label="Execution preflight">
              <div className="flex items-center justify-between gap-2">
                <SectionLabel>Execution preflight</SectionLabel>
                <StatusBadge tone={approval.status === "approved" ? "success" : "warning"}>{approval.status}</StatusBadge>
              </div>
              <dl className="flex flex-col gap-1.5 text-[11px]">
                <PreflightRow label="Exact scope" value={approval.scope} />
                <PreflightRow label="Expected effect" value={approval.economicEffect} />
                <PreflightRow label="Command boundary" value={approval.commandBoundary} />
                <PreflightRow label="Why approval is required" value={approval.whyRequired} />
                <PreflightRow label="Reversibility" value={approval.reversibility} />
                <PreflightRow label="Exception handling" value={plan.exceptionBehavior} />
                <PreflightRow label="Receipt" value={plan.receiptDefinition} />
              </dl>
              <div className="flex flex-wrap items-center gap-1.5">
                <SectionLabel className="mr-1">Systems touched (simulated)</SectionLabel>
                {approval.affectedSystems.map(s => (
                  <SourceChip key={s} source={s} />
                ))}
              </div>

              {plan.status === "awaiting-approval" && (
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <HoldToConfirmButton
                    label={`Hold to approve ${fmtPct(plan.adjustmentPct)} reprice`}
                    onConfirm={() => dispatch({ type: "do/hold-confirmed" })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Press and hold for 1.5s — or hold Space/Enter with the control focused. Releasing
                    early cancels. Voice and shortcuts can open this review but can never confirm it.
                  </p>
                </div>
              )}

              {plan.status === "confirmed" && plan.undoWindowOpen && (
                <p className="rounded border border-emerald-400/40 bg-emerald-400/10 px-2 py-1.5 text-xs text-emerald-200">
                  Approved. The workflow starts when the undo window below closes.
                </p>
              )}

              {executed && (
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <p className="text-xs text-emerald-200">
                    <FileCheck size={13} aria-hidden className="mr-1 inline" />
                    Workflow created and running in Workspace.
                  </p>
                  <Button size="sm" onClick={() => navigate(`/demo/workspace/workflows?object=${workflow.id}`)}>
                    <WorkflowIcon aria-hidden />
                    Follow the workflow
                  </Button>
                </div>
              )}
            </PanelCard>
          )}
        </div>
      </div>
    </section>
  );
}

function PreflightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-secondary-foreground">{value}</dd>
    </div>
  );
}
