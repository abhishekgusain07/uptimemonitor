// Add this debug component to your app temporarily
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';

function DebugAuth() {
  const { user, session, isLoading } = useAuth();

  useEffect(() => {
    // Log auth state
    console.log('🔍 Auth Debug:', {
      isLoading,
      hasUser: !!user,
      hasSession: !!session,
      userId: user?.id,
      sessionId: session?.id,
    });

    // Check cookies
    console.log('🍪 All Cookies:', document.cookie);
    
    // Check for Better Auth specific cookies
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    console.log('🔐 Auth Cookies:', {
      'better-auth.session_token': cookies['better-auth.session_token'],
      'better-auth.csrf_token': cookies['better-auth.csrf_token'],
      // Check for any other auth-related cookies
      ...Object.fromEntries(
        Object.entries(cookies).filter(([key]) => 
          key.includes('auth') || key.includes('session')
        )
      )
    });

    // Test tRPC call
    if (!isLoading) {
      testTRPCAuth();
    }
  }, [user, session, isLoading]);

  const testTRPCAuth = async () => {
    try {
      console.log('🧪 Testing tRPC auth...');
      
      // Make a test request to see what's being sent
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/trpc/monitoring.getMonitors`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 tRPC Test Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Log the actual request headers that were sent
      console.log('📤 Request details:', {
        url: response.url,
        credentials: 'include',
        cookies: document.cookie,
      });
    } catch (error) {
      console.error('❌ tRPC Test Error:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <pre>{JSON.stringify({ user: user?.email, session: !!session, loading: isLoading }, null, 2)}</pre>
    </div>
  );
}


export default DebugAuth;