"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const PlanCard = ({ 
  plan, 
  isCurrentPlan, 
  onSelectPlan 
}: { 
  plan: any; 
  isCurrentPlan: boolean; 
  onSelectPlan: (planId: string) => void;
}) => (
  <div className={`border rounded-lg p-6 ${isCurrentPlan ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'} ${plan.isPopular ? 'ring-2 ring-indigo-500' : ''}`}>
    {plan.isPopular && (
      <div className="text-center mb-4">
        <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium">
          Most Popular
        </span>
      </div>
    )}
    
    <div className="text-center mb-6">
      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
      <div className="mt-2">
        <span className="text-4xl font-bold text-gray-900">
          ${(plan.price / 100).toFixed(0)}
        </span>
        <span className="text-gray-500">/{plan.interval}</span>
      </div>
    </div>

    <div className="space-y-4 mb-6">
      <div className="flex justify-between">
        <span className="text-gray-600">Monitors</span>
        <span className="font-medium">
          {plan.limits.monitors === -1 ? "Unlimited" : plan.limits.monitors}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Alert Recipients</span>
        <span className="font-medium">{plan.limits.alertRecipients}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Check Interval</span>
        <span className="font-medium">{plan.limits.checkInterval} min</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Data Retention</span>
        <span className="font-medium">{plan.limits.dataRetention} days</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Regions</span>
        <span className="font-medium">{plan.limits.regions}</span>
      </div>
    </div>

    <div className="space-y-2 mb-6">
      {plan.features.map((feature: string, index: number) => (
        <div key={index} className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {feature}
        </div>
      ))}
    </div>

    <Button
      onClick={() => onSelectPlan(plan.id)}
      disabled={isCurrentPlan}
      className={`w-full ${isCurrentPlan ? 'bg-gray-400' : plan.isPopular ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-900 hover:bg-gray-800'}`}
    >
      {isCurrentPlan ? "Current Plan" : "Select Plan"}
    </Button>
  </div>
);

export default function SubscriptionPage() {
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const { data: currentSubscription, isLoading: subscriptionLoading } = trpc.subscription.getCurrent.useQuery();
  const { data: availablePlans, isLoading: plansLoading } = trpc.subscription.getPlans.useQuery();
  const { data: usageAnalytics } = trpc.subscription.getUsageAnalytics.useQuery();
  const { data: billingHistory } = trpc.subscription.getBillingHistory.useQuery({ limit: 5 });

  const changePlanMutation = trpc.subscription.changePlan.useMutation();
  const cancelSubscriptionMutation = trpc.subscription.cancel.useMutation();

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setShowUpgradeModal(true);
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedPlan) return;

    try {
      await changePlanMutation.mutateAsync({
        newPlan: selectedPlan as any,
        billingCycle: selectedBillingCycle,
      });
      setShowUpgradeModal(false);
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error("Failed to change plan:", error);
    }
  };

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const currentPlan = currentSubscription?.plan?.current || "BASIC";
  const usage = currentSubscription?.usage || { monitors: 0, alertRecipients: 0 };
  const limits = currentSubscription?.limits || { monitors: 2, alertRecipients: 1 };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600 mt-2">Manage your plan and billing information</p>
        </div>

        {/* Current Plan Overview */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Current Plan: {currentPlan}</h2>
              <p className="text-gray-600">
                {currentSubscription?.subscription?.status === "ACTIVE" ? "Active" : "Inactive"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Next billing</div>
              <div className="text-lg font-medium">
                {currentSubscription?.subscription?.currentPeriodEnd ? 
                  new Date(currentSubscription.subscription.currentPeriodEnd).toLocaleDateString() : 
                  "N/A"
                }
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Monitors</span>
                <span className="text-sm text-gray-500">
                  {usage.monitors}/{limits.monitors === -1 ? "∞" : limits.monitors}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${usage.monitors! / limits.monitors >= 0.8 ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ 
                    width: limits.monitors === -1 ? "20%" : `${Math.min((usage?.monitors! / limits.monitors) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              {usageAnalytics?.warnings.monitorsNearLimit && (
                <p className="text-xs text-red-600 mt-1">
                  You're approaching your monitor limit. Consider upgrading.
                </p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Alert Recipients</span>
                <span className="text-sm text-gray-500">
                  {usage.alertRecipients}/{limits.alertRecipients}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${usage?.alertRecipients! / limits.alertRecipients >= 0.8 ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min((usage.alertRecipients! / limits.alertRecipients) * 100, 100)}%` }}
                ></div>
              </div>
              {usageAnalytics?.warnings.alertRecipientsNearLimit && (
                <p className="text-xs text-red-600 mt-1">
                  You're approaching your alert recipient limit.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            {currentSubscription?.canUpgrade && (
              <Button 
                onClick={() => {/* Scroll to plans */}}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Upgrade Plan
              </Button>
            )}
            {currentSubscription?.subscription?.status === "ACTIVE" && (
              <Button 
                variant="outline"
                onClick={() => cancelSubscriptionMutation.mutate({})}
                disabled={cancelSubscriptionMutation.isPending}
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="text-center mb-8">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setSelectedBillingCycle("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedBillingCycle === "monthly" 
                  ? "bg-white text-gray-900 shadow" 
                  : "text-gray-600"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedBillingCycle("yearly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedBillingCycle === "yearly" 
                  ? "bg-white text-gray-900 shadow" 
                  : "text-gray-600"
              }`}
            >
              Yearly <span className="text-green-600">(Save 20%)</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {availablePlans?.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={{
                ...plan,
                price: selectedBillingCycle === "yearly" 
                  ? Math.round(plan.price * 12 * 0.8) // 20% yearly discount
                  : plan.price
              }}
              isCurrentPlan={plan.isCurrent}
              onSelectPlan={handlePlanSelect}
            />
          ))}
        </div>

        {/* Usage Analytics */}
        {usageAnalytics?.historical && usageAnalytics.historical.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-8 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Usage History</h3>
            <div className="space-y-4">
              {usageAnalytics.historical.slice(0, 6).map((period) => (
                <div key={period.period} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{period.period}</span>
                  <div className="flex space-x-4 text-sm">
                    <span>{period.monitors} monitors</span>
                    <span>{period.alertRecipients} recipients</span>
                    <span>{period.checks.toLocaleString()} checks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing History */}
        {billingHistory?.records && billingHistory.records.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Recent Billing</h3>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-4">
              {billingHistory.records.map((record) => (
                <div key={record.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="font-medium text-gray-900">{record.description}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${record.amount.toFixed(2)}</div>
                    <div className={`text-sm ${record.status === "PAID" ? "text-green-600" : record.status === "FAILED" ? "text-red-600" : "text-yellow-600"}`}>
                      {record.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Confirm Plan Change
              </h3>
              <p className="text-gray-600 mb-6">
                You are about to change to the <strong>{selectedPlan}</strong> plan 
                with <strong>{selectedBillingCycle}</strong> billing.
                {selectedBillingCycle === "yearly" && (
                  <span className="text-green-600"> You'll save 20% with yearly billing!</span>
                )}
              </p>
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setShowUpgradeModal(false)}
                  disabled={changePlanMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPlanChange}
                  disabled={changePlanMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  {changePlanMutation.isPending ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}