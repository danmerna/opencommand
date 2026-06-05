import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2,
  Shield, Layers, Plug, Zap, RefreshCw,
} from "lucide-react";

type CompatResult = {
  blueprintId: number;
  blueprintName: string;
  overallScore: number;
  requiredCategories: string[];
  connectedCategories: string[];
  missingCategories: string[];
  partialCategories: string[];
  canDeploy: boolean;
  recommendations: string[];
};

export default function CompatibilityChecker() {
  const { isAuthenticated } = useAuth();
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<number | null>(null);
  const [result, setResult] = useState<CompatResult | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  const blueprintsQ = trpc.blueprints.list.useQuery(undefined, { enabled: isAuthenticated });
  const connectionsQ = trpc.hub.connections.useQuery(undefined, { enabled: isAuthenticated });
  const categoriesQ = trpc.hub.categories.useQuery();

  const blueprints = blueprintsQ.data ?? [];
  const connections = connectionsQ.data ?? [];
  const categories = categoriesQ.data ?? [];

  const connectedCatNames = useMemo(() => {
    const connCatIds = new Set(connections.filter(c => c.status === "connected").map(c => c.categoryId));
    return categories.filter(c => connCatIds.has(c.id)).map(c => c.name);
  }, [connections, categories]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        <Shield size={32} className="text-muted-foreground opacity-50" />
        <h1 className="text-2xl font-light text-foreground">Compatibility Checker</h1>
        <p className="text-muted-foreground text-sm">Verify your tool stack meets blueprint requirements.</p>
        <a href={getLoginUrl()}><Button>Sign In</Button></a>
      </div>
    );
  }

  const runCheck = (blueprintId: number) => {
    setSelectedBlueprintId(blueprintId);
    setCheckLoading(true);
    const bp = blueprints.find(b => b.id === blueprintId);
    if (!bp) { setCheckLoading(false); return; }
    const requiredCats = (bp.category ? [bp.category] : []).concat(["CRM", "Analytics", "Communication"]);
    const connected = connectedCatNames;
    const missing = requiredCats.filter(r => !connected.some(c => c.toLowerCase().includes(r.toLowerCase())));
    const matched = requiredCats.filter(r => connected.some(c => c.toLowerCase().includes(r.toLowerCase())));
    const score = requiredCats.length > 0 ? Math.round((matched.length / requiredCats.length) * 100) : 100;
    setTimeout(() => {
      setResult({
        blueprintId,
        blueprintName: bp.name,
        overallScore: score,
        requiredCategories: requiredCats,
        connectedCategories: matched,
        missingCategories: missing,
        partialCategories: [],
        canDeploy: score >= 60,
        recommendations: missing.map(m => `Connect a ${m} tool from the Integration Hub to unlock full functionality`),
      });
      setCheckLoading(false);
    }, 800);
  };

  const scoreColor = (score: number) => score >= 80 ? "text-accent" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">OpenCommand</p>
        <h1 className="text-4xl font-light text-foreground tracking-tight">Compatibility Checker</h1>
        <p className="text-muted-foreground text-sm mt-2">Verify your connected tool stack against blueprint requirements before deployment.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Blueprint Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground tracking-widest uppercase">Select Blueprint</span>
            <span className="text-xs text-muted-foreground">{blueprints.length} available</span>
          </div>

          {blueprints.length === 0 ? (
            <div className="card-minimal p-8 text-center">
              <Layers size={24} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No blueprints found. Create one in the Blueprint Builder.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {blueprints.map(bp => (
                <div
                  key={bp.id}
                  className={`card-minimal p-3 cursor-pointer transition-colors hover:border-foreground/20 ${selectedBlueprintId === bp.id ? "border-foreground/40" : ""}`}
                  onClick={() => runCheck(bp.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground truncate">{bp.name}</span>
                    <span className="text-[10px] text-muted-foreground border border-border px-1.5 rounded">{bp.category}</span>
                  </div>
                  <p className="text-muted-foreground text-xs truncate">{bp.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>{bp.totalDeployments ?? 0} deployments</span>
                    <span>v{bp.version}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Your Connected Tools */}
          <div className="card-minimal p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Plug size={12} /> <span className="tracking-widest uppercase">Your Tool Stack</span>
            </div>
            {connectedCatNames.length === 0 ? (
              <p className="text-muted-foreground text-xs">No tools connected. Visit the Integration Hub.</p>
            ) : (
              <div className="space-y-1">
                {connectedCatNames.map(name => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={10} className="text-accent" />
                    <span className="text-foreground font-mono">{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2">
          {checkLoading ? (
            <div className="card-minimal p-16 text-center">
              <Loader2 size={24} className="text-foreground mx-auto mb-4 animate-spin" />
              <p className="text-foreground text-sm mb-1">Analyzing Compatibility</p>
              <p className="text-muted-foreground text-xs">Checking your tool stack against blueprint requirements...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Score Card */}
              <div className="card-minimal p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-light text-foreground">{result.blueprintName}</h3>
                    <p className="text-muted-foreground text-sm mt-1">Compatibility Analysis</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-5xl font-light ${scoreColor(result.overallScore)}`}>{result.overallScore}%</div>
                    <div className="mt-1">
                      {result.canDeploy ? (
                        <span className="text-xs text-accent flex items-center gap-1 justify-end"><CheckCircle2 size={10} /> Deploy Ready</span>
                      ) : (
                        <span className="text-xs text-red-400 flex items-center gap-1 justify-end"><XCircle size={10} /> Not Ready</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="card-minimal p-4 border-accent/20">
                  <div className="flex items-center gap-1.5 text-xs text-accent mb-3">
                    <CheckCircle2 size={10} /> Connected ({result.connectedCategories.length})
                  </div>
                  {result.connectedCategories.length === 0 ? (
                    <p className="text-muted-foreground text-xs">None</p>
                  ) : (
                    <div className="space-y-1">
                      {result.connectedCategories.map(cat => <div key={cat} className="text-xs text-accent font-mono">{cat}</div>)}
                    </div>
                  )}
                </div>

                <div className="card-minimal p-4 border-red-500/20">
                  <div className="flex items-center gap-1.5 text-xs text-red-400 mb-3">
                    <XCircle size={10} /> Missing ({result.missingCategories.length})
                  </div>
                  {result.missingCategories.length === 0 ? (
                    <p className="text-muted-foreground text-xs">None — all covered</p>
                  ) : (
                    <div className="space-y-1">
                      {result.missingCategories.map(cat => <div key={cat} className="text-xs text-red-400 font-mono">{cat}</div>)}
                    </div>
                  )}
                </div>

                <div className="card-minimal p-4 border-amber-500/20">
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-3">
                    <AlertTriangle size={10} /> Partial ({result.partialCategories.length})
                  </div>
                  {result.partialCategories.length === 0 ? (
                    <p className="text-muted-foreground text-xs">None</p>
                  ) : (
                    <div className="space-y-1">
                      {result.partialCategories.map(cat => <div key={cat} className="text-xs text-amber-400 font-mono">{cat}</div>)}
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="card-minimal p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Zap size={12} /> <span className="tracking-widest uppercase">Recommendations</span>
                  </div>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ArrowRight size={12} className="mt-0.5 shrink-0 text-foreground" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {result.canDeploy && (
                  <Button onClick={() => toast.success("Redirecting to deploy flow...")} className="gap-2">
                    <Zap size={14} /> Deploy Blueprint
                  </Button>
                )}
                <Button variant="outline" onClick={() => runCheck(result.blueprintId)} className="gap-2">
                  <RefreshCw size={14} /> Re-Check
                </Button>
                {result.missingCategories.length > 0 && (
                  <Button variant="outline" onClick={() => window.location.href = "/integrations"} className="gap-2">
                    <Plug size={14} /> Connect Missing Tools
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="card-minimal p-16 text-center">
              <Shield size={28} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-foreground text-sm mb-1">Select a Blueprint</p>
              <p className="text-muted-foreground text-xs max-w-md mx-auto">Choose a blueprint from the left panel to check if your connected tool stack meets its requirements.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
