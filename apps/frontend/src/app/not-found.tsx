'use client'
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400 to-red-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="container mx-auto px-6 text-center">
          <motion.div 
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* 404 Animation */}
            <div className="mb-8">
              <div className="text-8xl font-bold text-gradient mb-4">404</div>
              <div className="text-2xl font-semibold text-slate-700 mb-2">Page Not Found</div>
            </div>

            {/* Floating icon */}
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-float shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            {/* Error message */}
            <div className="mb-8">
              <p className="text-xl text-slate-600 mb-4 leading-relaxed">
                Oops! The page you&apos;re looking for seems to have wandered off into cyberspace.
              </p>
              <p className="text-lg text-slate-500">
                Don&apos;t worry, even our monitoring systems can&apos;t find this one!
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link href="/">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
                  Back to Home
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3 text-lg transform hover:scale-105 transition-all duration-200 glass-effect"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </div>

            {/* Status card */}
            <div className="mb-12">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto border glass-effect">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">System Status</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse-glow"></div>
                    <span className="text-sm text-green-600 font-medium">All systems operational</span>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  While this page doesn&apos;t exist, our monitoring services are running perfectly!
                </div>
              </div>
            </div>

            {/* Helpful links */}
            <div>
              <h4 className="text-lg font-semibold text-slate-700 mb-4">Popular Pages</h4>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Home
                </Link>
                <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Dashboard
                </Link>
                <Link href="/monitors" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Monitors
                </Link>
                <Link href="/settings" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Settings
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}