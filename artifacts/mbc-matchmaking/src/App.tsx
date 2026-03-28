import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import {
  Download, AlertCircle, Calendar, Check, Users,
  Send, User, Clock, ArrowLeft, ShieldAlert, Star, CalendarPlus, Link as LinkIcon, Plus, X, Building,
  GraduationCap, Briefcase, Settings, Globe, Rocket, LogOut, Shield, Eye, EyeOff, Copy, Mail, UserPlus, Trash2
} from 'lucide-react';

const getBaseUrl = () => {
  return window.location.origin + window.location.pathname;
};

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const AppContext = createContext<any>(null);

const formatICSDate = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');

const generateICS = (event: { title: string; description: string; startTime: Date; endTime: Date; location?: string }) => {
  const { title, description, startTime, endTime, location } = event;
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}@${window.location.hostname}`;
  const icsContent = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PROID:-//MBC Matchmaking Platform//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startTime)}`,
    `DTEND:${formatICSDate(endTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location || ''}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/\s/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const MAX_PRECEPTORS_PER_SLOT = 3;
const SURVEY_TIMES = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];

const formatSafeDate = (dateString: string, formatStr: string, timeZone = 'UTC') => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const fMonth = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' }).format(date);
  const fDay = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' }).format(date);
  const fYear = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(date);
  if (formatStr === 'MMM d, yyyy') return `${fMonth} ${fDay}, ${fYear}`;
  if (formatStr === 'MMM d') return `${fMonth} ${fDay}`;
  return dateString;
};

const generateSurveyDays = (startDateString: string, timeZone = 'UTC') => {
  const days: string[] = [];
  if (!startDateString) return days;
  const [year, month, day] = startDateString.split('-').map(Number);
  const fmtWeekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
  const fmtMonth = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' });
  const fmtDay = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' });
  for (let i = 0; i < 5; i++) {
    const date = new Date(Date.UTC(year, month - 1, day + i, 12, 0, 0));
    days.push(`${fmtWeekday.format(date)}, ${fmtMonth.format(date)} ${fmtDay.format(date)}`);
  }
  return days;
};

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (America/New_York)' },
  { value: 'America/Chicago', label: 'Central Time (America/Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (America/Los_Angeles)' },
  { value: 'Europe/London', label: 'London (Europe/London)' },
  { value: 'Europe/Berlin', label: 'Berlin (Europe/Berlin)' },
  { value: 'Africa/Lagos', label: 'Lagos (Africa/Lagos)' },
  { value: 'Asia/Dubai', label: 'Dubai (Asia/Dubai)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Asia/Tokyo)' },
  { value: 'Australia/Sydney', label: 'Sydney (Australia/Sydney)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('login');
  const [error, setError] = useState<string | null>(null);
  const [currentCohortId, setCurrentCohortId] = useState<number | null>(null);
  const [currentCohortSettings, setCurrentCohortSettings] = useState<any>(null);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [pendingInvite, setPendingInvite] = useState<any>(null);
  const [inviteError, setInviteError] = useState<{ type: string; role?: string; cohortName?: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchCohorts = useCallback(async () => {
    try {
      const data = await api('/cohorts');
      setCohorts(data);
    } catch {}
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (inviteToken) {
      setInviteLoading(true);
      api(`/invites/validate/${inviteToken}`).then((data) => {
        if (data.valid) {
          setPendingInvite({ token: inviteToken, role: data.role, cohortName: data.cohortName, cohortId: data.cohortId });
        } else {
          setInviteError({ type: data.reason || 'invalid', role: data.role, cohortName: data.cohortName });
        }
      }).catch(() => {
        setInviteError({ type: 'error' });
      }).finally(() => {
        setInviteLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    api('/auth/me').then((data) => {
      setUser(data.user);
      setUserRole(data.user.role);
      window.history.replaceState({}, '', window.location.pathname);
      setView('cohortSelection');
      setAuthLoading(false);
    }).catch(() => {
      setUser(null);
      setUserRole(null);
      setView('login');
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCohorts();
  }, [user, fetchCohorts]);

  useEffect(() => {
    if (!currentCohortId || !user) { setCurrentCohortSettings(null); return; }
    const cohort = cohorts.find((c: any) => c.id === currentCohortId);
    if (cohort) {
      setCurrentCohortSettings(cohort);
    } else {
      setCurrentCohortSettings(null);
    }
  }, [currentCohortId, user, cohorts]);

  useEffect(() => {
    if (!user || cohorts.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const cohortParam = params.get('cohort');
    if (cohortParam) {
      const cid = parseInt(cohortParam);
      if (cohorts.some((c: any) => c.id === cid)) {
        setCurrentCohortId(cid);
        setView('survey');
      }
    }
  }, [cohorts, user]);

  const surveyDays = currentCohortSettings?.weekStartDate && currentCohortSettings?.timezone
    ? generateSurveyDays(currentCohortSettings.weekStartDate, currentCohortSettings.timezone)
    : [];

  const handleSignOut = async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    setUserRole(null);
    setCurrentCohortId(null);
    setCurrentCohortSettings(null);
    setView('login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <Calendar className="w-12 h-12 text-indigo-400 animate-pulse" />
          <p className="text-slate-400 font-medium">Connecting to Scheduling Service...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      user, userRole, error, setError, setView,
      currentCohortId, setCurrentCohortId, currentCohortSettings,
      cohorts, setCohorts, fetchCohorts, surveyDays, SURVEY_TIMES, handleSignOut, pendingInvite, setPendingInvite, setUser, setUserRole, inviteError, setInviteError, inviteLoading
    }}>
      <div className="min-h-screen bg-slate-900 text-slate-300 font-sans pb-20">
        {view !== 'login' && (
          <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <GraduationCap className="text-red-500 w-6 h-6" />
                <h1 className="text-xl font-bold text-white">MBC Matchmaking Platform</h1>
                {currentCohortSettings?.timezone && (
                  <span className="ml-4 px-3 py-1 bg-slate-700 rounded-full text-xs font-medium text-white">
                    {currentCohortSettings.name} ({currentCohortSettings.timezone.split('/')[1]?.replace('_', ' ')})
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {view !== 'cohortSelection' && (
                  <button
                    onClick={() => { setView('cohortSelection'); setCurrentCohortId(null); setError(null); }}
                    className="text-sm flex items-center text-slate-400 hover:text-white transition-colors font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Cohorts
                  </button>
                )}
                <div className="flex items-center space-x-2 pl-3 border-l border-slate-700">
                  <span className="text-xs text-slate-500 hidden sm:block">{user?.email}</span>
                  {(userRole === 'superadmin' || userRole === 'admin') && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${userRole === 'superadmin' ? 'bg-red-600/30 text-red-300' : 'bg-indigo-600/30 text-indigo-300'}`}>
                      {userRole === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </span>
                  )}
                  <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-white transition-colors" title="Sign Out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-500/30 text-red-300 flex items-center rounded-lg shadow-lg">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}
          {view === 'login' && <LoginPage />}
          {view === 'cohortSelection' && <CohortSelectionPage />}
          {view === 'roleSelection' && <RoleSelectionPage />}
          {view === 'survey' && <SurveyView />}
          {view === 'admin' && <AdminView />}
          {view === 'superadmin' && <SuperAdminView />}
        </main>
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 10px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
          input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
        `}} />
      </div>
    </AppContext.Provider>
  );
}

function LoginPage() {
  const { setError, pendingInvite, setPendingInvite, setUser, setUserRole, setView, setCurrentCohortId, inviteError, setInviteError, inviteLoading } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isInvite = !!pendingInvite;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isInvite) {
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, inviteToken: pendingInvite.token, displayName: displayName.trim() }),
        });
        setUser(data.user);
        setUserRole(data.user.role);
        setPendingInvite(null);
        window.history.replaceState({}, '', window.location.pathname);
        if (data.cohortId) {
          setCurrentCohortId(data.cohortId);
          if (data.user.role === 'preceptor') {
            setView('survey');
          } else if (data.user.role === 'admin') {
            setView('admin');
          } else {
            setView('cohortSelection');
          }
        } else {
          setView('cohortSelection');
        }
      } else {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setUser(data.user);
        setUserRole(data.user.role);
        window.history.replaceState({}, '', window.location.pathname);
        setView('cohortSelection');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissInviteError = () => {
    setInviteError(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  if (inviteLoading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <UserPlus className="w-12 h-12 text-emerald-400 animate-pulse" />
          <p className="text-slate-400 font-medium">Verifying your invite...</p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-8">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-3xl font-extrabold text-white mb-3">Invite Link Issue</h1>
          </div>
          <div className="bg-slate-800 rounded-2xl border border-red-500/30 p-8 shadow-2xl">
            {inviteError.type === 'already_used' ? (
              <div className="text-center space-y-3">
                <p className="text-slate-300">This invite link has already been used.</p>
                <p className="text-slate-400 text-sm">Each invite link can only be used once. If you already created your account, you can sign in below.</p>
                <p className="text-slate-400 text-sm">Otherwise, please ask your administrator for a new invite link.</p>
              </div>
            ) : inviteError.type === 'not_found' ? (
              <div className="text-center space-y-3">
                <p className="text-slate-300">This invite link is not valid.</p>
                <p className="text-slate-400 text-sm">The link may have been deleted or is incorrect. Please check the link or ask your administrator for a new one.</p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-slate-300">Something went wrong verifying your invite.</p>
                <p className="text-slate-400 text-sm">Please try again or ask your administrator for a new invite link.</p>
              </div>
            )}
            <button onClick={handleDismissInviteError}
              className="w-full mt-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors shadow-lg">
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isInvite) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Welcome to MBC Matchmaking</h1>
            <div className="inline-flex items-center px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-full mt-2">
              <Star className="w-4 h-4 text-emerald-400 mr-2" />
              <span className="text-emerald-300 text-sm font-semibold">
                You've been invited as {pendingInvite.role === 'admin' ? 'an Admin' : 'a Preceptor'}
                {pendingInvite.cohortName ? ` for ${pendingInvite.cohortName}` : ''}
              </span>
            </div>
            <p className="text-slate-400 mt-3">Create your account to get started</p>
          </div>
          <div className="bg-slate-800 rounded-2xl border border-emerald-500/20 p-8 shadow-2xl">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Full Name</label>
                <input type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Dr. Jane Smith" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Create Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 pr-12 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Minimum 6 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                {loading ? 'Creating your account...' : 'Create Account'}
              </button>
            </form>
            <p className="text-center text-slate-500 text-sm mt-6">
              Already have an account?{' '}
              <button onClick={() => { setPendingInvite(null); window.history.replaceState({}, '', window.location.pathname); }}
                className="text-emerald-400 hover:text-emerald-300 underline font-semibold">
                Sign in instead
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <Rocket className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-4xl font-extrabold text-white">MBC Matchmaking</h1>
          <p className="text-slate-400 mt-2">Sign in to access the platform</p>
        </div>
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 pr-12 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50">
              {loading ? 'Please wait...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-slate-500 text-sm mt-6">
            Need an account? Ask your admin for an invite link.
          </p>
        </div>
      </div>
    </div>
  );
}

function CohortSelectionPage() {
  const { setView, setCurrentCohortId, cohorts, setError, userRole } = useContext(AppContext);

  const handleSelectCohort = (cohortId: number) => {
    setCurrentCohortId(cohortId);
    setView('roleSelection');
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto mt-16 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-gradient-to-br from-red-700/30 to-slate-800/50 p-10 rounded-2xl border border-red-600/50 shadow-2xl shadow-red-900/20 mb-12">
        <Globe className="w-20 h-20 text-red-400 mx-auto mb-6" />
        <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">Select Your Cohort</h1>
        <p className="text-slate-300 text-lg max-w-3xl mx-auto leading-relaxed">
          Choose the specific Master of Business Creation program you are associated with.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cohorts.length === 0 ? (
          <div className="col-span-full text-slate-400 text-lg">
            No cohorts available. {userRole === 'superadmin' ? 'Create one from the Super Admin panel below.' : 'Please contact an administrator.'}
          </div>
        ) : (
          cohorts.map((cohort: any) => (
            <div key={cohort.id} onClick={() => handleSelectCohort(cohort.id)}
              className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/50 hover:border-indigo-500/80 hover:bg-slate-800/80 transition-all text-left group cursor-pointer shadow-lg">
              <div className="w-16 h-16 bg-slate-700 text-indigo-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Building className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{cohort.name}</h2>
              <p className="text-slate-400">Time Zone: {cohort.timezone?.split('/')[1]?.replace('_', ' ')}</p>
              {cohort.weekStartDate && (
                <p className="text-slate-500 text-sm mt-1">Week starts: {formatSafeDate(cohort.weekStartDate, 'MMM d, yyyy', cohort.timezone)}</p>
              )}
            </div>
          ))
        )}
      </div>
      <div className="mt-12 flex justify-center gap-4 flex-wrap">
        {(userRole === 'superadmin' || userRole === 'admin') && (
          <button onClick={() => { setView('admin'); setError(null); }} className="text-indigo-400 hover:text-white underline decoration-indigo-600 transition-colors">
            Access Admin Dashboard
          </button>
        )}
        {userRole === 'superadmin' && (
          <button onClick={() => { setView('superadmin'); setError(null); }} className="text-red-400 hover:text-white underline decoration-red-600 transition-colors flex items-center">
            <Shield className="w-4 h-4 mr-1.5" /> Super Admin Panel
          </button>
        )}
      </div>
    </div>
  );
}

function RoleSelectionPage() {
  const { setView, currentCohortSettings, userRole } = useContext(AppContext);

  if (!currentCohortSettings) return <div className="text-center py-20 text-slate-400">Loading cohort details...</div>;

  return (
    <div className="max-w-5xl mx-auto mt-16 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-gradient-to-br from-red-700/30 to-slate-800/50 p-10 rounded-2xl border border-red-600/50 shadow-2xl shadow-red-900/20 mb-12">
        <GraduationCap className="w-20 h-20 text-red-400 mx-auto mb-6" />
        <h1 className="text-5xl font-extrabold text-white mb-4">{currentCohortSettings.name}</h1>
        <h2 className="text-3xl font-semibold text-red-200 mb-6">Preceptor & Startup Matchmaking Platform</h2>
        <p className="text-slate-300 text-lg max-w-3xl mx-auto">
          Welcome to {currentCohortSettings.name}. Please select your role to proceed.
        </p>
      </div>
      <div className={`grid grid-cols-1 ${(userRole === 'superadmin' || userRole === 'admin') ? 'md:grid-cols-2' : 'max-w-md mx-auto'} gap-8`}>
        <div onClick={() => setView('survey')}
          className="bg-slate-800/50 p-10 rounded-2xl border border-slate-700/50 hover:border-indigo-500/80 hover:bg-slate-800/80 transition-all text-left group cursor-pointer shadow-lg">
          <div className="w-16 h-16 bg-slate-700 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">I am a Preceptor</h2>
          <p className="text-slate-400">Submit or update your availability to mentor our MBC startups.</p>
        </div>
        {(userRole === 'superadmin' || userRole === 'admin') && (
          <div onClick={() => setView('admin')}
            className="bg-slate-800/50 p-10 rounded-2xl border border-slate-700/50 hover:border-emerald-500/80 hover:bg-slate-800/80 transition-all text-left group cursor-pointer shadow-lg">
            <div className="w-16 h-16 bg-slate-700 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Briefcase className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">I am an Administrator</h2>
            <p className="text-slate-400">Manage startup assignments, preceptor schedules, and generate meeting invites.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SuperAdminView() {
  const { setError, fetchCohorts } = useContext(AppContext);
  const [users, setUsers] = useState<any[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [inviteModal, setInviteModal] = useState<{ role: string; cohortId?: number; cohortName?: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);

  useEffect(() => {
    api('/invites/email-status').then(d => setEmailConfigured(d.configured)).catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await api('/users');
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [setError]);

  const loadInvites = useCallback(async () => {
    try {
      const data = await api('/invites');
      setInvites(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [setError]);

  useEffect(() => {
    loadUsers();
    loadInvites();
  }, [loadUsers, loadInvites]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api(`/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortTimezone, setNewCohortTimezone] = useState('America/New_York');
  const [newCohortStartDate, setNewCohortStartDate] = useState('');
  const [cohorts, setCohorts] = useState<any[]>([]);

  const loadCohorts = useCallback(async () => {
    try {
      const data = await api('/cohorts');
      setCohorts(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [setError]);

  useEffect(() => {
    loadCohorts();
  }, [loadCohorts]);

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;
    setLoading(true);
    try {
      await api('/cohorts', {
        method: 'POST',
        body: JSON.stringify({
          name: newCohortName.trim(),
          timezone: newCohortTimezone,
          weekStartDate: newCohortStartDate || null,
        }),
      });
      setNewCohortName('');
      setNewCohortStartDate('');
      loadCohorts();
      fetchCohorts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCohort = async (cohortId: number) => {
    if (!confirm('Are you sure you want to delete this cohort? All associated data will be lost.')) return;
    try {
      await api(`/cohorts/${cohortId}`, { method: 'DELETE' });
      loadCohorts();
      fetchCohorts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openInviteModal = (role: string, cohortId?: number, cohortName?: string) => {
    setInviteEmail('');
    setInviteModal({ role, cohortId, cohortName });
  };

  const handleCreateInvite = async () => {
    if (!inviteModal) return;
    setInviteSending(true);
    try {
      const body: any = {
        role: inviteModal.role,
        cohortId: inviteModal.cohortId || null,
        cohortName: inviteModal.cohortName || null,
      };
      if (inviteEmail.trim()) {
        body.recipientEmail = inviteEmail.trim();
        body.baseUrl = getBaseUrl();
      }
      const invite = await api('/invites', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const link = `${getBaseUrl()}?invite=${invite.token}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(invite.token);
      setTimeout(() => setCopiedId(null), 3000);
      setInviteModal(null);
      loadInvites();
      if (invite.emailSent) {
        setError('');
      } else if (inviteEmail.trim() && invite.emailError) {
        setError(`Invite created but email failed: ${invite.emailError}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviteSending(false);
    }
  };

  const handleDeleteInvite = async (inviteId: number) => {
    try {
      await api(`/invites/${inviteId}`, { method: 'DELETE' });
      loadInvites();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyInviteLink = async (token: string) => {
    const link = `${getBaseUrl()}?invite=${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-gradient-to-br from-red-700/30 to-slate-800/50 p-10 rounded-2xl border border-red-600/50 shadow-2xl shadow-red-900/20">
        <div className="flex items-center space-x-4 mb-6">
          <Shield className="w-12 h-12 text-red-400" />
          <div>
            <h1 className="text-4xl font-extrabold text-white">Super Admin Panel</h1>
            <p className="text-slate-300">Manage users, roles, and cohorts</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Building className="w-6 h-6 mr-3 text-indigo-400" /> Cohort Management
        </h2>
        <form onSubmit={handleCreateCohort} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <input type="text" value={newCohortName} onChange={e => setNewCohortName(e.target.value)}
            placeholder="Cohort Name (e.g. MBC 2025)"
            className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={newCohortTimezone} onChange={e => setNewCohortTimezone(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500">
            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
          <input type="date" value={newCohortStartDate} onChange={e => setNewCohortStartDate(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" disabled={loading}
            className="bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center">
            <Plus className="w-4 h-4 mr-2" /> Create Cohort
          </button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cohorts.map((c: any) => (
            <div key={c.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex justify-between items-start">
              <div>
                <h3 className="text-white font-bold">{c.name}</h3>
                <p className="text-slate-400 text-xs">{c.timezone}</p>
                {c.weekStartDate && <p className="text-slate-500 text-xs">Start: {formatSafeDate(c.weekStartDate, 'MMM d, yyyy', c.timezone)}</p>}
              </div>
              <button onClick={() => handleDeleteCohort(c.id)} className="text-slate-400 hover:text-red-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Users className="w-6 h-6 mr-3 text-indigo-400" /> User Management
        </h2>
        <input type="text" value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
          placeholder="Search by email..."
          className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 mb-6" />
        <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {filteredUsers.map((u: any) => (
            <div key={u.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{u.email}</p>
                <p className="text-slate-500 text-xs">{u.displayName || 'No display name'}</p>
              </div>
              <select value={u.role || 'preceptor'} onChange={e => handleRoleChange(u.id, e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="preceptor">Preceptor</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Mail className="w-6 h-6 mr-3 text-indigo-400" /> Invite Management
        </h2>
        <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => openInviteModal('admin')}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-500 transition-colors">
            <UserPlus className="w-4 h-4 mr-2" /> Invite Admin
          </button>
          {cohorts.map((c: any) => (
            <button key={c.id} onClick={() => openInviteModal('preceptor', c.id, c.name)}
              className="flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors">
              <UserPlus className="w-4 h-4 mr-2" /> Invite Preceptor to {c.name}
            </button>
          ))}
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Click a button above to generate a one-time invite link. Optionally enter an email to send the invite directly.
        </p>
        <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
          {invites.length === 0 && <p className="text-slate-500 italic text-sm">No invites generated yet.</p>}
          {invites.map((inv: any) => (
            <div key={inv.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${inv.role === 'admin' ? 'bg-indigo-600/30 text-indigo-300' : 'bg-emerald-600/30 text-emerald-300'}`}>
                    {inv.role}
                  </span>
                  {inv.cohortName && <span className="text-slate-400 text-xs">{inv.cohortName}</span>}
                  {inv.used ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-600/30 text-slate-400">Used by {inv.usedBy}</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-600/30 text-yellow-300">Pending</span>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-1 truncate">Token: {inv.token}</p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {!inv.used && (
                  <button onClick={() => copyInviteLink(inv.token)}
                    className="flex items-center px-3 py-1.5 bg-slate-700 text-white text-xs font-bold rounded-lg hover:bg-slate-600 transition-colors">
                    {copiedId === inv.token ? <><Check className="w-3 h-3 mr-1" /> Copied!</> : <><Copy className="w-3 h-3 mr-1" /> Copy Link</>}
                  </button>
                )}
                <button onClick={() => handleDeleteInvite(inv.id)} className="text-slate-400 hover:text-red-400 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {inviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center">
              <UserPlus className="w-6 h-6 mr-2 text-indigo-400" />
              {inviteModal.role === 'admin' ? 'Invite Admin' : `Invite Preceptor${inviteModal.cohortName ? ` to ${inviteModal.cohortName}` : ''}`}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              The invite link will be copied to your clipboard. Optionally enter an email to send it directly.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-1">Recipient Email (optional)</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="person@example.com"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                {!emailConfigured && inviteEmail.trim() && (
                  <p className="text-amber-400 text-xs mt-1">SMTP not configured. Email won't be sent, but the link will still be copied.</p>
                )}
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={() => setInviteModal(null)} className="flex-1 px-4 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={handleCreateInvite} disabled={inviteSending}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center">
                {inviteSending ? 'Creating...' : <><Mail className="w-4 h-4 mr-2" /> {inviteEmail.trim() ? 'Send & Copy Link' : 'Copy Link'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SurveyView() {
  const { user, currentCohortId, currentCohortSettings, surveyDays, SURVEY_TIMES, setError } = useContext(AppContext);
  const [name, setName] = useState('');
  const [availability, setAvailability] = useState<Record<string, Record<string, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);

  useEffect(() => {
    if (!user || !currentCohortId) return;
    api(`/cohorts/${currentCohortId}/submissions`).then((data) => {
      const mine = data.find((s: any) => s.userId === user.id);
      if (mine) {
        setExistingSubmission(mine);
        setName(mine.name || '');
        setAvailability((mine.availability as any) || {});
        setSubmitted(true);
      }
    }).catch(() => {});
  }, [user, currentCohortId]);

  const toggleSlot = (day: string, time: string) => {
    setAvailability(prev => {
      const daySlots = prev[day] || {};
      return { ...prev, [day]: { ...daySlots, [time]: !daySlots[time] } };
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await api(`/cohorts/${currentCohortId}/submissions`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), availability }),
      });
      setExistingSubmission(result);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentCohortSettings) return <div className="text-center py-20 text-slate-400">Loading cohort...</div>;

  const availableCount = Object.values(availability).reduce((total, daySlots) =>
    total + Object.values(daySlots).filter(Boolean).length, 0
  );

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-gradient-to-br from-indigo-700/30 to-slate-800/50 p-8 rounded-2xl border border-indigo-600/50 shadow-2xl shadow-indigo-900/20 mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Calendar className="w-10 h-10 text-indigo-400" />
          <div>
            <h1 className="text-3xl font-extrabold text-white">Preceptor Availability Survey</h1>
            <p className="text-slate-300">{currentCohortSettings.name} — {currentCohortSettings.timezone?.split('/')[1]?.replace('_', ' ')}</p>
          </div>
        </div>
        {currentCohortSettings.weekStartDate && (
          <p className="text-slate-400 text-sm">
            Week of {formatSafeDate(currentCohortSettings.weekStartDate, 'MMM d, yyyy', currentCohortSettings.timezone)}
          </p>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl mb-8">
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-300 mb-2">Your Full Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Dr. Jane Smith"
            className="w-full max-w-md bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <p className="text-slate-300 font-semibold mb-4">
          Select the time slots when you are available ({availableCount} selected):
        </p>

        <div className="overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead>
              <tr>
                <th className="p-3 text-left text-slate-400 font-bold bg-slate-900 rounded-tl-lg sticky left-0 z-10">Day</th>
                {SURVEY_TIMES.map((time: string) => (
                  <th key={time} className="p-3 text-center text-indigo-400 font-bold bg-slate-900 whitespace-nowrap">{time}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {surveyDays.map((day: string) => (
                <tr key={day} className="border-t border-slate-700">
                  <td className="p-3 font-semibold text-white bg-slate-800/50 sticky left-0 z-10 whitespace-nowrap">{day}</td>
                  {SURVEY_TIMES.map((time: string) => {
                    const isSelected = availability[day]?.[time];
                    return (
                      <td key={time} className="p-1.5 text-center">
                        <button onClick={() => toggleSlot(day, time)}
                          className={`w-full h-10 rounded-md flex items-center justify-center transition-all ${
                            isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-500'
                          }`}>
                          {isSelected ? <Check className="w-5 h-5" strokeWidth={3} /> : <span>-</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          {submitted && (
            <span className="text-emerald-400 font-semibold flex items-center">
              <Check className="w-5 h-5 mr-2" /> Your availability has been saved
            </span>
          )}
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center">
          <Send className="w-5 h-5 mr-2" />
          {loading ? 'Saving...' : existingSubmission ? 'Update Availability' : 'Submit Availability'}
        </button>
      </div>
    </div>
  );
}

function AdminView() {
  const { currentCohortId, currentCohortSettings, surveyDays, SURVEY_TIMES, setError, user } = useContext(AppContext);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, boolean>>({});
  const [slotAssignments, setSlotAssignments] = useState<Record<string, any>>({});
  const [showStartupManager, setShowStartupManager] = useState(false);
  const [startupModal, setStartupModal] = useState<any>(null);
  const [zoomModal, setZoomModal] = useState<any>(null);
  const [profileCard, setProfileCard] = useState<any>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [adminInviteModal, setAdminInviteModal] = useState(false);
  const [adminInviteEmail, setAdminInviteEmail] = useState('');
  const [adminInviteSending, setAdminInviteSending] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    api('/invites/email-status').then(d => setEmailConfigured(d.configured)).catch(() => {});
  }, []);

  const loadSubmissions = useCallback(async () => {
    if (!currentCohortId) return;
    try {
      const data = await api(`/cohorts/${currentCohortId}/submissions`);
      setSubmissions(data);
    } catch {}
  }, [currentCohortId]);

  const loadStartups = useCallback(async () => {
    if (!currentCohortId) return;
    try {
      const data = await api(`/cohorts/${currentCohortId}/startups`);
      setStartups(data);
    } catch {}
  }, [currentCohortId]);

  const loadSlotAssignments = useCallback(async () => {
    if (!currentCohortId) return;
    try {
      const data = await api(`/cohorts/${currentCohortId}/slot-assignments`);
      setSelections((data.selections as any) || {});
      setSlotAssignments((data.assignments as any) || {});
    } catch {}
  }, [currentCohortId]);

  useEffect(() => {
    loadSubmissions();
    loadStartups();
    loadSlotAssignments();
  }, [loadSubmissions, loadStartups, loadSlotAssignments]);

  const handleInvitePreceptor = async () => {
    if (!currentCohortId || !currentCohortSettings) return;
    setAdminInviteSending(true);
    try {
      const body: any = {
        role: 'preceptor',
        cohortId: currentCohortId,
        cohortName: currentCohortSettings.name,
      };
      if (adminInviteEmail.trim()) {
        body.recipientEmail = adminInviteEmail.trim();
        body.baseUrl = getBaseUrl();
      }
      const invite = await api('/invites', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const link = `${getBaseUrl()}?invite=${invite.token}`;
      await navigator.clipboard.writeText(link);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 3000);
      setAdminInviteModal(false);
      setAdminInviteEmail('');
      if (invite.emailSent) {
        setError('');
      } else if (adminInviteEmail.trim() && invite.emailError) {
        setError(`Invite created but email failed: ${invite.emailError}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdminInviteSending(false);
    }
  };

  const handleNotifyPreceptor = async (preceptorName: string, day: string, time: string) => {
    const slotKey = `${day}|${time}`;
    const assignment = slotAssignments[slotKey] || {};
    const startup = startups.find((s: any) => String(s.id) === String(assignment.startupId));
    if (!startup || !currentCohortSettings) return;

    const notifyKey = `${preceptorName}|${day}|${time}`;
    setNotifyStatus(prev => ({ ...prev, [notifyKey]: 'sending' }));
    try {
      await api(`/cohorts/${currentCohortId}/notify-assignment`, {
        method: 'POST',
        body: JSON.stringify({
          preceptorName,
          day,
          time,
          startupName: startup.name,
          zoomLink: assignment.zoom || '',
          cohortName: currentCohortSettings.name,
        }),
      });
      setNotifyStatus(prev => ({ ...prev, [notifyKey]: 'sent' }));
      setTimeout(() => setNotifyStatus(prev => ({ ...prev, [notifyKey]: '' })), 3000);
    } catch (err: any) {
      setNotifyStatus(prev => ({ ...prev, [notifyKey]: 'error' }));
      setError(err.message);
      setTimeout(() => setNotifyStatus(prev => ({ ...prev, [notifyKey]: '' })), 3000);
    }
  };

  const toggleSelection = async (preceptorName: string, day: string, time: string) => {
    const key = `${preceptorName}|${day}|${time}`;
    const newSelections = { ...selections, [key]: !selections[key] };
    setSelections(newSelections);
    try {
      await api(`/cohorts/${currentCohortId}/slot-assignments`, {
        method: 'PUT',
        body: JSON.stringify({ selections: newSelections, assignments: slotAssignments }),
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateSlotAssignment = async (day: string, time: string, field: string, value: string) => {
    const slotKey = `${day}|${time}`;
    const updated = { ...slotAssignments, [slotKey]: { ...(slotAssignments[slotKey] || {}), [field]: value } };
    setSlotAssignments(updated);
    try {
      await api(`/cohorts/${currentCohortId}/slot-assignments`, {
        method: 'PUT',
        body: JSON.stringify({ assignments: updated, selections }),
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveStartup = async (startupData: any) => {
    try {
      if (startupData.id) {
        const { id, ...rest } = startupData;
        await api(`/cohorts/${currentCohortId}/startups/${id}`, {
          method: 'PUT',
          body: JSON.stringify(rest),
        });
      } else {
        await api(`/cohorts/${currentCohortId}/startups`, {
          method: 'POST',
          body: JSON.stringify(startupData),
        });
      }
      setStartupModal(null);
      loadStartups();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteStartup = async (startupId: number) => {
    if (!confirm('Delete this startup?')) return;
    try {
      await api(`/cohorts/${currentCohortId}/startups/${startupId}`, { method: 'DELETE' });
      loadStartups();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateICS = (preceptorName: string, day: string, time: string) => {
    const slotKey = `${day}|${time}`;
    const assignment = slotAssignments[slotKey] || {};
    const startup = startups.find((s: any) => s.id === assignment.startupId);
    const timeIndex = SURVEY_TIMES.indexOf(time);
    const startHour = timeIndex + 9;

    if (!currentCohortSettings?.weekStartDate) return;
    const [year, month, dayNum] = currentCohortSettings.weekStartDate.split('-').map(Number);
    const dayIndex = surveyDays.indexOf(day);
    const startDate = new Date(Date.UTC(year, month - 1, dayNum + dayIndex, startHour, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, dayNum + dayIndex, startHour + 1, 0, 0));

    generateICS({
      title: `MBC Meeting: ${preceptorName}${startup ? ` & ${startup.name}` : ''}`,
      description: `Preceptor-Startup Matching Meeting${startup ? `\nStartup: ${startup.name}` : ''}${assignment.zoom ? `\nZoom: ${assignment.zoom}` : ''}`,
      startTime: startDate,
      endTime: endDate,
      location: assignment.zoom || '',
    });
  };

  if (!currentCohortSettings) return <div className="text-center py-20 text-slate-400">Select a cohort first.</div>;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Admin Dashboard</h1>
          <p className="text-slate-400">{currentCohortSettings.name} — {submissions.length} preceptors submitted</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => { setAdminInviteEmail(''); setAdminInviteModal(true); }}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors">
            {inviteCopied ? <><Check className="w-4 h-4 mr-2" /> Link Copied!</> : <><UserPlus className="w-4 h-4 mr-2" /> Invite Preceptor</>}
          </button>
          <button onClick={() => setShowStartupManager(!showStartupManager)}
            className="flex items-center px-4 py-2 bg-slate-700 text-white text-sm font-bold rounded-lg hover:bg-slate-600 transition-colors">
            <Building className="w-4 h-4 mr-2" /> Manage Startups
          </button>
        </div>
      </div>

      {showStartupManager && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold flex items-center"><Building className="w-5 h-5 mr-2 text-indigo-400" /> {currentCohortSettings.name} Startups</h3>
            <div className="flex space-x-2">
              <button onClick={() => setStartupModal('create')} className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-500 transition-colors">
                <Plus className="w-4 h-4 mr-1" /> Add Startup
              </button>
              <button onClick={() => setShowStartupManager(false)} className="text-slate-400 hover:text-white p-2"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {startups.map((s: any) => (
              <div key={s.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-white font-bold">{s.name}</h4>
                  <div className="flex space-x-1">
                    <button onClick={() => setStartupModal(s)} className="text-slate-400 hover:text-indigo-400 p-1"><Settings className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteStartup(s.id)} className="text-slate-400 hover:text-red-400 p-1"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-indigo-300 text-xs font-semibold mb-1">{s.industry}{s.stage ? ` • ${s.stage}` : ''}</p>
                <p className="text-slate-400 text-xs line-clamp-2">{s.description}</p>
                {s.founders && <p className="text-slate-500 text-xs mt-1">Founders: {s.founders}</p>}
              </div>
            ))}
            {startups.length === 0 && <p className="col-span-full text-slate-500 italic text-sm">No startups added yet. Click "Add Startup" to create profiles.</p>}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="text-xs text-slate-300 uppercase bg-slate-800 sticky top-0 z-30 shadow-md">
              <tr>
                <th className="p-4 bg-slate-800 border-r border-b border-slate-700 sticky left-0 z-40 w-64">Preceptor Name</th>
                {surveyDays.map((day: string) => (
                  <th key={day} colSpan={SURVEY_TIMES.length} className="p-2 text-center border-b border-r border-slate-700 font-bold text-white bg-slate-800/90">{day}</th>
                ))}
              </tr>
              <tr>
                <th className="p-3 bg-slate-800 border-r border-b border-slate-700 sticky left-0 z-40 w-64"></th>
                {surveyDays.map((day: string) => SURVEY_TIMES.map((time: string, idx: number) => {
                  const slotKey = `${day}|${time}`;
                  const assignment = slotAssignments[slotKey] || {};
                  const assignedStartup = startups.find((s: any) => String(s.id) === String(assignment.startupId));
                  return (
                    <th key={`${day}-${time}`} className={`p-3 text-center border-b border-slate-700 font-semibold whitespace-nowrap min-w-[150px] ${idx === SURVEY_TIMES.length - 1 ? 'border-r' : ''}`}>
                      <div className="flex flex-col space-y-2">
                        <span className="text-indigo-400">{time}</span>
                        <select value={assignment.startupId || ''} onChange={e => updateSlotAssignment(day, time, 'startupId', e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-white outline-none focus:ring-1 focus:ring-indigo-500">
                          <option value="">Select Startup</option>
                          {startups.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {assignedStartup && (
                          <button onClick={() => setProfileCard(assignedStartup)} className="text-[10px] text-indigo-300 hover:text-indigo-100 underline truncate max-w-full">
                            View Profile
                          </button>
                        )}
                        <button onClick={() => setZoomModal({ day, time, link: assignment.zoom || '' })}
                          className={`flex items-center justify-center py-1 rounded text-[10px] transition-colors ${assignment.zoom ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50' : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-600'}`}>
                          <LinkIcon className="w-3 h-3 mr-1" /> {assignment.zoom ? 'Link Added' : 'Add Zoom'}
                        </button>
                      </div>
                    </th>
                  );
                }))}
              </tr>
            </thead>
            <tbody className="bg-slate-800/50">
              {submissions.map((sub: any) => (
                <tr key={sub.id} className="border-b border-slate-800 hover:bg-slate-700/20 transition-colors">
                  <td className="p-4 font-semibold text-white border-r border-slate-700 sticky left-0 z-20 bg-slate-800/50 backdrop-blur-sm">{sub.name}</td>
                  {surveyDays.map((day: string) => SURVEY_TIMES.map((time: string, idx: number) => {
                    const isAvailable = (sub.availability as any)?.[day]?.[time];
                    const isSelected = selections[`${sub.name}|${day}|${time}`];
                    return (
                      <td key={`${day}-${time}`} onClick={() => isAvailable && toggleSelection(sub.name, day, time)}
                        className={`p-1.5 text-center transition-colors ${idx === SURVEY_TIMES.length - 1 ? 'border-r' : ''} border-slate-700 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <div className={`w-full h-10 rounded-md flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 text-white' : isAvailable ? 'bg-slate-700/50 hover:bg-slate-600/50 text-emerald-400' : 'bg-slate-800/20'}`}>
                          {isSelected ? (() => {
                            const slotKey2 = `${day}|${time}`;
                            const assign2 = slotAssignments[slotKey2] || {};
                            const hasStartup2 = startups.some((s: any) => String(s.id) === String(assign2.startupId));
                            const nKey = `${sub.name}|${day}|${time}`;
                            const nStatus = notifyStatus[nKey];
                            return (
                              <div className="flex items-center space-x-1">
                                <Star className="w-3 h-3" fill="currentColor" />
                                <button onClick={e => { e.stopPropagation(); handleGenerateICS(sub.name, day, time); }} className="text-white hover:text-indigo-300" title="Download calendar invite">
                                  <CalendarPlus className="w-4 h-4" />
                                </button>
                                {hasStartup2 && emailConfigured && (
                                  <button onClick={e => { e.stopPropagation(); handleNotifyPreceptor(sub.name, day, time); }}
                                    disabled={nStatus === 'sending'}
                                    className={`transition-colors ${nStatus === 'sent' ? 'text-emerald-300' : nStatus === 'error' ? 'text-red-300' : 'text-white hover:text-amber-300'}`}
                                    title={nStatus === 'sent' ? 'Notification sent!' : nStatus === 'error' ? 'Failed to send' : 'Email notification to preceptor'}>
                                    <Mail className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })() : isAvailable ? <Check className="w-5 h-5" strokeWidth={3} /> : <span className="text-slate-600">-</span>}
                        </div>
                      </td>
                    );
                  }))}
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr><td colSpan={surveyDays.length * SURVEY_TIMES.length + 1} className="p-8 text-center text-slate-500 italic">No preceptors have submitted availability yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {zoomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center"><LinkIcon className="w-6 h-6 mr-2 text-indigo-400" /> Add Zoom Link</h3>
            <p className="text-slate-400 text-sm mb-6">For {zoomModal.day} at {zoomModal.time}</p>
            <input type="url" autoFocus value={zoomModal.link} onChange={(e: any) => setZoomModal({ ...zoomModal, link: e.target.value })}
              placeholder="https://zoom.us/j/..." className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 mb-6" />
            <div className="flex space-x-3">
              <button onClick={() => setZoomModal(null)} className="flex-1 px-4 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={() => { updateSlotAssignment(zoomModal.day, zoomModal.time, 'zoom', zoomModal.link); setZoomModal(null); }}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors">Save Link</button>
            </div>
          </div>
        </div>
      )}

      {startupModal && (
        <StartupFormModal
          startup={startupModal === 'create' ? null : startupModal}
          onSave={handleSaveStartup}
          onClose={() => setStartupModal(null)}
        />
      )}

      {profileCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setProfileCard(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e: any) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center"><Building className="w-6 h-6" /></div>
              <button onClick={() => setProfileCard(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{profileCard.name}</h3>
            <div className="flex space-x-2 mb-4">
              {profileCard.industry && <span className="px-2 py-0.5 bg-indigo-600/20 text-indigo-300 rounded-full text-xs font-bold">{profileCard.industry}</span>}
              {profileCard.stage && <span className="px-2 py-0.5 bg-emerald-600/20 text-emerald-300 rounded-full text-xs font-bold">{profileCard.stage}</span>}
            </div>
            {profileCard.founders && <p className="text-slate-300 text-sm mb-2"><span className="font-bold text-slate-200">Founders:</span> {profileCard.founders}</p>}
            {profileCard.description && <p className="text-slate-400 text-sm mb-4">{profileCard.description}</p>}
          </div>
        </div>
      )}

      {adminInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center">
              <UserPlus className="w-6 h-6 mr-2 text-emerald-400" /> Invite Preceptor to {currentCohortSettings?.name}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              The invite link will be copied to your clipboard. Optionally enter an email to send it directly.
            </p>
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-1">Recipient Email (optional)</label>
              <input type="email" value={adminInviteEmail} onChange={e => setAdminInviteEmail(e.target.value)}
                placeholder="preceptor@example.com"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500" />
              {!emailConfigured && adminInviteEmail.trim() && (
                <p className="text-amber-400 text-xs mt-1">SMTP not configured. Email won't be sent, but the link will still be copied.</p>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={() => setAdminInviteModal(false)} className="flex-1 px-4 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={handleInvitePreceptor} disabled={adminInviteSending}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center">
                {adminInviteSending ? 'Creating...' : <><Mail className="w-4 h-4 mr-2" /> {adminInviteEmail.trim() ? 'Send & Copy Link' : 'Copy Link'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StartupFormModal({ startup, onSave, onClose }: { startup: any; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: startup?.name || '',
    founders: startup?.founders || '',
    industry: startup?.industry || '',
    stage: startup?.stage || '',
    description: startup?.description || '',
  });

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, ...(startup?.id ? { id: startup.id } : {}) });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">{startup ? 'Edit Startup' : 'Add Startup Profile'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-300 mb-1">Company Name <span className="text-red-400">*</span></label>
              <input type="text" required value={form.name} onChange={e => handleChange('name', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. AgroTech Solutions" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-300 mb-1">Founder Name(s)</label>
              <input type="text" value={form.founders} onChange={e => handleChange('founders', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Jane Doe, John Smith" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">Industry</label>
              <input type="text" value={form.industry} onChange={e => handleChange('industry', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. FinTech" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">Stage</label>
              <select value={form.stage} onChange={e => handleChange('stage', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select stage</option>
                <option value="Idea">Idea</option>
                <option value="MVP">MVP</option>
                <option value="Revenue">Revenue</option>
                <option value="Growth">Growth</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-300 mb-1">One-line Description</label>
              <input type="text" value={form.description} onChange={e => handleChange('description', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Connecting smallholder farmers to premium markets via mobile." />
            </div>
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors">Save Startup</button>
          </div>
        </form>
      </div>
    </div>
  );
}
