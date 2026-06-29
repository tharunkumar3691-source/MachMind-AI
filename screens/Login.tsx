import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { csrfToken, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'ai' | 'ar' | 'db'>('ai');

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0f1d] text-[#10b981]">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
          <p className="text-slate-400 font-mono text-sm tracking-wider">BOOTING FIXSTREAM INTERFACES...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#030712] text-white font-sans relative overflow-x-hidden">
      {/* ─── BACKGROUND AMBIENT GLOWS ─── */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-[#10b981]/15 to-[#3b82f6]/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-[#3b82f6]/10 to-[#8b5cf6]/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ─── NAVIGATION HEADER ─── */}
      <header className="w-full border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-[#10b981] to-[#3b82f6] flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <span className="material-symbols-outlined text-white text-xl">stream</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              MachMind AI <span className="text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-2 py-0.5 rounded-full ml-1 font-mono uppercase tracking-widest font-semibold">AR</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-[#10b981] transition-colors">Features</a>
            <a href="#architecture" className="hover:text-[#3b82f6] transition-colors">Architecture</a>
            <a href="#demo" className="hover:text-[#8b5cf6] transition-colors">Interactive Demo</a>
          </div>

          <div>
            <span className="text-xs font-mono text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-[#10b981] animate-ping"></span>
              PRODUCTION GATEWAY LOBBY
            </span>
          </div>
        </div>
      </header>

      {/* ─── HERO & AUTH SECTION ─── */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side: Pitch and Sign-in */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
              <span className="material-symbols-outlined text-[#10b981] text-sm">bolt</span>
              Next-Gen Multimodal Diagnostic Engine
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-white">
              Augmented Reality <br />
              <span className="bg-gradient-to-r from-[#10b981] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                AI Diagnostics
              </span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl">
              MachMind AI integrates Google Gemini AI with high-fidelity S3 attachment storage and Aurora PostgreSQL to provide instantaneous, secure, and precise hardware repair procedures.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 border-y border-white/5 py-6">
            <div>
              <div className="text-2xl font-bold text-white font-mono">99.4%</div>
              <div className="text-xs text-slate-400">Diagnosis Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono">&lt; 1.8s</div>
              <div className="text-xs text-slate-400">Gemini Response Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#10b981] font-mono">100%</div>
              <div className="text-xs text-slate-400">Secure OAuth 2.0</div>
            </div>
          </div>

          {/* Sign In Card */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.4)] relative overflow-hidden group hover:border-[#10b981]/30 transition-all duration-300">
            <div className="absolute top-0 right-0 size-24 bg-[#10b981]/5 rounded-bl-full blur-xl pointer-events-none group-hover:bg-[#10b981]/15 transition-all"></div>
            
            <h3 className="text-lg font-semibold mb-2">Secure Verification Lobby</h3>
            <p className="text-xs text-slate-400 mb-6">Verify your identity via Google Federated OAuth 2.0 to access repair logs, media libraries, and AR workflows.</p>

            <form action="/api/auth/signin/google" method="POST" className="w-full">
              <input type="hidden" name="csrfToken" value={csrfToken || ''} />
              <input type="hidden" name="callbackUrl" value="/dashboard" />
              
              <button
                type="submit"
                disabled={!csrfToken}
                className="w-full bg-white text-black font-bold py-3.5 px-6 rounded-xl hover:bg-slate-100 active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-[0_4px_25px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed group/btn"
              >
                <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="tracking-tight text-sm">Continue with Google</span>
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[10px] text-[#10b981]">lock</span> TLS Encrypted</span>
              <span>Adapter: Drizzle ORM PG</span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Mockup / Tech Visualizer */}
        <div className="lg:col-span-6 relative flex justify-center">
          <div className="w-full max-w-[500px] h-[400px] rounded-2xl bg-gradient-to-tr from-white/5 to-white/[0.01] border border-white/10 p-6 shadow-2xl relative overflow-hidden backdrop-blur-md flex flex-col justify-between">
            {/* Top Bar inside Mockup */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-500/80"></span>
                <span className="size-3 rounded-full bg-yellow-500/80"></span>
                <span className="size-3 rounded-full bg-green-500/80"></span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-1 rounded">DEVICE DIAGNOSTICS: STABLE</span>
            </div>

            {/* Interactive Tab Switcher Simulation */}
            <div className="my-4 flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-1.5 text-xs rounded transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20 font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-xs">psychology</span> Gemini AI
              </button>
              <button 
                onClick={() => setActiveTab('ar')}
                className={`flex-1 py-1.5 text-xs rounded transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ar' ? 'bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/20 font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-xs">view_in_ar</span> AR HUD
              </button>
              <button 
                onClick={() => setActiveTab('db')}
                className={`flex-1 py-1.5 text-xs rounded transition-all flex items-center justify-center gap-1.5 ${activeTab === 'db' ? 'bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/20 font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-xs">database</span> Aurora PG
              </button>
            </div>

            {/* Simulation Area */}
            <div className="flex-1 rounded-xl bg-black/40 border border-white/5 p-4 flex flex-col justify-center relative overflow-hidden">
              {activeTab === 'ai' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#10b981] text-lg">smart_toy</span>
                    <span className="text-xs font-mono text-slate-300">multimodal_analysis.py</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-1.5 bg-[#10b981]/30 rounded w-5/6 animate-pulse"></div>
                    <div className="h-1.5 bg-[#10b981]/20 rounded w-4/6"></div>
                    <div className="h-1.5 bg-[#10b981]/20 rounded w-3/6"></div>
                  </div>
                  <div className="border-t border-[#10b981]/20 pt-2 text-[10px] text-slate-400 font-mono">
                    gemini-2.5-flash &gt; <span className="text-[#10b981]">Hypothesis generated in 1.2s</span>
                  </div>
                </div>
              )}

              {activeTab === 'ar' && (
                <div className="space-y-2 animate-fadeIn relative h-full flex flex-col justify-center">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-24 border border-dashed border-[#3b82f6]/40 rounded-full animate-spin"></div>
                  <div className="flex items-center justify-between text-xs text-[#3b82f6] font-mono z-10">
                    <span>OVERLAY LOCK: YES</span>
                    <span>90 FPS</span>
                  </div>
                  <div className="text-center text-[10px] text-slate-400 z-10">
                    Hovering overlay projection active on S3 object keys.
                  </div>
                </div>
              )}

              {activeTab === 'db' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs text-[#8b5cf6] font-mono">
                    <span>TRANSACTIONS ACTIVE</span>
                    <span>Aurora Cluster</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded text-[9px] font-mono text-slate-300 space-y-1">
                    <div>BEGIN TRANSACTION;</div>
                    <div className="text-emerald-400">INSERT INTO users (id, name, email) VALUES ...</div>
                    <div>COMMIT;</div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Bar Info */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>S3 BUCKET: machmind123</span>
              <span>DB CLUSTER: US-EAST-1</span>
            </div>
          </div>
        </div>
      </main>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <h2 className="text-3xl font-bold text-center mb-16 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Integrated Cloud Infrastructure</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 hover:border-[#10b981]/30 transition-all duration-300">
            <span className="material-symbols-outlined text-[#10b981] text-3xl mb-4">memory</span>
            <h3 className="text-lg font-semibold mb-2">Gemini Pro API</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Leverages advanced multimodal processing to instantly identify failures from real-time AR camera frames, blueprints, and voice memos.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 hover:border-[#3b82f6]/30 transition-all duration-300">
            <span className="material-symbols-outlined text-[#3b82f6] text-3xl mb-4">database</span>
            <h3 className="text-lg font-semibold mb-2">Amazon Aurora PostgreSQL</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Guarantees zero-data-loss transactions for user sessions, accounts, and diagnostic histories, integrated seamlessly with Drizzle ORM.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 hover:border-[#8b5cf6]/30 transition-all duration-300">
            <span className="material-symbols-outlined text-[#8b5cf6] text-3xl mb-4">cloud_upload</span>
            <h3 className="text-lg font-semibold mb-2">Amazon S3 Storage</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Instantly stream high-fidelity image, video, and audio evidence to secure object store containers with automatic signed URL generation.
            </p>
          </div>
        </div>
      </section>

      {/* ─── ARCHITECTURE SECTION ─── */}
      <section id="architecture" className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5">
        <div className="bg-gradient-to-r from-white/5 to-transparent border border-white/5 rounded-3xl p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Full-Stack Security Blueprint</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              MachMind AI ensures total security isolation. Password storage is completely bypassed by routing authentication exclusively through Google OAuth 2.0. Users are mapped via unique accounts inside Aurora PG with automated session expiry and token rotation.
            </p>
            <ul className="space-y-3 text-xs text-slate-300 font-mono">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#10b981] text-sm">check_circle</span>
                EXCLUSIVE OAUTH SIGNIN (NO PASSWORDS STORED)
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#10b981] text-sm">check_circle</span>
                CSRF PROTECTION MOUNTED ON ALL ENTRANCES
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#10b981] text-sm">check_circle</span>
                DRIZZLE SCHEMAS STRICTLY MAPPED & LINTED
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-black/50 border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>SYSTEM FLOW CHART</span>
                <span>v1.0.0</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="size-8 rounded-lg bg-[#3b82f6]/20 text-[#3b82f6] flex items-center justify-center font-bold">1</div>
                  <div>
                    <div className="font-semibold text-xs">Auth.js Callback</div>
                    <div className="text-[10px] text-slate-400">Verifies OAuth tokens and maps credentials</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="size-8 rounded-lg bg-[#10b981]/20 text-[#10b981] flex items-center justify-center font-bold">2</div>
                  <div>
                    <div className="font-semibold text-xs">Aurora PG Persistence</div>
                    <div className="text-[10px] text-slate-400">Inserts user, account & session tables in transactional block</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="size-8 rounded-lg bg-[#8b5cf6]/20 text-[#8b5cf6] flex items-center justify-center font-bold">3</div>
                  <div>
                    <div className="font-semibold text-xs">SPA Route Access</div>
                    <div className="text-[10px] text-slate-400">Grants client dashboard permission instantly</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="w-full border-t border-white/5 py-12 bg-black/40 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>© 2026 MachMind AI. Fully Certified hackathon submission.</div>
          <div className="flex gap-4">
            <span className="hover:text-white transition-colors">PostgreSQL 16</span>
            <span>•</span>
            <span className="hover:text-white transition-colors">Vercel Ready</span>
            <span>•</span>
            <span className="hover:text-white transition-colors">Auth.js Express</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
