import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { AudioLines, Command, Mic, MicOff, RotateCcw, Square, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { COMMANDS, matchCommand, type CommandDefinition } from "../domain/commands";
import type { CommandIntent } from "../domain/types";
import { scenarioReadout } from "../domain/calc";
import { selectActivePlan } from "../domain/selectors";
import { SCENARIO, fmtPct } from "../fixtures/scenario";
import { useAnnounce } from "../hooks/useAnnouncer";
import { useDemoStore } from "../hooks/useDemoStore";
import { useHoldToConfirm } from "../hooks/useHoldToConfirm";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useSpeech } from "../hooks/useSpeech";

/* ------------------------- UI signal bus (voice → canvas) ------------------------- */

type UiSignal = { kind: "compare" | "summarize"; nonce: number } | null;

const UiSignalContext = createContext<{
  signal: UiSignal;
  send: (kind: "compare" | "summarize") => void;
}>({ signal: null, send: () => {} });

export function UiSignalProvider({ children }: { children: ReactNode }) {
  const [signal, setSignal] = useState<UiSignal>(null);
  const send = useCallback(
    (kind: "compare" | "summarize") => setSignal(prev => ({ kind, nonce: (prev?.nonce ?? 0) + 1 })),
    [],
  );
  return <UiSignalContext.Provider value={{ signal, send }}>{children}</UiSignalContext.Provider>;
}

export function useUiSignal() {
  return useContext(UiSignalContext);
}

/* ----------------------------- command execution ----------------------------- */

/**
 * Every modality — voice, command menu, keyboard, click — funnels through
 * this single executor of typed intents. Voice can open and reveal;
 * it can never confirm execution.
 */
export function useCommandExecutor(): (intent: CommandIntent) => string {
  const [, navigate] = useLocation();
  const { state, dispatch } = useDemoStore();
  const { send } = useUiSignal();

  return useCallback(
    (intent: CommandIntent): string => {
      switch (intent.type) {
        case "navigate":
          navigate(`/demo/${intent.primary}/${intent.sub}`);
          return "Opened.";
        case "persona-lens":
          dispatch({ type: "advisor/ensure-persona", personaId: intent.personaId });
          navigate("/demo/sigma/advisor");
          return "Lens activated in Advisor.";
        case "board-synthesis":
        case "show-disagreement":
          dispatch({ type: "advisor/open" });
          dispatch({ type: "advisor/board-synthesis" });
          dispatch({ type: "advisor/emphasize-conflict", on: true });
          navigate("/demo/sigma/advisor");
          return "Board Synthesis with the conflict layer.";
        case "compare-options":
          send("compare");
          return "Comparison revealed.";
        case "summarize":
          send("summarize");
          return "Summary shown.";
        case "act-in-do":
          dispatch({ type: "do/open" });
          navigate("/demo/sigma/do");
          return "Do opened with current context — execution still requires review.";
        case "open-preflight": {
          const plan = selectActivePlan(state);
          if (!plan) dispatch({ type: "do/open" });
          dispatch({ type: "do/open-preflight" });
          navigate("/demo/sigma/do");
          return "Preflight open — confirmation requires the hold control.";
        }
      }
    },
    [navigate, dispatch, state, send],
  );
}

/* ------------------------------- command menu ------------------------------- */

export function CommandMenuButton() {
  const [open, setOpen] = useState(false);
  const execute = useCommandExecutor();
  const announce = useAnnounce();

  const runCommand = (cmd: CommandDefinition) => {
    setOpen(false);
    const result = execute(cmd.intent);
    announce(`${cmd.phrase}. ${result}`);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Command aria-hidden />
        <span className="hidden sm:inline">Commands</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Command menu</DialogTitle>
            <DialogDescription>
              Every voice command has this visible equivalent. Nothing here confirms execution.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-1">
            {COMMANDS.map(cmd => (
              <li key={cmd.phrase}>
                <button
                  type="button"
                  onClick={() => runCommand(cmd)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-md border border-transparent px-3 py-2 text-left hover:border-border hover:bg-secondary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="text-sm text-foreground">“{cmd.phrase}”</span>
                  <span className="text-xs text-muted-foreground">{cmd.effect}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -------------------------------- voice control -------------------------------- */

const VOICE_CONSENT_KEY = "oc-demo-voice-consent";

export function VoiceControl() {
  const execute = useCommandExecutor();
  const announce = useAnnounce();
  const [consentOpen, setConsentOpen] = useState(false);
  const [lastCaption, setLastCaption] = useState<string | null>(null);

  const onUtterance = useCallback(
    (text: string): boolean => {
      const cmd = matchCommand(text);
      if (!cmd) {
        setLastCaption(`Heard “${text}” — no matching command. Try the Command menu.`);
        announce("No matching command. The Command menu lists every available phrase.");
        return false;
      }
      const result = execute(cmd.intent);
      setLastCaption(`“${cmd.phrase}” — ${result}`);
      announce(`${cmd.phrase}. ${result}`);
      return true;
    },
    [execute, announce],
  );

  const speech = useSpeech(onUtterance);

  const beginListening = () => {
    announce("Listening for a command.");
    setLastCaption(null);
    speech.start();
  };

  const onMicClick = () => {
    if (!speech.supported) return;
    if (speech.status === "listening" || speech.status === "requesting-permission") {
      speech.stop();
      return;
    }
    if (sessionStorage.getItem(VOICE_CONSENT_KEY) !== "yes") {
      setConsentOpen(true);
      return;
    }
    beginListening();
  };

  const acceptConsent = () => {
    sessionStorage.setItem(VOICE_CONSENT_KEY, "yes");
    setConsentOpen(false);
    beginListening();
  };

  /* Auto-clear transient captions/status after a beat. */
  useEffect(() => {
    if (speech.status === "recognized" || speech.status === "no-match" || speech.status === "error") {
      const t = setTimeout(() => speech.reset(), 6000);
      return () => clearTimeout(t);
    }
  }, [speech.status, speech]);

  if (!speech.supported) {
    return (
      <span
        className="hidden items-center gap-1.5 text-[11px] text-muted-foreground md:inline-flex"
        title="This browser does not support speech recognition. The Command menu provides the same commands."
      >
        <MicOff size={14} aria-hidden />
        Voice unavailable
      </span>
    );
  }

  const listening = speech.status === "listening" || speech.status === "requesting-permission";

  return (
    <>
      <Button
        variant={listening ? "default" : "outline"}
        size="sm"
        onClick={onMicClick}
        aria-pressed={listening}
        aria-label={listening ? "Stop listening" : "Push to talk — speak one command"}
      >
        {listening ? <AudioLines aria-hidden /> : <Mic aria-hidden />}
        <span className="hidden sm:inline">{listening ? "Listening…" : "Push to talk"}</span>
      </Button>

      {(lastCaption || listening || speech.status === "error") && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-16 z-40 flex justify-center px-4"
          aria-hidden={listening && !lastCaption}
        >
          <p className="max-w-lg rounded-md border border-border bg-popover px-3 py-1.5 text-center text-xs text-foreground">
            {listening
              ? "Listening… say a command such as “Show me where they disagree.”"
              : speech.status === "error"
                ? `Microphone error (${speech.errorDetail ?? "unknown"}). Voice is optional — use the Command menu instead.`
                : lastCaption}
          </p>
        </div>
      )}

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice commands are optional</DialogTitle>
            <DialogDescription>
              Push-to-talk listens for one short command at a time — it never listens in the
              background. Your browser or platform may process audio remotely to recognize
              speech. Nothing you say is stored beyond this browser session, and every voice
              command has a visible equivalent in the Command menu.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConsentOpen(false)}>
              Not now
            </Button>
            <Button onClick={acceptConsent}>Enable push-to-talk</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* --------------------------------- undo toast --------------------------------- */

const UNDO_SECONDS = 5;

export function UndoToast() {
  const { state, dispatch } = useDemoStore();
  const announce = useAnnounce();
  const [secondsLeft, setSecondsLeft] = useState(UNDO_SECONDS);
  const undo = state.pendingUndo;
  const isExecution = undo?.kind === "execution-confirm";
  const announced = useRef<string | null>(null);

  useEffect(() => {
    if (!undo) return;
    setSecondsLeft(UNDO_SECONDS);
    if (announced.current !== undo.label) {
      announced.current = undo.label;
      announce(`${undo.label}. Undo available for ${UNDO_SECONDS} seconds.`);
    }
    const interval = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    /* Execution-confirm commits are driven by useWorkflowRunner; triage
       undos commit here when the window elapses. */
    const timer = isExecution
      ? null
      : setTimeout(() => dispatch({ type: "undo/commit" }), UNDO_SECONDS * 1000);
    return () => {
      clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, [undo, isExecution, dispatch, announce]);

  if (!undo) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-popover px-4 py-2.5">
        <p className="text-sm text-foreground">
          {undo.label}
          {isExecution ? " — workflow starts" : ""}{" "}
          <span className="font-mono text-muted-foreground">in {secondsLeft}s</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            dispatch({ type: "undo/revert" });
            announce("Undone.");
          }}
        >
          <Undo2 aria-hidden />
          Undo
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ hold to confirm ------------------------------ */

export function HoldToConfirmButton({
  label,
  onConfirm,
  disabled,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const announce = useAnnounce();
  const reducedMotion = useReducedMotion();
  const { hold, handlers } = useHoldToConfirm(
    () => {
      announce("Confirmed. Undo is available for five seconds before the workflow starts.");
      onConfirm();
    },
    () => announce("Hold released early — nothing was confirmed."),
  );

  return (
    <button
      type="button"
      disabled={disabled}
      {...(disabled ? {} : handlers)}
      className={cn(
        "relative inline-flex h-11 min-w-56 select-none items-center justify-center gap-2 overflow-hidden rounded-md border border-accent/60 px-5 text-sm font-medium text-foreground",
        "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-accent",
        "touch-none",
      )}
      aria-label={`${label}. Press and hold, or hold Space or Enter, for one and a half seconds to confirm. Releasing early cancels.`}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 bg-accent/25", !reducedMotion && "transition-[width] duration-75")}
        style={{ width: `${hold.progress * 100}%` }}
      />
      <Square size={13} aria-hidden className={cn(hold.holding ? "text-accent" : "text-muted-foreground")} />
      <span className="relative">
        {hold.holding ? "Keep holding…" : label}
      </span>
    </button>
  );
}

/* --------------------------------- scrub slider --------------------------------- */

export function ScrubSlider({
  value,
  defaultValue,
  onChange,
  onReset,
  idPrefix,
}: {
  value: number;
  defaultValue: number;
  onChange: (pct: number) => void;
  onReset: () => void;
  idPrefix: string;
}) {
  const readout = scenarioReadout(value);
  const modified = value !== defaultValue;
  const id = `${idPrefix}-adjustment`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-foreground">
          List adjustment{" "}
          <span className="text-muted-foreground">
            (original <MonoInline>{fmtPct(defaultValue)}</MonoInline>)
          </span>
        </label>
        <div className="flex items-center gap-2">
          <output htmlFor={id} className="font-mono text-sm text-accent">
            {fmtPct(value)}
          </output>
          <Button size="sm" variant="ghost" onClick={onReset} disabled={!modified} aria-label="Reset adjustment to the recommended value">
            <RotateCcw aria-hidden />
            Reset
          </Button>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={-8}
        max={0}
        step={0.1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-ew-resize appearance-none rounded-full bg-muted accent-[oklch(0.72_0.12_250)]"
        aria-valuetext={`${fmtPct(value)} list adjustment, projected ${readout.unitsMoved} units moved`}
      />
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>−8% floor breach</span>
        <span>{fmtPct(SCENARIO.proposal.recommendedAdjustmentPct)} reconciled</span>
        <span>0% hold at list</span>
      </div>
      {readout.breachesFloor && (
        <p className="rounded border border-destructive/50 bg-destructive/10 px-2 py-1 text-xs text-red-300">
          Breaches LEDGER's {fmtPct(SCENARIO.finance.marginFloorPct)} margin floor — unit margin goes
          negative after floor-plan and prep costs.
        </p>
      )}
    </div>
  );
}

function MonoInline({ children }: { children: ReactNode }) {
  return <span className="font-mono">{children}</span>;
}
