import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Mail, CheckCircle2, XCircle, Edit2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface LeadResponseApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  buyerName: string;
  buyerEmail: string;
  equipmentInterest: string;
  draftResponse: string;
  onApprove?: (leadId: number, response: string) => void;
  onReject?: (leadId: number) => void;
}

export function LeadResponseApprovalModal({
  isOpen,
  onClose,
  leadId,
  buyerName,
  buyerEmail,
  equipmentInterest,
  draftResponse,
  onApprove,
  onReject,
}: LeadResponseApprovalModalProps) {
  const [editedResponse, setEditedResponse] = useState(draftResponse);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendMutation = trpc.leadResponse.executeResponse.useMutation();

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await sendMutation.mutateAsync({
        actionItemId: leadId,
        dealerSlug: "johnson-tractor",
        recipientEmail: buyerEmail,
        recipientName: buyerName,
        subject: `Your Equipment Inquiry - ${equipmentInterest}`,
        body: editedResponse,
        htmlBody: `<p>${editedResponse.replace(/\n/g, "</p><p>")}</p>`,
      });

      onApprove?.(leadId, editedResponse);
      onClose();
    } catch (error) {
      console.error("Failed to send response:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = () => {
    onReject?.(leadId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Approve Lead Response
          </DialogTitle>
          <DialogDescription>Review and approve the response before sending to {buyerName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Information */}
          <Card className="bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Buyer Name</div>
                  <div className="text-sm font-semibold">{buyerName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Email</div>
                  <div className="text-sm font-mono text-blue-600">{buyerEmail}</div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Equipment Interest</div>
                <div className="text-sm">{equipmentInterest}</div>
              </div>
            </CardContent>
          </Card>

          {/* Draft Response */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Draft Response</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="gap-1"
              >
                <Edit2 className="w-4 h-4" />
                {isEditing ? "Done" : "Edit"}
              </Button>
            </div>

            {isEditing ? (
              <Textarea
                value={editedResponse}
                onChange={(e) => setEditedResponse(e.target.value)}
                className="min-h-48 font-mono text-sm"
                placeholder="Edit the response here..."
              />
            ) : (
              <Card className="bg-white border-2 border-blue-100">
                <CardContent className="pt-6 whitespace-pre-wrap text-sm leading-relaxed">
                  {editedResponse}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quality Indicators */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <div className="text-xs">
                    <div className="font-semibold text-green-900">Personalized</div>
                    <div className="text-green-700">Includes buyer name</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <div className="text-xs">
                    <div className="font-semibold text-blue-900">Equipment Match</div>
                    <div className="text-blue-700">Addresses interest</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <div className="text-xs">
                    <div className="font-semibold text-purple-900">CTA Included</div>
                    <div className="text-purple-700">Quote link ready</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warning if editing */}
          {isEditing && (
            <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                You're editing the response. Make sure to maintain a professional tone and include the quote link.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReject} disabled={isSubmitting}>
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button onClick={handleApprove} disabled={isSubmitting} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? "Sending..." : "Approve & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Lead Response Approval Queue
 * Shows pending responses waiting for Taylor's approval
 */
export function LeadResponseApprovalQueue() {
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

  // Mock data - replace with actual tRPC query
  const pendingResponses = [
    {
      leadId: 1,
      buyerName: "John Smith",
      buyerEmail: "john@farm.com",
      equipmentInterest: "John Deere 7530 Tractor",
      draftResponse: `Hi John,

Thank you for your inquiry about the John Deere 7530 Tractor. We have several units in stock that match your requirements.

The 7530 is an excellent choice for mid-size operations, offering:
- 130 HP engine
- Excellent fuel efficiency
- Advanced hydraulics system
- Comfortable cab with climate control

I'd like to discuss financing options and arrange a time for you to see the unit in person. I've prepared a customized quote for you based on your needs.

Best regards,
Johnson Tractor Sales Team`,
      status: "pending",
    },
    {
      leadId: 2,
      buyerName: "Mary Johnson",
      buyerEmail: "mary@agribusiness.com",
      equipmentInterest: "Equipment financing options",
      draftResponse: `Hi Mary,

Thank you for reaching out about equipment financing. We work with several lenders to provide flexible financing solutions for agricultural operations.

Our financing specialists can help you with:
- Competitive interest rates
- Flexible payment terms
- Quick approval process
- Trade-in options

I'd like to schedule a call to discuss your specific needs and explore the best options for your operation.

Looking forward to working with you.

Best regards,
Johnson Tractor Sales Team`,
      status: "pending",
    },
  ];

  const handleApproveClick = (leadId: number) => {
    setSelectedLead(leadId);
    setApprovalModalOpen(true);
  };

  const selectedResponse = pendingResponses.find((r) => r.leadId === selectedLead);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Lead Response Approval Queue</h2>
        <p className="text-gray-600 mt-1">
          {pendingResponses.length} response{pendingResponses.length !== 1 ? "s" : ""} awaiting your approval
        </p>
      </div>

      <div className="grid gap-3">
        {pendingResponses.map((response) => (
          <Card key={response.leadId} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-base">{response.buyerName}</CardTitle>
                  <CardDescription className="mt-1">{response.equipmentInterest}</CardDescription>
                </div>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Pending
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Preview */}
              <div className="bg-gray-50 p-3 rounded border border-gray-200 max-h-32 overflow-hidden">
                <p className="text-sm text-gray-700 line-clamp-4">{response.draftResponse}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApproveClick(response.leadId)}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Review & Approve
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approval Modal */}
      {selectedResponse && (
        <LeadResponseApprovalModal
          isOpen={approvalModalOpen}
          onClose={() => setApprovalModalOpen(false)}
          leadId={selectedResponse.leadId}
          buyerName={selectedResponse.buyerName}
          buyerEmail={selectedResponse.buyerEmail}
          equipmentInterest={selectedResponse.equipmentInterest}
          draftResponse={selectedResponse.draftResponse}
          onApprove={(leadId) => {
            console.log(`Approved lead ${leadId}`);
          }}
          onReject={(leadId) => {
            console.log(`Rejected lead ${leadId}`);
          }}
        />
      )}
    </div>
  );
}
