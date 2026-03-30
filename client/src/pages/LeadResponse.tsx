import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";

interface Lead {
  id: number;
  actionText: string;
  context: string;
  riskLevel: "low" | "medium" | "high";
  status: "pending" | "approved" | "executed" | "failed";
}

interface DraftedResponse {
  subject: string;
  body: string;
  htmlBody: string;
  estimatedConversionRate?: number;
}

export function LeadResponse() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(30001); // Johnson Tractor
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draftedResponse, setDraftedResponse] = useState<DraftedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"recommended" | "conservative" | "aggressive">(
    "recommended"
  );

  // Fetch pending leads
  const { data: leads, isLoading: leadsLoading } = trpc.leadResponse.getPendingLeads.useQuery({
    companyId: selectedCompanyId,
  });

  // Draft response mutation
  const draftMutation = trpc.leadResponse.draftResponse.useMutation({
    onSuccess: (result) => {
      setDraftedResponse(result.response);
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Draft failed:", error);
      setIsLoading(false);
    },
  });

  // Execute response mutation
  const executeMutation = trpc.leadResponse.executeResponse.useMutation({
    onSuccess: () => {
      setSelectedLead(null);
      setDraftedResponse(null);
      // Refetch leads
      window.location.reload();
    },
    onError: (error) => {
      console.error("Execute failed:", error);
    },
  });

  const handleDraftResponse = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsLoading(true);

    const context = typeof lead.context === "string" ? JSON.parse(lead.context) : lead.context;

    // Mock inventory for demo
    const mockInventory = [
      {
        id: "jd-7530-001",
        type: "John Deere Tractor",
        model: "7530",
        year: 2022,
        price: 75000,
        condition: "excellent" as const,
        location: "Iowa",
      },
      {
        id: "jd-6430-001",
        type: "John Deere Tractor",
        model: "6430",
        year: 2021,
        price: 55000,
        condition: "good" as const,
        location: "Illinois",
      },
    ];

    draftMutation.mutate({
      actionItemId: lead.id,
      inventory: mockInventory,
      dealerName: "Johnson Tractor",
      dealerPhone: "(555) 123-4567",
    });
  };

  const handleExecuteResponse = async () => {
    if (!selectedLead || !draftedResponse) return;

    const context = typeof selectedLead.context === "string" ? JSON.parse(selectedLead.context) : selectedLead.context;

    executeMutation.mutate({
      actionItemId: selectedLead.id,
      dealerSlug: context.dealerSlug || "johnson-tractor",
      recipientEmail: context.buyer?.email || "buyer@example.com",
      recipientName: context.buyer?.name,
      subject: draftedResponse.subject,
      body: draftedResponse.body,
      htmlBody: draftedResponse.htmlBody,
      quoteLink: "https://quotes.opencommand.co/demo",
    });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-red-500/10 text-red-700";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700";
      case "low":
        return "bg-green-500/10 text-green-700";
      default:
        return "bg-gray-500/10 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lead Response Agent</h1>
        <p className="text-gray-600 mt-2">Manage incoming TractorHouse leads and draft personalized responses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Pending Leads</CardTitle>
              <CardDescription>{leads?.length || 0} leads waiting for response</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {leadsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : leads && leads.length > 0 ? (
                leads.map((lead: any) => (
                  <button
                    key={lead.id}
                    onClick={() => handleDraftResponse(lead)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedLead?.id === lead.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{lead.actionText}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={getRiskColor(lead.riskLevel)}>
                        {lead.riskLevel}
                      </Badge>
                      <Badge variant="secondary">{lead.status}</Badge>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No pending leads</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Draft Response */}
        <div className="lg:col-span-2">
          {selectedLead && draftedResponse ? (
            <Card>
              <CardHeader>
                <CardTitle>Drafted Response</CardTitle>
                <CardDescription>Review and send to buyer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded border">{draftedResponse.subject}</div>
                </div>

                <div>
                  <label className="text-sm font-medium">Message</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded border whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">
                    {draftedResponse.body}
                  </div>
                </div>

                {draftedResponse.estimatedConversionRate && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded border border-blue-200">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-blue-900">Estimated Conversion Rate</div>
                      <div className="text-lg font-bold text-blue-600">{draftedResponse.estimatedConversionRate}%</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleExecuteResponse}
                    disabled={executeMutation.isPending}
                    className="flex-1"
                  >
                    {executeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Response
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraftedResponse(null);
                      setSelectedLead(null);
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedLead ? (
            <Card>
              <CardHeader>
                <CardTitle>Drafting Response</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                  <p className="text-gray-600">Generating personalized response...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select a Lead</CardTitle>
                <CardDescription>Choose a lead from the list to draft a response</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No lead selected</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
