import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400 to-red-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center relative">
        <div className="max-w-4xl mx-auto">
          {/* Status indicator */}
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in-up">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-glow"></div>
            All systems operational
          </div>
          
          <h1 className="text-7xl font-bold mb-6 tracking-tight animate-fade-in-up">
            <span className="text-gradient">Towerly</span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Monitor your website&apos;s uptime from multiple regions worldwide. 
            Get instant alerts when downtime happens and fix issues before they impact your users.
          </p>
          
          <div className="flex gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
              <a href="/dashboard">Start Monitoring</a>
            </Button>
            <Button asChild className="border border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3 text-lg transform hover:scale-105 transition-all duration-200 glass-effect">
              <a href="/dashboard">View tRPC Demo</a>
            </Button>
          </div>

          {/* Floating dashboard mockup */}
          <div className="mt-16 relative">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl mx-auto border animate-float glass-effect">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Uptime Dashboard</h3>
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg">
                  <div className="text-green-700 font-semibold">99.9%</div>
                  <div className="text-green-600">Uptime</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
                  <div className="text-blue-700 font-semibold">124ms</div>
                  <div className="text-blue-600">Response</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg">
                  <div className="text-purple-700 font-semibold">7 Regions</div>
                  <div className="text-purple-600">Monitoring</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Choose <span className="text-gradient">Towerly</span>?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Built for developers who care about reliability and performance
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-slate-100">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Global Monitoring</h3>
              <p className="text-slate-600 leading-relaxed">Monitor from multiple regions worldwide to ensure your site is accessible everywhere.</p>
              <div className="mt-4 text-sm text-blue-600 font-medium">7+ regions available</div>
            </div>
            
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-slate-100">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75l-7.5-7.5 3-3L12 12.75l4.5-4.5 3 3-7.5 7.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Instant Alerts</h3>
              <p className="text-slate-600 leading-relaxed">Get notified immediately when your site goes down via email, SMS, or Slack.</p>
              <div className="mt-4 text-sm text-green-600 font-medium">30s response time</div>
            </div>
            
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-slate-100">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Detailed Analytics</h3>
              <p className="text-slate-600 leading-relaxed">Track uptime trends, response times, and performance metrics over time.</p>
              <div className="mt-4 text-sm text-purple-600 font-medium">Real-time insights</div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-20 bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
            <div className="relative z-10">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">Trusted by developers worldwide</h3>
                <p className="text-slate-300">Join thousands of teams monitoring their uptime with Towerly</p>
              </div>
              <div className="grid grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-400">99.9%</div>
                  <div className="text-slate-300 text-sm">Average Uptime</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-400">30s</div>
                  <div className="text-slate-300 text-sm">Alert Time</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400">7+</div>
                  <div className="text-slate-300 text-sm">Global Regions</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-400">24/7</div>
                  <div className="text-slate-300 text-sm">Monitoring</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float" style={{ animationDelay: '3s' }}></div>
        </div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-6 animate-fade-in-up">
              Ready to monitor your website?
            </h2>
            <p className="text-slate-300 mb-8 text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Join thousands of developers who trust Towerly to keep their websites running smoothly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
                <a href="/dashboard">Try tRPC Demo</a>
              </Button>
              <p className="text-slate-400 text-sm">No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-gradient mb-2">Towerly</h3>
              <p className="text-slate-600">
                Built with ❤️ for developers who care about uptime.
              </p>
            </div>
            <div className="flex gap-6 text-slate-600">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
            </div>
          </div>
          <div className="text-center mt-8 pt-8 border-t border-slate-200">
            <p className="text-slate-500">
              © 2025 Towerly. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
