import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Plus, Trash2, Edit2 } from "lucide-react";

interface Goal {
  id: number;
  title: string;
  description: string | null;
  status: "planning" | "active" | "paused" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  targetDate?: Date | null;
  agents: Array<{ agentId: string; agentName: string; role: string; completionPercentage: string | null }> | null;
}

export default function GoalsDashboard() {
  const user = trpc.auth.me.useQuery().data;
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    targetDate: "",
  });

  const { data: goals = [], isLoading, refetch } = trpc.goals.list.useQuery(
    { companyId: selectedCompanyId },
    { enabled: !!selectedCompanyId }
  );

  const createGoalMutation = trpc.goals.create.useMutation({
    onSuccess: () => {
      setFormData({ title: "", description: "", priority: "medium", targetDate: "" });
      setShowCreateDialog(false);
      refetch();
    },
  });

  const deleteGoalMutation = trpc.goals.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleCreateGoal = () => {
    if (!formData.title) return;
    createGoalMutation.mutate({
      companyId: selectedCompanyId,
      title: formData.title,
      description: formData.description || undefined,
      priority: formData.priority as any,
      targetDate: formData.targetDate ? new Date(formData.targetDate).getTime() : undefined,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "active":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "at-risk":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workplace Goals</h1>
          <p className="text-gray-500 mt-1">Manage multi-agent goals and track progress</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>Define a goal for your team to collaborate on</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Goal Title</label>
                <Input
                  placeholder="e.g., Q2 Lead Response Campaign"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe the goal and success criteria"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Target Date</label>
                  <Input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleCreateGoal} className="w-full" disabled={!formData.title}>
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading goals...</div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No goals yet. Create one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {goals.map((goal: Goal) => (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(goal.status)}
                      <CardTitle>{goal.title}</CardTitle>
                      <Badge className={getPriorityColor(goal.priority)}>{goal.priority}</Badge>
                    </div>
                    {goal.description && <CardDescription className="mt-2">{goal.description}</CardDescription>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteGoalMutation.mutate({ goalId: goal.id })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Agents assigned to goal */}
                  {goal.agents && goal.agents.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Assigned Agents</h4>
                      <div className="space-y-2">
                        {goal.agents.map((agent) => (
                          <div key={agent.agentId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div>
                              <p className="font-medium text-sm">{agent.agentName}</p>
                              <p className="text-xs text-gray-500">{agent.role}</p>
                            </div>
                            <div className="text-right">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${agent.completionPercentage}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{agent.completionPercentage}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Goal metadata */}
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Status: {goal.status}</span>
                    {goal.targetDate && <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
