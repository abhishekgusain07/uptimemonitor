"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { trpc } from "@/lib/trpc";

interface ProfileFormData {
  name: string;
  // Optionally add image if you want to allow editing it
  // image?: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || "",
    // image: user?.image || null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Remove trpc usages for non-existent endpoints
  // const { data: userProfile, isLoading } = trpc.auth.getMe.useQuery();
  // const { data: accountStats } = trpc.auth.getAccountStats.useQuery();
  // const { data: securityOverview } = trpc.auth.getSecurityOverview.useQuery();
  // const updateProfileMutation = trpc.auth.updateProfile.useMutation();

  // Remove useState for userProfile

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      // Here you would call your update endpoint if you have one
      // For now, just update local state and exit edit mode
      // await updateProfileMutation.mutateAsync({ name: formData.name });
      setIsEditing(false);
      // Optionally refresh user data if needed
      // window.location.reload();
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      // image: user?.image || null,
    });
    setErrors({});
    setIsEditing(false);
  };

  // Remove isLoading check since we don't have async loading now

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account information</p>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                Edit Profile
              </Button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed here.
              </p>
            </div>
            {/* Optionally show image, createdAt, updatedAt, etc. */}
            {isEditing && (
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}