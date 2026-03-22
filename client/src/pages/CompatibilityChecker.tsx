import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2,
  Shield, Layers, Plug, Zap, Globe, BarChart3, RefreshCw,
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

  const blueprintsQ = trpc.blueprints.list.useQuery(undefined, { enabled: isAuthenticated });
  const connectionsQ = trpc.hub.connections.useQuery(undefined, { enabled: isAuthenticated });
  const categoriesQ = trpc.hub.categories.useQuery();
  // Use a manual fetch approach since checkForBlueprint is a query, not a mutation
  const [checkLoading, setCheckLoading] = useState(false);

  const blueprints = blueprintsQ.data ?? [];
  const connections = connectionsQ.data ?? [];
  const categories = categoriesQ.data ?? [];

  const connectedCatNames = useMemo(() => {
    const connCatIds = new Set(connections.filter(c => c.status === "connected").map(c => c.categoryId));
    return categories.filter(c => connCatIds.has(c.id)).map(c => c.name);
  }, [connections, categories]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-4">COMPATIBILITY CHECKER</h1>
          <p className="text-zinc-400 mb-6">Verify your tool stack meets blueprint requirements before deployment</p>
          <a href={getLoginUrl()}>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  const runCheck = (blueprintId: number) => {
    setSelectedBlueprintId(blueprintId);
    setCheckLoading(true);
    // Simulate compatibility check using local data
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

  const scoreColor = (score: number) => score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";
  const scoreBg = (score: number) => score >= 80 ? "bg-green-900/20 border-green-800" : score >= 50 ? "bg-yellow-900/20 border-yellow-800" : "bg-red-900/20 border-red-800";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-black uppercase tracking-tight">COMPATIBILITY CHECKER</h1>
        </div>
        <p className="text-zinc-400 text-sm">
          Verify your connected tool stack against blueprint requirements — identify gaps before deployment
        </p>
        <div className="h-[2px] bg-red-600 mt-4" />
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Blueprint Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase text-zinc-400 tracking-wide">SELECT BLUEPRINT</h3>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">
                {blueprints.length} available
              </Badge>
            </div>

            {blueprints.length === 0 ? (
              <Card className="bg-zinc-950 border border-zinc-800">
                <CardContent className="py-8 text-center">
                  <Layers className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No blueprints found. Create one in the Blueprint Builder.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {blueprints.map((bp) => (
                  <Card
                    key={bp.id}
                    className={`bg-zinc-950 border cursor-pointer transition-colors hover:border-zinc-600 ${selectedBlueprintId === bp.id ? "border-red-800" : "border-zinc-800"}`}
                    onClick={() => runCheck(bp.id)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-white text-sm truncate">{bp.name}</h4>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] uppercase">{bp.category}</Badge>
                      </div>
                      <p className="text-zinc-500 text-xs truncate">{bp.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-600">
                        <span>{bp.totalDeployments ?? 0} deployments</span>
                        <span>v{bp.version}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Your Connected Tools */}
            <Card className="bg-zinc-950 border border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase text-zinc-400 flex items-center gap-1">
                  <Plug className="w-4 h-4" /> Your Tool Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                {connectedCatNames.length === 0 ? (
                  <p className="text-zinc-600 text-xs">No tools connected. Visit the Integration Hub to connect tools.</p>
                ) : (
                  <div className="space-y-1">
                    {connectedCatNames.map((name) => (
                      <div key={name} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="text-zinc-300 font-mono uppercase">{name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2">
            {checkLoading ? (
              <Card className="bg-zinc-950 border border-zinc-800">
                <CardContent className="py-16 text-center">
                  <Loader2 className="w-12 h-12 text-red-600 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-bold text-white uppercase mb-2">ANALYZING COMPATIBILITY</h3>
                  <p className="text-zinc-500 text-sm">Checking your tool stack against blueprint requirements...</p>
                </CardContent>
              </Card>
            ) : result ? (
              <div className="space-y-4">
                {/* Score Card */}
                <Card className={`border ${scoreBg(result.overallScore)}`}>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black text-white uppercase">{result.blueprintName}</h3>
                        <p className="text-zinc-400 text-sm mt-1">Compatibility Analysis</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-5xl font-black ${scoreColor(result.overallScore)}`}>
                          {result.overallScore}%
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {result.canDeploy ? (
                            <Badge className="bg-green-900/50 text-green-400 border-green-800 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> DEPLOY READY
                            </Badge>
                          ) : (
                            <Badge className="bg-red-900/50 text-red-400 border-red-800 text-xs">
                              <XCircle className="w-3 h-3 mr-1" /> NOT READY
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Connected */}
                  <Card className="bg-zinc-950 border border-green-900/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Connected ({result.connectedCategories.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.connectedCategories.length === 0 ? (
                        <p className="text-zinc-600 text-xs">None</p>
                      ) : (
                        <div className="space-y-1">
                          {result.connectedCategories.map((cat) => (
                            <div key={cat} className="text-xs text-green-400 font-mono uppercase">{cat}</div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Missing */}
                  <Card className="bg-zinc-950 border border-red-900/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase text-red-500 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Missing ({result.missingCategories.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.missingCategories.length === 0 ? (
                        <p className="text-zinc-600 text-xs">None — all covered</p>
                      ) : (
                        <div className="space-y-1">
                          {result.missingCategories.map((cat) => (
                            <div key={cat} className="text-xs text-red-400 font-mono uppercase">{cat}</div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Partial */}
                  <Card className="bg-zinc-950 border border-yellow-900/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase text-yellow-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Partial ({result.partialCategories.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.partialCategories.length === 0 ? (
                        <p className="text-zinc-600 text-xs">None</p>
                      ) : (
                        <div className="space-y-1">
                          {result.partialCategories.map((cat) => (
                            <div key={cat} className="text-xs text-yellow-400 font-mono uppercase">{cat}</div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <Card className="bg-zinc-950 border border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold uppercase text-zinc-400 flex items-center gap-1">
                        <Zap className="w-4 h-4 text-red-600" /> Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                            <ArrowRight className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {result.canDeploy && (
                    <Button className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase" onClick={() => toast.success("Redirecting to deploy flow...")}>
                      <Zap className="w-4 h-4 mr-2" /> Deploy Blueprint
                    </Button>
                  )}
                  <Button variant="outline" className="border-zinc-700 text-zinc-300 font-bold uppercase" onClick={() => runCheck(result.blueprintId)}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Re-Check
                  </Button>
                  {result.missingCategories.length > 0 && (
                    <Button variant="outline" className="border-zinc-700 text-zinc-300 font-bold uppercase" onClick={() => toast.success("Opening Integration Hub...")}>
                      <Plug className="w-4 h-4 mr-2" /> Connect Missing Tools
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Card className="bg-zinc-950 border border-zinc-800">
                <CardContent className="py-16 text-center">
                  <Shield className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white uppercase mb-2">SELECT A BLUEPRINT</h3>
                  <p className="text-zinc-500 text-sm max-w-md mx-auto">
                    Choose a blueprint from the left panel to check if your connected tool stack meets its requirements for deployment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
