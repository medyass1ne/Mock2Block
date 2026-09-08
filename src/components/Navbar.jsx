"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { useAuth } from "../context/AuthContext";
import { Globe } from "lucide-react";

export default function Navbar() {
  const { user, setUser, showAuthModal, setShowAuthModal, authReason, setAuthReason, handleLogout } = useAuth();
  
  // Auth state
  const [authMode, setAuthMode] = useState("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authNeedsVerification, setAuthNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  // Settings state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [settingsMode, setSettingsMode] = useState("view");
  const [settingsData, setSettingsData] = useState({ username: "", email: "", isVerified: false });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [newUsernameInput, setNewUsernameInput] = useState("");
  const [newEmailInput, setNewEmailInput] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const payload = { username: authUsername, password: authPassword };
      if (authMode === 'register') {
        payload.email = authEmail;
      }

      const res = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        if (data.needsVerification) {
          setAuthSuccess(data.message);
          setAuthNeedsVerification(true);
        } else {
          setUser(data.username);
          setShowAuthModal(false);
          setAuthUsername("");
          setAuthPassword("");
        }
      } else {
        setAuthError(data.error || "Authentication failed.");
        if (data.needsVerification) {
          setAuthNeedsVerification(true);
        }
      }
    } catch (err) {
      setAuthError("Network error. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (showAccountModal && user) {
      setSettingsLoading(true);
      setSettingsError("");
      setSettingsSuccess("");
      setSettingsMode("view");
      fetch('/api/auth/settings')
        .then(res => res.json())
        .then(data => {
          if (data.username) {
            setSettingsData(data);
            setNewUsernameInput(data.username);
            setNewEmailInput(data.email || "");
          } else if (data.error) {
            setSettingsError(data.error);
          }
        })
        .catch(err => setSettingsError("Failed to load account details."))
        .finally(() => setSettingsLoading(false));
    }
  }, [showAccountModal, user]);

  const handleUpdateSettings = async (action) => {
    setSettingsError("");
    setSettingsSuccess("");
    setSettingsLoading(true);

    let payload = { action };
    if (action === 'update_username') {
      payload.newUsername = newUsernameInput;
    } else if (action === 'update_email') {
      payload.newEmail = newEmailInput;
    } else if (action === 'update_password') {
      if (newPasswordInput !== confirmPasswordInput) {
        setSettingsError("New passwords do not match.");
        setSettingsLoading(false);
        return;
      }
      payload.currentPassword = currentPasswordInput;
      payload.newPassword = newPasswordInput;
    }

    try {
      const res = await fetch('/api/auth/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setSettingsError(data.error || "An error occurred.");
      } else {
        setSettingsSuccess(data.message || "Updated successfully.");
        if (action === 'update_username') {
          setUser(data.username);
          setSettingsData(prev => ({ ...prev, username: data.username }));
        } else if (action === 'update_email') {
          setSettingsData(prev => ({ ...prev, email: newEmailInput }));
        }
        
        setTimeout(() => {
          setSettingsMode("view");
          setCurrentPasswordInput("");
          setNewPasswordInput("");
          setConfirmPasswordInput("");
          setSettingsSuccess("");
        }, 2000);
      }
    } catch (err) {
      setSettingsError("Network error. Please try again.");
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <>
      <nav className="w-full h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-white font-bold text-lg tracking-tight">Mock2Block</span>
          <span className="text-zinc-500 text-xs hidden sm:inline-block">/ Premium API Prototyping</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <button onClick={() => setShowAccountModal(true)} className="text-sm text-zinc-300 hover:text-white font-medium flex items-center gap-2 cursor-pointer transition-colors">
                <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
                {user}
              </button>
              <div className="w-px h-4 bg-zinc-800"></div>
              <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100 text-xs font-medium transition-colors">Dashboard</Link>
              <div className="w-px h-4 bg-zinc-800"></div>
              <button onClick={handleLogout} className="text-zinc-400 hover:text-zinc-100 text-xs font-medium transition-colors">Logout</button>
            </div>
          ) : (
            <button onClick={() => { setAuthReason("login"); setShowAuthModal(true); }} className="px-4 py-1.5 bg-white text-black hover:bg-zinc-200 text-xs font-medium rounded transition-colors">
              Sign In
            </button>
          )}
        </div>
      </nav>

      {showAuthModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-sm relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-5 right-5 text-neutral-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 relative z-10">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6 relative z-10">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === 'login' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Login</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === 'register' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Register</button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Username</label>
                <input type="text" required value={authUsername} onChange={e => setAuthUsername(e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-600 transition-all" />
              </div>
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Email</label>
                  <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-600 transition-all placeholder-neutral-600" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Password</label>
                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-600 transition-all" />
              </div>
              {authSuccess && <div className="text-green-400 text-xs font-medium bg-green-500/10 p-3 rounded-lg border border-green-500/20 flex items-center gap-2"><svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{authSuccess}</div>}
              {authError && (
                <div className="text-red-400 text-xs font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <p>{authError}</p>
                  {authNeedsVerification && (
                    <button
                      type="button"
                      disabled={resending}
                      onClick={async () => {
                        setResending(true);
                        try {
                          const res = await fetch('/api/auth/resend', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: authUsername })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setAuthError('');
                            setAuthNeedsVerification(false);
                            setAuthSuccess(data.message || 'Verification email resent!');
                          } else {
                            setAuthError(data.error || 'Failed to resend');
                          }
                        } catch (e) {
                          setAuthError('Network error while resending');
                        } finally {
                          setResending(false);
                        }
                      }}
                      className="mt-2 w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white rounded-lg text-xs font-semibold transition-all border border-red-500/20 hover:border-red-500/40 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {resending ? 'Sending...' : 'Resend Confirmation Email'}
                    </button>
                  )}
                </div>
              )}
              <button type="submit" disabled={authLoading} className="w-full py-3 mt-2 bg-white hover:bg-zinc-200 text-black border-0 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50">
                {authLoading ? '...' : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
              </button>
            </form>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-sm relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowAccountModal(false)} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
            
            {settingsLoading && settingsMode === "view" ? (
              <SkeletonTheme baseColor="#18181b" highlightColor="#27272a">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Skeleton width={80} height={16} />
                    </div>
                    <Skeleton height={45} borderRadius={12} />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Skeleton width={100} height={16} />
                    </div>
                    <Skeleton height={45} borderRadius={12} />
                  </div>
                  <div>
                    <Skeleton width={120} height={16} className="mb-2" />
                    <Skeleton height={45} borderRadius={12} />
                  </div>
                  <div className="pt-4 border-t border-zinc-800 flex justify-between">
                    <Skeleton width={120} height={20} />
                    <Skeleton width={80} height={36} borderRadius={12} />
                  </div>
                </div>
              </SkeletonTheme>
            ) : (
              <div className="space-y-6">
                {settingsError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {settingsError}
                  </div>
                )}
                {settingsSuccess && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {settingsSuccess}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Username</label>
                    {settingsMode === "view" && (
                      <button onClick={() => setSettingsMode("edit_username")} className="text-xs text-zinc-400 hover:text-white transition-colors">Edit</button>
                    )}
                  </div>
                  {settingsMode === "edit_username" ? (
                    <div className="flex gap-2">
                      <input type="text" value={newUsernameInput} onChange={e => setNewUsernameInput(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500" placeholder="New username" />
                      <button onClick={() => handleUpdateSettings('update_username')} disabled={settingsLoading} className="px-4 py-2.5 bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">Save</button>
                      <button onClick={() => setSettingsMode("view")} className="px-4 py-2.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium rounded-xl transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <input type="text" readOnly value={settingsData.username || user} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none" />
                  )}
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Email Address</label>
                    {settingsMode === "view" && (
                      <button onClick={() => setSettingsMode("edit_email")} className="text-xs text-zinc-400 hover:text-white transition-colors">Edit</button>
                    )}
                  </div>
                  {settingsMode === "edit_email" ? (
                    <div className="flex gap-2">
                      <input type="email" value={newEmailInput} onChange={e => setNewEmailInput(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500" placeholder="New email" />
                      <button onClick={() => handleUpdateSettings('update_email')} disabled={settingsLoading} className="px-4 py-2.5 bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">Save</button>
                      <button onClick={() => setSettingsMode("view")} className="px-4 py-2.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium rounded-xl transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <input type="email" readOnly value={settingsData.email || "No email set"} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Account Status</label>
                  <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <div className={`w-2 h-2 rounded-full ${settingsData.isVerified ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      {settingsData.isVerified ? "Verified Prototyper" : "Pending Verification"}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  {settingsMode === "edit_password" ? (
                    <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                      <input type="password" value={currentPasswordInput} onChange={e => setCurrentPasswordInput(e.target.value)} placeholder="Current Password" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                      <input type="password" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} placeholder="New Password" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                      <input type="password" value={confirmPasswordInput} onChange={e => setConfirmPasswordInput(e.target.value)} placeholder="Confirm New Password" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                      <div className="flex gap-2 justify-end mt-4">
                        <button onClick={() => setSettingsMode("view")} className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors">Cancel</button>
                        <button onClick={() => handleUpdateSettings('update_password')} disabled={settingsLoading} className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">Update Password</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button onClick={() => setSettingsMode("edit_password")} className="text-sm font-medium text-white hover:text-zinc-300 transition-colors">
                        Change Password
                      </button>
                      <button onClick={() => { setShowAccountModal(false); handleLogout(); }} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-all border border-red-500/20">
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
