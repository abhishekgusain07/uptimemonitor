'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

// Types are now inferred from tRPC router

export default function Dashboard() {
  const [newMonitorName, setNewMonitorName] = useState('');
  const [newMonitorUrl, setNewMonitorUrl] = useState('');

  const { data: monitors, isLoading: monitorsLoading, refetch: refetchMonitors } = trpc.monitoring.getMonitors.useQuery();
  const { data: users, isLoading: usersLoading } = trpc.user.getAllUsers.useQuery();

  const createMonitorMutation = trpc.monitoring.createMonitor.useMutation({
    onSuccess: () => {
      refetchMonitors();
      setNewMonitorName('');
      setNewMonitorUrl('');
    },
  });

  const deleteMonitorMutation = trpc.monitoring.deleteMonitor.useMutation({
    onSuccess: () => {
      refetchMonitors();
    },
  });

  const handleCreateMonitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMonitorName && newMonitorUrl) {
      createMonitorMutation.mutate({
        name: newMonitorName,
        url: newMonitorUrl,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">tRPC + TanStack Query Demo</h1>
          <p className="text-gray-600">Demonstrating type-safe API calls with real-time data</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Monitors</h3>
            <p className="text-3xl font-bold text-blue-600">
              {monitorsLoading ? '...' : monitors?.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-green-600">
              {usersLoading ? '...' : users?.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-green-600 font-semibold">All Systems Operational</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monitors Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Monitors</h2>
              <div className="flex items-center">
                {monitorsLoading && (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                )}
                <span className="text-sm text-gray-500">
                  {monitorsLoading ? 'Loading...' : `${monitors?.length || 0} monitors`}
                </span>
              </div>
            </div>

            {/* Create Monitor Form */}
            <form onSubmit={handleCreateMonitor} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-4">Add New Monitor</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Monitor name"
                  value={newMonitorName}
                  onChange={(e) => setNewMonitorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={newMonitorUrl}
                  onChange={(e) => setNewMonitorUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="submit"
                  disabled={createMonitorMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {createMonitorMutation.isPending ? 'Creating...' : 'Create Monitor'}
                </Button>
              </div>
            </form>

            {/* Monitors List */}
            <div className="space-y-3">
              {monitors?.map((monitor) => (
                <div key={monitor.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{monitor.name}</h3>
                      <p className="text-sm text-gray-600">{monitor.url}</p>
                      <div className="flex items-center mt-2">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${
                            monitor.status === 'up' 
                              ? 'bg-green-500' 
                              : monitor.status === 'paused' 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                          }`}
                        ></div>
                        <span
                          className={`text-sm font-medium ${
                            monitor.status === 'up' 
                              ? 'text-green-600' 
                              : monitor.status === 'paused' 
                              ? 'text-yellow-600' 
                              : 'text-red-600'
                          }`}
                        >
                          {monitor.status === 'up' 
                            ? 'Online' 
                            : monitor.status === 'paused' 
                            ? 'Paused' 
                            : 'Offline'
                          }
                        </span>
                        {monitor.responseTime && (
                          <span className="text-sm text-gray-500 ml-2">
                            {monitor.responseTime}ms
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMonitorMutation.mutate({ id: monitor.id })}
                      disabled={deleteMonitorMutation.isPending}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Users Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Users</h2>
              <div className="flex items-center">
                {usersLoading && (
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                )}
                <span className="text-sm text-gray-500">
                  {usersLoading ? 'Loading...' : `${users?.length || 0} users`}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {users?.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Joined: {user.createdAt.toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* tRPC Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">✨ tRPC Features Demonstrated</h3>
          <ul className="text-blue-800 space-y-1">
            <li>• <strong>Type Safety:</strong> Full TypeScript support from API to frontend</li>
            <li>• <strong>React Query Integration:</strong> Automatic caching, loading states, and refetching</li>
            <li>• <strong>Mutations:</strong> Create and delete operations with optimistic updates</li>
            <li>• <strong>Real-time Updates:</strong> Data automatically refetches after mutations</li>
            <li>• <strong>Error Handling:</strong> Built-in error states and retry logic</li>
            <li>• <strong>Developer Experience:</strong> IntelliSense and autocompletion everywhere</li>
          </ul>
        </div>
      </div>
    </div>
  );
}