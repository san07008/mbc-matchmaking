import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import {
  Download, AlertCircle, Calendar, Check, Users,
  Send, User, Clock, ArrowLeft, ShieldAlert, Star, CalendarPlus, Link as LinkIcon, Plus, X, Building,
  GraduationCap, Briefcase, Settings, Globe, LogOut, Shield, Eye, EyeOff, Copy, Mail, UserPlus, Trash2, Printer,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { WORLD_MAP_DOTS, WORLD_MAP_VB } from './worldMapData';

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
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PreceptorLink//EN',
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

function DottedWorldMap({ className = '' }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false" viewBox={WORLD_MAP_VB} fill="none" xmlns="http://www.w3.org/2000/svg">
      {WORLD_MAP_DOTS.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.2} fill="#D5D0C8" />
      ))}
    </svg>
  );
}

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
  { value: 'Africa/Accra', label: 'Accra (Africa/Accra)' },
  { value: 'Europe/London', label: 'London (Europe/London)' },
  { value: 'Europe/Paris', label: 'Paris (Europe/Paris)' },
  { value: 'Europe/Luxembourg', label: 'Luxembourg (Europe/Luxembourg)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (Europe/Amsterdam)' },
  { value: 'Europe/Rome', label: 'Rome (Europe/Rome)' },
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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <div className="flex flex-col items-center space-y-4">
          <Calendar className="w-12 h-12 text-[#E8772E] animate-pulse" />
          <p className="text-[#6B6B6B] font-medium">Connecting to Scheduling Service...</p>
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
      {view === 'login' ? (
        <LoginPage />
      ) : (
      <div className="min-h-screen bg-[#F5F4F0] text-[#6B6B6B] font-sans pb-20">
        <header className="bg-[#F5F4F0] border-b border-[#E8E4DF] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-black tracking-tight text-[#1A1A1A]">PreceptorLink</h1>
              {currentCohortSettings?.timezone && (
                <span className="ml-4 px-3 py-1 bg-white border border-[#E8E4DF] text-xs font-bold text-[#1A1A1A] rounded-lg">
                  {currentCohortSettings.name} ({currentCohortSettings.timezone.split('/')[1]?.replace('_', ' ')})
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {view !== 'cohortSelection' && (
                <button
                  onClick={() => { setView('cohortSelection'); setCurrentCohortId(null); setError(null); }}
                  className="text-sm flex items-center text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors font-medium"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Cohorts
                </button>
              )}
              <div className="flex items-center space-x-2 pl-3 border-l border-[#E8E4DF]">
                <span className="text-xs text-[#A3A3A3] hidden sm:block">{user?.email}</span>
                {(userRole === 'superadmin' || userRole === 'admin') && (
                  <span className={`px-2 py-0.5 text-xs font-bold rounded ${userRole === 'superadmin' ? 'bg-[#E5534B] text-white' : 'bg-[#E8772E] text-white'}`}>
                    {userRole === 'superadmin' ? 'Super Admin' : 'Admin'}
                  </span>
                )}
                <button onClick={handleSignOut} className="p-2 text-[#A3A3A3] hover:text-[#1A1A1A] transition-colors" title="Sign Out">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {error && (
            <div className="mb-6 p-4 bg-[#E5534B]/10 border border-[#E5534B]/30 text-[#E5534B] flex items-center">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}
          {view === 'cohortSelection' && <CohortSelectionPage />}
          {view === 'roleSelection' && <RoleSelectionPage />}
          {view === 'survey' && <SurveyView />}
          {view === 'admin' && <AdminView />}
          {view === 'superadmin' && <SuperAdminView />}
        </main>
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 10px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #D5D0C8; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #A3A3A3; }
          input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; }
        `}} />
      </div>
      )}
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const loginRef = React.useRef<HTMLDivElement>(null);
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
      <div className="min-h-[85vh] bg-[#F5F4F0] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#E8772E] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#6B6B6B] text-sm font-medium">Verifying invite...</p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-[85vh] bg-[#F5F4F0] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-xl p-10 shadow-sm">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6">Invite Link Issue</h1>
          <div className="border-t border-[#E8E4DF] pt-6 space-y-3">
            {inviteError.type === 'already_used' ? (
              <>
                <p className="text-[#1A1A1A]">This invite link has already been used.</p>
                <p className="text-[#6B6B6B] text-sm leading-relaxed">Each invite link can only be used once. If you already created your account, sign in below. Otherwise, ask your administrator for a new link.</p>
              </>
            ) : inviteError.type === 'not_found' ? (
              <>
                <p className="text-[#1A1A1A]">This invite link is not valid.</p>
                <p className="text-[#6B6B6B] text-sm leading-relaxed">The link may have been deleted or is incorrect. Please check the link or ask your administrator for a new one.</p>
              </>
            ) : (
              <>
                <p className="text-[#1A1A1A]">Something went wrong verifying your invite.</p>
                <p className="text-[#6B6B6B] text-sm leading-relaxed">Please try again or ask your administrator for a new invite link.</p>
              </>
            )}
          </div>
          <button onClick={handleDismissInviteError}
            className="w-full mt-8 py-3 bg-[#E8772E] text-white font-semibold text-sm rounded-lg hover:bg-[#D4691E] transition-colors">
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  React.useEffect(() => {
    if (isInvite && loginRef.current) {
      setTimeout(() => loginRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, [isInvite]);

  const faqItems = [
    { q: 'What is PreceptorLink?', a: 'PreceptorLink is a scheduling platform that connects preceptors with startups by streamlining the availability and meeting scheduling process.' },
    { q: 'How do I submit my availability?', a: 'After logging in, select your cohort and choose "I am a Preceptor." You\'ll see a weekly grid of time slots — click on the times you\'re available, then click "Submit Availability." You can update your selections at any time.' },
    { q: 'Can I change my availability after submitting?', a: 'Yes. Log back in and go to the availability grid. Your previous selections will still be there. Update any slots and re-submit to save your changes.' },
    { q: 'How will I know when my meeting is scheduled?', a: 'Once an admin assigns you to a meeting, you\'ll receive an email notification with the startup name, day, time, Zoom link, and a calendar invite (.ics file) you can add directly to your calendar.' },
    { q: 'How do admins invite preceptors?', a: 'Admins can generate a unique invite link from the dashboard and share it via email or message. The platform can also send the invite directly via email if SMTP is configured.' },
    { q: 'Can admins export the schedule?', a: 'Yes. The admin dashboard includes CSV export and a printable schedule view for all assignments.' },
    { q: 'Who do I contact if I have issues?', a: 'Reach out to your program administrator. They manage the platform and can help with any account or scheduling questions.' },
  ];

  return (
    <div className="bg-[#F5F4F0] text-[#1A1A1A] min-h-screen font-sans">
      <nav className="border-b border-[#E8E4DF]/60">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <span className="text-lg font-bold tracking-tight text-[#1A1A1A]">PreceptorLink</span>
          <button onClick={() => loginRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="px-5 py-2.5 bg-[#E8772E] text-white text-sm font-semibold rounded-lg hover:bg-[#D4691E] transition-colors">
            Sign In
          </button>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <DottedWorldMap className="hidden md:block absolute z-0 top-1/2 right-0 -translate-y-1/2 translate-x-[10%] w-[65%] max-w-[800px] opacity-40 pointer-events-none select-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-[#1A1A1A] mb-6">
            Connecting Preceptors{' '}
            <br className="hidden sm:block" />
            with Startups<span className="inline-block w-2.5 h-10 sm:h-12 lg:h-14 bg-[#E8772E] ml-1.5 align-bottom rounded-sm" />
          </h1>
          <p className="text-lg text-[#6B6B6B] max-w-xl leading-relaxed">
            Streamline your preceptor-startup meeting scheduling. Submit availability, build schedules, and get notified — all in one place.
          </p>
          <div className="mt-10">
            <button onClick={() => loginRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 bg-[#E8772E] text-white font-semibold rounded-lg hover:bg-[#D4691E] transition-colors text-sm">
              Get Started
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 md:pb-32">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { num: '01', title: 'Submit Availability', desc: 'Preceptors mark open time slots on a weekly grid. Select the hours that work and submit.' },
            { num: '02', title: 'Build the Schedule', desc: 'Admins review availability, select preceptors for each slot, and assign startups.' },
            { num: '03', title: 'Get Notified', desc: 'Email notifications with meeting details and calendar invites. Export or print the full schedule.' },
          ].map((step, i) => (
            <div key={i} className="bg-white rounded-xl p-8 shadow-sm">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-[#E8772E]/10 text-[#E8772E] font-bold text-sm rounded-lg mb-5">
                {step.num}
              </span>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{step.title}</h3>
              <p className="text-[#6B6B6B] text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 md:pb-32">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-10">Frequently Asked Questions</h2>
          <div className="divide-y divide-[#E8E4DF]">
            {faqItems.map((item, i) => (
              <div key={i}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left">
                  <span className="font-semibold text-[15px] text-[#1A1A1A] pr-4">{item.q}</span>
                  <span className={`text-xl text-[#A3A3A3] flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="pb-5 -mt-1">
                    <p className="text-[#6B6B6B] text-sm leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={loginRef} className="max-w-6xl mx-auto px-6 pb-24 md:pb-32">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3">
              {isInvite ? 'Create Your Account' : 'Sign In'}
            </h2>
            {isInvite && (
              <div className="mt-4 inline-flex items-center px-4 py-2 bg-[#2D8A56]/10 text-[#2D8A56] text-sm font-semibold rounded-lg">
                {pendingInvite.role === 'admin' ? 'Admin' : 'Preceptor'}
                {pendingInvite.cohortName ? ` — ${pendingInvite.cohortName}` : ''}
              </div>
            )}
            {!isInvite && (
              <p className="text-[#6B6B6B] mt-1">Access your account to manage schedules and availability.</p>
            )}
          </div>
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <form onSubmit={handleEmailAuth} className="space-y-5">
              {isInvite && (
                <div>
                  <label htmlFor="login-name" className="block text-sm font-medium text-[#6B6B6B] mb-2">Full Name</label>
                  <input id="login-name" type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)}
                    className="w-full border-b-2 border-[#E8E4DF] bg-transparent py-3 text-[#1A1A1A] text-base outline-none focus:border-[#E8772E] transition-colors placeholder:text-[#A3A3A3]"
                    placeholder="Dr. Jane Smith" />
                </div>
              )}
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-[#6B6B6B] mb-2">Email</label>
                <input id="login-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border-b-2 border-[#E8E4DF] bg-transparent py-3 text-[#1A1A1A] text-base outline-none focus:border-[#E8772E] transition-colors placeholder:text-[#A3A3A3]"
                  placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-[#6B6B6B] mb-2">{isInvite ? 'Create Password' : 'Password'}</label>
                <div className="relative">
                  <input id="login-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                    minLength={isInvite ? 6 : undefined}
                    className="w-full border-b-2 border-[#E8E4DF] bg-transparent py-3 pr-12 text-[#1A1A1A] text-base outline-none focus:border-[#E8772E] transition-colors placeholder:text-[#A3A3A3]"
                    placeholder={isInvite ? 'Minimum 6 characters' : '••••••••'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-0 top-3 text-[#A3A3A3] hover:text-[#6B6B6B] transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full mt-2 py-3.5 bg-[#E8772E] text-white font-semibold text-sm rounded-lg hover:bg-[#D4691E] transition-colors disabled:opacity-50">
                {loading ? (isInvite ? 'Creating account...' : 'Please wait...') : (isInvite ? 'Create Account' : 'Sign In')}
              </button>
            </form>
            <p className="text-center text-[#A3A3A3] text-sm mt-6">
              {isInvite ? (
                <>Already have an account?{' '}
                  <button onClick={() => { setPendingInvite(null); window.history.replaceState({}, '', window.location.pathname); }}
                    className="text-[#E8772E] hover:underline font-semibold">Sign in instead</button>
                </>
              ) : (
                <>Need an account? Ask your admin for an invite link.</>
              )}
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E8E4DF]/60">
        <div className="max-w-6xl mx-auto px-6 py-8 flex justify-center items-center">
          <span className="text-sm font-semibold text-[#A3A3A3]">PreceptorLink</span>
        </div>
      </footer>
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
    <div className="max-w-5xl mx-auto mt-16 text-center">
      <div className="bg-white rounded-xl shadow-sm p-10 mb-12">
        <h1 className="text-5xl font-black text-[#1A1A1A] mb-4 leading-tight tracking-tight">Select Your Cohort</h1>
        <p className="text-[#6B6B6B] text-lg max-w-3xl mx-auto leading-relaxed">
          Choose the specific program you are associated with.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cohorts.length === 0 ? (
          <div className="col-span-full text-[#A3A3A3] text-lg">
            No cohorts available. {userRole === 'superadmin' ? 'Create one from the Super Admin panel below.' : 'Please contact an administrator.'}
          </div>
        ) : (
          cohorts.map((cohort: any) => (
            <div key={cohort.id} onClick={() => handleSelectCohort(cohort.id)}
              className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-8 text-left group cursor-pointer hover:border-[#E8772E] transition-colors">
              <div className="w-12 h-12 bg-[#E8772E] text-white flex items-center justify-center rounded-lg mb-4">
                <Building className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-[#1A1A1A] mb-2">{cohort.name}</h2>
              <p className="text-[#6B6B6B]">Time Zone: {cohort.timezone?.split('/')[1]?.replace('_', ' ')}</p>
              {cohort.weekStartDate && (
                <p className="text-[#A3A3A3] text-sm mt-1">Week starts: {formatSafeDate(cohort.weekStartDate, 'MMM d, yyyy', cohort.timezone)}</p>
              )}
            </div>
          ))
        )}
      </div>
      <div className="mt-12 flex justify-center gap-4 flex-wrap">
        {(userRole === 'superadmin' || userRole === 'admin') && (
          <button onClick={() => { setView('admin'); setError(null); }} className="text-[#E8772E] hover:underline font-bold transition-colors">
            Access Admin Dashboard
          </button>
        )}
        {userRole === 'superadmin' && (
          <button onClick={() => { setView('superadmin'); setError(null); }} className="text-[#E5534B] hover:underline font-bold transition-colors flex items-center">
            <Shield className="w-4 h-4 mr-1.5" /> Super Admin Panel
          </button>
        )}
      </div>
    </div>
  );
}

function RoleSelectionPage() {
  const { setView, currentCohortSettings, userRole } = useContext(AppContext);

  if (!currentCohortSettings) return <div className="text-center py-20 text-[#A3A3A3]">Loading cohort details...</div>;

  return (
    <div className="max-w-5xl mx-auto mt-16 text-center">
      <div className="bg-white rounded-xl shadow-sm p-10 mb-12">
        <h1 className="text-5xl font-black text-[#1A1A1A] mb-4 tracking-tight">{currentCohortSettings.name}</h1>
        <h2 className="text-2xl font-bold text-[#E8772E] mb-6">Preceptor & Startup Matchmaking</h2>
        <p className="text-[#6B6B6B] text-lg max-w-3xl mx-auto">
          Welcome to {currentCohortSettings.name}. Please select your role to proceed.
        </p>
      </div>
      <div className={`grid grid-cols-1 ${(userRole === 'superadmin' || userRole === 'admin') ? 'md:grid-cols-2' : 'max-w-md mx-auto'} gap-6`}>
        <div onClick={() => setView('survey')}
          className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-10 text-left group cursor-pointer hover:border-[#E8772E] transition-colors">
          <div className="w-12 h-12 bg-[#E8772E] text-white flex items-center justify-center rounded-lg mb-6">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-[#1A1A1A] mb-2">I am a Preceptor</h2>
          <p className="text-[#6B6B6B]">Submit or update your availability to mentor startups.</p>
        </div>
        {(userRole === 'superadmin' || userRole === 'admin') && (
          <div onClick={() => setView('admin')}
            className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-10 text-left group cursor-pointer hover:border-[#2D8A56] transition-colors">
            <div className="w-12 h-12 bg-[#2D8A56] text-white flex items-center justify-center rounded-lg mb-6">
              <Briefcase className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-[#1A1A1A] mb-2">I am an Administrator</h2>
            <p className="text-[#6B6B6B]">Manage startup assignments, preceptor schedules, and generate meeting invites.</p>
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
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="bg-white rounded-xl shadow-sm p-10">
        <div className="flex items-center space-x-4 mb-2">
          <Shield className="w-10 h-10 text-[#E5534B]" />
          <div>
            <h1 className="text-4xl font-black text-[#1A1A1A] tracking-tight">Super Admin Panel</h1>
            <p className="text-[#6B6B6B]">Manage users, roles, and cohorts</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-8">
        <h2 className="text-2xl font-black text-[#1A1A1A] mb-6 flex items-center">
          <Building className="w-6 h-6 mr-3 text-[#E8772E]" /> Cohort Management
        </h2>
        <form onSubmit={handleCreateCohort} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <input type="text" value={newCohortName} onChange={e => setNewCohortName(e.target.value)}
            placeholder="Cohort Name"
            className="border border-[#E8E4DF] p-3 text-[#1A1A1A] outline-none focus:border-[#E8772E] transition-colors" />
          <select value={newCohortTimezone} onChange={e => setNewCohortTimezone(e.target.value)}
            className="border border-[#E8E4DF] p-3 text-[#1A1A1A] outline-none focus:border-[#E8772E]">
            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
          <input type="date" value={newCohortStartDate} onChange={e => setNewCohortStartDate(e.target.value)}
            className="border border-[#E8E4DF] p-3 text-[#1A1A1A] outline-none focus:border-[#E8772E]" />
          <button type="submit" disabled={loading}
            className="bg-[#E8772E] text-white font-bold hover:bg-[#D4691E] transition-colors disabled:opacity-50 flex items-center justify-center">
            <Plus className="w-4 h-4 mr-2" /> Create Cohort
          </button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cohorts.map((c: any) => (
            <div key={c.id} className="border border-[#E8E4DF] p-4 flex justify-between items-start">
              <div>
                <h3 className="text-[#1A1A1A] font-bold">{c.name}</h3>
                <p className="text-[#A3A3A3] text-xs">{c.timezone}</p>
                {c.weekStartDate && <p className="text-[#A3A3A3] text-xs">Start: {formatSafeDate(c.weekStartDate, 'MMM d, yyyy', c.timezone)}</p>}
              </div>
              <button onClick={() => handleDeleteCohort(c.id)} className="text-[#A3A3A3] hover:text-[#E5534B] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-8">
        <h2 className="text-2xl font-black text-[#1A1A1A] mb-6 flex items-center">
          <Users className="w-6 h-6 mr-3 text-[#E8772E]" /> User Management
        </h2>
        <input type="text" value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
          placeholder="Search by email..."
          className="w-full border border-[#E8E4DF] p-3 text-[#1A1A1A] outline-none focus:border-[#E8772E] mb-6" />
        <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {filteredUsers.map((u: any) => (
            <div key={u.id} className="border border-[#E8E4DF] p-4 flex items-center justify-between">
              <div>
                <p className="text-[#1A1A1A] font-semibold">{u.email}</p>
                <p className="text-[#A3A3A3] text-xs">{u.displayName || 'No display name'}</p>
              </div>
              <select value={u.role || 'preceptor'} onChange={e => handleRoleChange(u.id, e.target.value)}
                className="border border-[#E8E4DF] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#E8772E]">
                <option value="preceptor">Preceptor</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-8">
        <h2 className="text-2xl font-black text-[#1A1A1A] mb-6 flex items-center">
          <Mail className="w-6 h-6 mr-3 text-[#E8772E]" /> Invite Management
        </h2>
        <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => openInviteModal('admin')}
            className="flex items-center px-4 py-2 bg-[#E8772E] text-white text-sm font-bold hover:bg-[#D4691E] transition-colors">
            <UserPlus className="w-4 h-4 mr-2" /> Invite Admin
          </button>
          {cohorts.map((c: any) => (
            <button key={c.id} onClick={() => openInviteModal('preceptor', c.id, c.name)}
              className="flex items-center px-4 py-2 bg-[#2D8A56] text-white text-sm font-bold hover:bg-[#246d45] transition-colors">
              <UserPlus className="w-4 h-4 mr-2" /> Invite Preceptor to {c.name}
            </button>
          ))}
        </div>
        <p className="text-[#6B6B6B] text-sm mb-4">
          Click a button above to generate a one-time invite link. Optionally enter an email to send the invite directly.
        </p>
        <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
          {invites.length === 0 && <p className="text-[#A3A3A3] italic text-sm">No invites generated yet.</p>}
          {invites.map((inv: any) => (
            <div key={inv.id} className="border border-[#E8E4DF] p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 text-xs font-bold ${inv.role === 'admin' ? 'bg-[#E8772E] text-white' : 'bg-[#2D8A56] text-white'}`}>
                    {inv.role}
                  </span>
                  {inv.cohortName && <span className="text-[#6B6B6B] text-xs">{inv.cohortName}</span>}
                  {inv.used ? (
                    <span className="px-2 py-0.5 text-xs font-bold bg-[#E8E4DF] text-[#6B6B6B]">Used by {inv.usedBy}</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-bold bg-[#F0A500] text-[#1A1A1A]">Pending</span>
                  )}
                </div>
                <p className="text-[#A3A3A3] text-xs mt-1 truncate font-mono">Token: {inv.token}</p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {!inv.used && (
                  <button onClick={() => copyInviteLink(inv.token)}
                    className="flex items-center px-3 py-1.5 bg-[#F5F4F0] border border-[#E8E4DF] text-[#1A1A1A] text-xs font-bold hover:bg-[#E8E4DF] transition-colors">
                    {copiedId === inv.token ? <><Check className="w-3 h-3 mr-1" /> Copied!</> : <><Copy className="w-3 h-3 mr-1" /> Copy Link</>}
                  </button>
                )}
                <button onClick={() => handleDeleteInvite(inv.id)} className="text-[#A3A3A3] hover:text-[#E5534B] p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {inviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-8 w-full max-w-md">
            <h3 className="text-xl font-black text-[#1A1A1A] mb-2 flex items-center">
              <UserPlus className="w-6 h-6 mr-2 text-[#E8772E]" />
              {inviteModal.role === 'admin' ? 'Invite Admin' : `Invite Preceptor${inviteModal.cohortName ? ` to ${inviteModal.cohortName}` : ''}`}
            </h3>
            <p className="text-[#6B6B6B] text-sm mb-6">
              The invite link will be copied to your clipboard. Optionally enter an email to send it directly.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">Recipient Email (optional)</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="person@example.com"
                  className="w-full border-b-2 border-[#E8E4DF] bg-transparent py-3 text-[#1A1A1A] outline-none focus:border-[#E8772E] transition-colors placeholder:text-[#A3A3A3]" />
                {!emailConfigured && inviteEmail.trim() && (
                  <p className="text-[#E5534B] text-xs mt-1">SMTP not configured. Email won't be sent, but the link will still be copied.</p>
                )}
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={() => setInviteModal(null)} className="flex-1 px-4 py-3 border border-[#E8E4DF] text-[#1A1A1A] font-bold hover:bg-[#F5F4F0]/60 transition-colors">Cancel</button>
              <button onClick={handleCreateInvite} disabled={inviteSending}
                className="flex-1 px-4 py-3 bg-[#E8772E] text-white font-bold hover:bg-[#D4691E] transition-colors disabled:opacity-50 flex items-center justify-center">
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
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (surveyDays.length > 0) {
      setExpandedDays(prev => {
        const hasAnyOpen = Object.values(prev).some(Boolean);
        if (!hasAnyOpen) return { ...prev, [surveyDays[0]]: true };
        return prev;
      });
    }
  }, [surveyDays]);

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

  if (!currentCohortSettings) return <div className="text-center py-20 text-[#A3A3A3]">Loading cohort...</div>;

  const availableCount = Object.values(availability).reduce((total, daySlots) =>
    total + Object.values(daySlots).filter(Boolean).length, 0
  );

  const toggleDay = (day: string) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const getDaySelectedCount = (day: string) =>
    Object.values(availability[day] || {}).filter(Boolean).length;

  return (
    <div className="max-w-5xl mx-auto pb-24 lg:pb-0">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:p-8 mb-4 lg:mb-8">
        <div className="flex items-center space-x-3 lg:space-x-4 mb-4">
          <Calendar className="w-8 h-8 lg:w-10 lg:h-10 text-[#E8772E] flex-shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1A1A1A] tracking-tight">Preceptor Availability Survey</h1>
            <p className="text-[#6B6B6B] text-sm lg:text-base">{currentCohortSettings.name} — {currentCohortSettings.timezone?.split('/')[1]?.replace('_', ' ')}</p>
          </div>
        </div>
        {currentCohortSettings.weekStartDate && (
          <p className="text-[#A3A3A3] text-sm">
            Week of {formatSafeDate(currentCohortSettings.weekStartDate, 'MMM d, yyyy', currentCohortSettings.timezone)}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-4 sm:p-6 lg:p-8 mb-4 lg:mb-8">
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">Your Full Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Dr. Jane Smith"
            className="w-full max-w-md border-b-2 border-[#E8E4DF] bg-transparent py-3 text-[#1A1A1A] outline-none focus:border-[#E8772E] transition-colors placeholder:text-[#A3A3A3]" />
        </div>

        <p className="text-[#1A1A1A] font-bold mb-4">
          Select the time slots when you are available ({availableCount} selected):
        </p>

        <div className="hidden lg:block overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead>
              <tr>
                <th className="p-3 text-left text-[#6B6B6B] font-bold bg-[#F5F4F0]/60 sticky left-0 z-10 border border-[#E8E4DF]">Day</th>
                {SURVEY_TIMES.map((time: string) => (
                  <th key={time} className="p-3 text-center text-[#E8772E] font-bold bg-[#F5F4F0]/60 whitespace-nowrap border border-[#E8E4DF]">{time}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {surveyDays.map((day: string) => (
                <tr key={day}>
                  <td className="p-3 font-bold text-[#1A1A1A] bg-white sticky left-0 z-10 whitespace-nowrap border border-[#E8E4DF]">{day}</td>
                  {SURVEY_TIMES.map((time: string) => {
                    const isSelected = availability[day]?.[time];
                    return (
                      <td key={time} className="p-1.5 text-center border border-[#E8E4DF]">
                        <button onClick={() => toggleSlot(day, time)}
                          className={`w-full h-10 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-[#2D8A56] text-white' : 'bg-[#F5F4F0]/60 hover:bg-[#F5F4F0] text-[#A3A3A3]'
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

        <div className="lg:hidden space-y-3">
          {surveyDays.map((day: string, dayIdx: number) => {
            const isOpen = !!expandedDays[day];
            const selectedCount = getDaySelectedCount(day);
            const dayId = `accordion-day-${dayIdx}`;
            return (
              <div key={day} className="border border-[#E8E4DF] rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleDay(day)}
                  aria-expanded={isOpen}
                  aria-controls={dayId}
                  className="w-full flex items-center justify-between p-4 bg-[#F5F4F0]/60 hover:bg-[#F5F4F0] transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    {isOpen
                      ? <ChevronDown className="w-5 h-5 text-[#E8772E] flex-shrink-0" />
                      : <ChevronRight className="w-5 h-5 text-[#A3A3A3] flex-shrink-0" />
                    }
                    <span className="font-bold text-[#1A1A1A] text-sm sm:text-base">{day}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    selectedCount > 0
                      ? 'bg-[#2D8A56]/10 text-[#2D8A56]'
                      : 'bg-[#E8E4DF] text-[#A3A3A3]'
                  }`}>
                    {selectedCount} selected
                  </span>
                </button>
                {isOpen && (
                  <div
                    id={dayId}
                    role="region"
                    className="grid grid-cols-2 gap-2 p-4 animate-accordion-open"
                  >
                    {SURVEY_TIMES.map((time: string) => {
                      const isSelected = availability[day]?.[time];
                      return (
                        <button
                          key={time}
                          onClick={() => toggleSlot(day, time)}
                          className={`flex items-center justify-center space-x-2 rounded-lg font-bold text-sm transition-all min-h-[44px] ${
                            isSelected
                              ? 'bg-[#2D8A56] text-white shadow-sm'
                              : 'bg-[#F5F4F0] text-[#6B6B6B] hover:bg-[#E8E4DF]'
                          }`}
                        >
                          {isSelected
                            ? <Check className="w-4 h-4" strokeWidth={3} />
                            : <span className="text-[#A3A3A3]">—</span>
                          }
                          <span>{time}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-between">
        <div>
          {submitted && (
            <span className="text-[#2D8A56] font-bold flex items-center">
              <Check className="w-5 h-5 mr-2" /> Your availability has been saved
            </span>
          )}
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="px-8 py-3 bg-[#E8772E] text-white font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-[#D4691E] transition-colors disabled:opacity-50 flex items-center">
          <Send className="w-5 h-5 mr-2" />
          {loading ? 'Saving...' : existingSubmission ? 'Update Availability' : 'Submit Availability'}
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-[#E8E4DF] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex flex-col">
            <span className="text-xs text-[#6B6B6B]">
              {submitted ? 'Saved' : 'Total'}
            </span>
            <span className="text-sm font-bold text-[#1A1A1A]">{availableCount} hour{availableCount !== 1 ? 's' : ''} selected</span>
          </div>
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-3 bg-[#E8772E] text-white font-bold text-sm rounded-lg hover:bg-[#D4691E] transition-colors disabled:opacity-50 flex items-center">
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : existingSubmission ? 'Update' : 'Submit'}
          </button>
        </div>
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
      const tIdx = SURVEY_TIMES.indexOf(time);
      const dIdx = surveyDays.indexOf(day);
      await api(`/cohorts/${currentCohortId}/notify-assignment`, {
        method: 'POST',
        body: JSON.stringify({
          preceptorName,
          day,
          time,
          startupName: startup.name,
          zoomLink: assignment.zoom || '',
          cohortName: currentCohortSettings.name,
          weekStartDate: currentCohortSettings.weekStartDate || null,
          timeIndex: tIdx >= 0 ? tIdx : undefined,
          dayIndex: dIdx >= 0 ? dIdx : undefined,
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
    const isNowSelected = !selections[key];
    const newSelections = { ...selections, [key]: isNowSelected };
    setSelections(newSelections);
    try {
      await api(`/cohorts/${currentCohortId}/slot-assignments`, {
        method: 'PUT',
        body: JSON.stringify({ selections: newSelections, assignments: slotAssignments }),
      });
      if (isNowSelected && emailConfigured) {
        const slotKey = `${day}|${time}`;
        const assignment = slotAssignments[slotKey] || {};
        const startup = startups.find((s: any) => String(s.id) === String(assignment.startupId));
        if (startup) {
          handleNotifyPreceptor(preceptorName, day, time);
        }
      }
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
      if (field === 'startupId' && value && emailConfigured) {
        const startup = startups.find((s: any) => String(s.id) === String(value));
        if (startup) {
          submissions.forEach((sub: any) => {
            const selKey = `${sub.name}|${day}|${time}`;
            if (selections[selKey]) {
              handleNotifyPreceptor(sub.name, day, time);
            }
          });
        }
      }
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
      title: `PreceptorLink Meeting: ${preceptorName}${startup ? ` & ${startup.name}` : ''}`,
      description: `Preceptor-Startup Matching Meeting${startup ? `\nStartup: ${startup.name}` : ''}${assignment.zoom ? `\nZoom: ${assignment.zoom}` : ''}`,
      startTime: startDate,
      endTime: endDate,
      location: assignment.zoom || '',
    });
  };

  const handleDownloadCSV = () => {
    const sanitizeCSV = (val: string) => {
      if (!val) return '';
      let s = val;
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows: string[][] = [['Day', 'Time', 'Preceptor Name', 'Preceptor Email', 'Startup', 'Zoom Link']];
    surveyDays.forEach((day: string) => {
      SURVEY_TIMES.forEach((time: string) => {
        const slotKey = `${day}|${time}`;
        const assignment = slotAssignments[slotKey] || {};
        const assignedStartup = startups.find((s: any) => String(s.id) === String(assignment.startupId));
        const selectedPreceptors = submissions.filter((sub: any) => selections[`${sub.name}|${day}|${time}`]);
        if (selectedPreceptors.length === 0) {
          rows.push([sanitizeCSV(day), sanitizeCSV(time), '(Unassigned)', '', sanitizeCSV(assignedStartup?.name || '(No startup)'), sanitizeCSV(assignment.zoom || '')]);
        } else {
          selectedPreceptors.forEach((sub: any) => {
            rows.push([sanitizeCSV(day), sanitizeCSV(time), sanitizeCSV(sub.name), sanitizeCSV(sub.email || ''), sanitizeCSV(assignedStartup?.name || '(No startup)'), sanitizeCSV(assignment.zoom || '')]);
          });
        }
      });
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentCohortSettings.name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s/g, '_')}_Schedule.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintSchedule = () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const safeHref = (url: string) => {
      try { const u = new URL(url); return ['http:', 'https:'].includes(u.protocol) ? esc(url) : ''; } catch { return ''; }
    };
    const weekRange = currentCohortSettings.weekStartDate
      ? formatSafeDate(currentCohortSettings.weekStartDate, 'MMM d, yyyy', currentCohortSettings.timezone)
      : '';
    let tableRows = '';
    surveyDays.forEach((day: string) => {
      SURVEY_TIMES.forEach((time: string, tIdx: number) => {
        const slotKey = `${day}|${time}`;
        const assignment = slotAssignments[slotKey] || {};
        const assignedStartup = startups.find((s: any) => String(s.id) === String(assignment.startupId));
        const selectedPreceptors = submissions.filter((sub: any) => selections[`${sub.name}|${day}|${time}`]);
        const preceptorCell = selectedPreceptors.length > 0
          ? selectedPreceptors.map((s: any) => `<div>${esc(s.name)}</div>`).join('')
          : '<span style="color:#A3A3A3;font-style:italic;">(Unassigned)</span>';
        const startupCell = assignedStartup
          ? esc(assignedStartup.name)
          : '<span style="color:#A3A3A3;font-style:italic;">(No startup)</span>';
        const href = assignment.zoom ? safeHref(assignment.zoom) : '';
        const zoomCell = href
          ? `<a href="${href}" style="color:#E8772E;word-break:break-all;">${esc(assignment.zoom)}</a>`
          : (assignment.zoom ? esc(assignment.zoom) : '');
        tableRows += `<tr${tIdx === 0 ? ' style="border-top:2px solid #E8E4DF;"' : ''}>
          <td style="padding:6px 10px;border:1px solid #E8E4DF;white-space:nowrap;">${tIdx === 0 ? esc(day) : ''}</td>
          <td style="padding:6px 10px;border:1px solid #E8E4DF;white-space:nowrap;">${esc(time)}</td>
          <td style="padding:6px 10px;border:1px solid #E8E4DF;">${preceptorCell}</td>
          <td style="padding:6px 10px;border:1px solid #E8E4DF;">${startupCell}</td>
          <td style="padding:6px 10px;border:1px solid #E8E4DF;font-size:11px;">${zoomCell}</td>
        </tr>`;
      });
    });
    const printHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(currentCohortSettings.name)} — Schedule</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; color: #1A1A1A; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .subtitle { color: #6B6B6B; font-size: 14px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #F5F4F0; padding: 8px 10px; text-align: left; border: 1px solid #E8E4DF; font-weight: 700; }
  td { vertical-align: top; }
  @media print {
    body { margin: 20px; }
    a { color: #000 !important; text-decoration: none !important; }
  }
</style></head><body>
  <h1>${esc(currentCohortSettings.name)} — Assignment Schedule</h1>
  <div class="subtitle">Week of ${esc(weekRange)} &bull; ${esc(currentCohortSettings.timezone)}</div>
  <table>
    <thead><tr><th>Day</th><th>Time</th><th>Preceptor(s)</th><th>Startup</th><th>Zoom Link</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    } else {
      alert('Could not open print window. Please allow pop-ups for this site and try again.');
    }
  };

  if (!currentCohortSettings) return <div className="text-center py-20 text-[#A3A3A3]">Select a cohort first.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#1A1A1A] tracking-tight">Admin Dashboard</h1>
          <p className="text-[#6B6B6B]">{currentCohortSettings.name} — {submissions.length} preceptors submitted</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setAdminInviteEmail(''); setAdminInviteModal(true); }}
            className="flex items-center px-4 py-2 bg-[#2D8A56] text-white text-sm font-bold hover:bg-[#246d45] transition-colors">
            {inviteCopied ? <><Check className="w-4 h-4 mr-2" /> Link Copied!</> : <><UserPlus className="w-4 h-4 mr-2" /> Invite Preceptor</>}
          </button>
          <button onClick={() => setShowStartupManager(!showStartupManager)}
            className="flex items-center px-4 py-2 border border-[#E8E4DF] text-[#1A1A1A] text-sm font-bold hover:bg-[#F5F4F0]/60 transition-colors">
            <Building className="w-4 h-4 mr-2" /> Manage Startups
          </button>
          <button onClick={handleDownloadCSV}
            className="flex items-center px-4 py-2 bg-[#E8772E] text-white text-sm font-bold hover:bg-[#D4691E] transition-colors">
            <Download className="w-4 h-4 mr-2" /> Download CSV
          </button>
          <button onClick={handlePrintSchedule}
            className="flex items-center px-4 py-2 border border-[#E8E4DF] text-[#1A1A1A] text-sm font-bold hover:bg-[#F5F4F0]/60 transition-colors">
            <Printer className="w-4 h-4 mr-2" /> Print Schedule
          </button>
        </div>
      </div>

      {showStartupManager && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[#1A1A1A] font-black flex items-center"><Building className="w-5 h-5 mr-2 text-[#E8772E]" /> {currentCohortSettings.name} Startups</h3>
            <div className="flex space-x-2">
              <button onClick={() => setStartupModal('create')} className="flex items-center px-4 py-2 bg-[#E8772E] text-white text-sm font-bold hover:bg-[#D4691E] transition-colors">
                <Plus className="w-4 h-4 mr-1" /> Add Startup
              </button>
              <button onClick={() => setShowStartupManager(false)} className="text-[#A3A3A3] hover:text-[#1A1A1A] p-2"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {startups.map((s: any) => (
              <div key={s.id} className="border border-[#E8E4DF] p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-[#1A1A1A] font-bold">{s.name}</h4>
                  <div className="flex space-x-1">
                    <button onClick={() => setStartupModal(s)} className="text-[#A3A3A3] hover:text-[#E8772E] p-1"><Settings className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteStartup(s.id)} className="text-[#A3A3A3] hover:text-[#E5534B] p-1"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-[#E8772E] text-xs font-bold mb-1">{s.industry}{s.stage ? ` • ${s.stage}` : ''}</p>
                <p className="text-[#6B6B6B] text-xs line-clamp-2">{s.description}</p>
                {s.founders && <p className="text-[#A3A3A3] text-xs mt-1">Founders: {s.founders}</p>}
              </div>
            ))}
            {startups.length === 0 && <p className="col-span-full text-[#A3A3A3] italic text-sm">No startups added yet. Click "Add Startup" to create profiles.</p>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] overflow-hidden">
        <div className="overflow-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="text-xs text-[#6B6B6B] uppercase bg-[#F5F4F0]/60 sticky top-0 z-30">
              <tr>
                <th className="p-4 bg-[#F5F4F0]/60 border-r border-b border-[#E8E4DF] sticky left-0 z-40 w-64 font-bold text-[#1A1A1A]">Preceptor Name</th>
                {surveyDays.map((day: string) => (
                  <th key={day} colSpan={SURVEY_TIMES.length} className="p-2 text-center border-b border-r border-[#E8E4DF] font-bold text-[#1A1A1A] bg-[#F5F4F0]/60">{day}</th>
                ))}
              </tr>
              <tr>
                <th className="p-3 bg-[#F5F4F0]/60 border-r border-b border-[#E8E4DF] sticky left-0 z-40 w-64"></th>
                {surveyDays.map((day: string) => SURVEY_TIMES.map((time: string, idx: number) => {
                  const slotKey = `${day}|${time}`;
                  const assignment = slotAssignments[slotKey] || {};
                  const assignedStartup = startups.find((s: any) => String(s.id) === String(assignment.startupId));
                  return (
                    <th key={`${day}-${time}`} className={`p-3 text-center border-b border-[#E8E4DF] font-semibold whitespace-nowrap min-w-[150px] ${idx === SURVEY_TIMES.length - 1 ? 'border-r' : ''}`}>
                      <div className="flex flex-col space-y-2">
                        <span className="text-[#E8772E] font-bold">{time}</span>
                        <select value={assignment.startupId || ''} onChange={e => updateSlotAssignment(day, time, 'startupId', e.target.value)}
                          className="border border-[#E8E4DF] px-1 py-0.5 text-[10px] text-[#1A1A1A] outline-none focus:border-[#E8772E]">
                          <option value="">Select Startup</option>
                          {startups.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {assignedStartup && (
                          <button onClick={() => setProfileCard(assignedStartup)} className="text-[10px] text-[#E8772E] hover:underline truncate max-w-full">
                            View Profile
                          </button>
                        )}
                        <button onClick={() => setZoomModal({ day, time, link: assignment.zoom || '' })}
                          className={`flex items-center justify-center py-1 text-[10px] transition-colors ${assignment.zoom ? 'bg-[#E8772E]/10 text-[#E8772E] border border-[#E8772E]/30' : 'bg-[#F5F4F0]/60 text-[#A3A3A3] border border-[#E8E4DF] hover:bg-[#F5F4F0]'}`}>
                          <LinkIcon className="w-3 h-3 mr-1" /> {assignment.zoom ? 'Link Added' : 'Add Zoom'}
                        </button>
                      </div>
                    </th>
                  );
                }))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub: any) => (
                <tr key={sub.id} className="border-b border-[#E8E4DF]/60 hover:bg-[#F5F4F0]/60 transition-colors">
                  <td className="p-4 font-bold text-[#1A1A1A] border-r border-[#E8E4DF] sticky left-0 z-20 bg-white">{sub.name}</td>
                  {surveyDays.map((day: string) => SURVEY_TIMES.map((time: string, idx: number) => {
                    const isAvailable = (sub.availability as any)?.[day]?.[time];
                    const isSelected = selections[`${sub.name}|${day}|${time}`];
                    return (
                      <td key={`${day}-${time}`} onClick={() => isAvailable && toggleSelection(sub.name, day, time)}
                        className={`p-1.5 text-center transition-colors ${idx === SURVEY_TIMES.length - 1 ? 'border-r' : ''} border-[#E8E4DF] ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <div className={`w-full h-10 flex items-center justify-center transition-all ${isSelected ? 'bg-[#2D8A56] text-white' : isAvailable ? 'bg-[#F5F4F0]/60 hover:bg-[#F5F4F0] text-[#2D8A56]' : 'bg-white'}`}>
                          {isSelected ? (() => {
                            const slotKey2 = `${day}|${time}`;
                            const assign2 = slotAssignments[slotKey2] || {};
                            const hasStartup2 = startups.some((s: any) => String(s.id) === String(assign2.startupId));
                            const nKey = `${sub.name}|${day}|${time}`;
                            const nStatus = notifyStatus[nKey];
                            return (
                              <div className="flex items-center space-x-1">
                                <Star className="w-3 h-3" fill="currentColor" />
                                <button onClick={e => { e.stopPropagation(); handleGenerateICS(sub.name, day, time); }} className="text-white hover:text-[#F0A500]" title="Download calendar invite">
                                  <CalendarPlus className="w-4 h-4" />
                                </button>
                                {hasStartup2 && emailConfigured && (
                                  <button onClick={e => { e.stopPropagation(); handleNotifyPreceptor(sub.name, day, time); }}
                                    disabled={nStatus === 'sending'}
                                    className={`transition-colors ${nStatus === 'sent' ? 'text-[#F0A500]' : nStatus === 'error' ? 'text-[#E5534B]' : 'text-white hover:text-[#F0A500]'}`}
                                    title={nStatus === 'sent' ? 'Notification sent!' : nStatus === 'error' ? 'Failed to send' : 'Email notification to preceptor'}>
                                    <Mail className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })() : isAvailable ? <Check className="w-5 h-5" strokeWidth={3} /> : <span className="text-[#D5D0C8]">-</span>}
                        </div>
                      </td>
                    );
                  }))}
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr><td colSpan={surveyDays.length * SURVEY_TIMES.length + 1} className="p-8 text-center text-[#A3A3A3] italic">No preceptors have submitted availability yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {zoomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-8 w-full max-w-md">
            <h3 className="text-xl font-black text-[#1A1A1A] mb-2 flex items-center"><LinkIcon className="w-6 h-6 mr-2 text-[#E8772E]" /> Add Zoom Link</h3>
            <p className="text-[#6B6B6B] text-sm mb-6">For {zoomModal.day} at {zoomModal.time}</p>
            <input type="url" autoFocus value={zoomModal.link} onChange={(e: any) => setZoomModal({ ...zoomModal, link: e.target.value })}
              placeholder="https://zoom.us/j/..." className="w-full border-b-2 border-[#E8E4DF] bg-transparent py-3 text-[#1A1A1A] outline-none focus:border-[#E8772E] transition-colors placeholder:text-[#A3A3A3] mb-6" />
            <div className="flex space-x-3">
              <button onClick={() => setZoomModal(null)} className="flex-1 px-4 py-3 border border-[#E8E4DF] text-[#1A1A1A] font-bold hover:bg-[#F5F4F0]/60 transition-colors">Cancel</button>
              <button onClick={() => { updateSlotAssignment(zoomModal.day, zoomModal.time, 'zoom', zoomModal.link); setZoomModal(null); }}
                className="flex-1 px-4 py-3 bg-[#E8772E] text-white font-bold hover:bg-[#D4691E] transition-colors">Save Link</button>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setProfileCard(null)}>
          <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-8 w-full max-w-md" onClick={(e: any) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-[#E8772E] text-white flex items-center justify-center"><Building className="w-6 h-6" /></div>
              <button onClick={() => setProfileCard(null)} className="text-[#A3A3A3] hover:text-[#1A1A1A]"><X className="w-5 h-5" /></button>
            </div>
            <h3 className="text-2xl font-black text-[#1A1A1A] mb-1">{profileCard.name}</h3>
            <div className="flex space-x-2 mb-4">
              {profileCard.industry && <span className="px-2 py-0.5 bg-[#E8772E] text-white text-xs font-bold">{profileCard.industry}</span>}
              {profileCard.stage && <span className="px-2 py-0.5 bg-[#2D8A56] text-white text-xs font-bold">{profileCard.stage}</span>}
            </div>
            {profileCard.founders && <p className="text-[#6B6B6B] text-sm mb-2"><span className="font-bold text-[#1A1A1A]">Founders:</span> {profileCard.founders}</p>}
            {profileCard.description && <p className="text-[#6B6B6B] text-sm mb-4">{profileCard.description}</p>}
          </div>
        </div>
      )}

      {adminInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-8 w-full max-w-md">
            <h3 className="text-xl font-black text-[#1A1A1A] mb-2 flex items-center">
              <UserPlus className="w-6 h-6 mr-2 text-[#2D8A56]" /> Invite Preceptor to {currentCohortSettings?.name}
            </h3>
            <p className="text-[#6B6B6B] text-sm mb-6">
              The invite link will be copied to your clipboard. Optionally enter an email to send it directly.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">Recipient Email (optional)</label>
              <input type="email" value={adminInviteEmail} onChange={e => setAdminInviteEmail(e.target.value)}
                placeholder="preceptor@example.com"
                className="w-full border-b-2 border-[#E8E4DF] bg-transparent py-3 text-[#1A1A1A] outline-none focus:border-[#2D8A56] transition-colors placeholder:text-[#A3A3A3]" />
              {!emailConfigured && adminInviteEmail.trim() && (
                <p className="text-[#E5534B] text-xs mt-1">SMTP not configured. Email won't be sent, but the link will still be copied.</p>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={() => setAdminInviteModal(false)} className="flex-1 px-4 py-3 border border-[#E8E4DF] text-[#1A1A1A] font-bold hover:bg-[#F5F4F0]/60 transition-colors">Cancel</button>
              <button onClick={handleInvitePreceptor} disabled={adminInviteSending}
                className="flex-1 px-4 py-3 bg-[#E8772E] text-white font-bold hover:bg-[#D4691E] transition-colors disabled:opacity-50 flex items-center justify-center">
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-sm border border-[#E8E4DF] p-8 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-[#1A1A1A]">{startup ? 'Edit Startup' : 'Add Startup Profile'}</h3>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#1A1A1A]"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">Company Name <span className="text-[#E5534B]">*</span></label>
              <input type="text" required value={form.name} onChange={e => handleChange('name', e.target.value)}
                className="w-full border-b-2 border-[#E8E4DF] bg-transparent py-3 text-[#1A1A1A] outline-none focus:border-[#E8772E] transition-colors placeholder:text-[#A3A3A3]"
                placeholder="e.g. AgroTech Solutions" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">Founder Name(s)</label>
              <input type="text" value={form.founders} onChange={e => handleChange('founders', e.target.value)}
                className="w-full border-b-2 border-[#E8E4DF] bg-transparent py-3 text-[#1A1A1A] outline-none focus:border-[#E8772E] transition-colors placeholder:text-[#A3A3A3]"
                placeholder="e.g. Jane Doe, John Smith" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">Industry</label>
              <input type="text" value={form.industry} onChange={e => handleChange('industry', e.target.value)}
                className="w-full border-b-2 border-[#E8E4DF] bg-transparent py-3 text-[#1A1A1A] outline-none focus:border-[#E8772E] transition-colors placeholder:text-[#A3A3A3]"
                placeholder="e.g. FinTech" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">Stage</label>
              <select value={form.stage} onChange={e => handleChange('stage', e.target.value)}
                className="w-full border border-[#E8E4DF] p-3 text-[#1A1A1A] outline-none focus:border-[#E8772E]">
                <option value="">Select stage</option>
                <option value="Idea">Idea</option>
                <option value="MVP">MVP</option>
                <option value="Revenue">Revenue</option>
                <option value="Growth">Growth</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B6B6B] mb-2">One-line Description</label>
              <input type="text" value={form.description} onChange={e => handleChange('description', e.target.value)}
                className="w-full border-b-2 border-[#E8E4DF] bg-transparent py-3 text-[#1A1A1A] outline-none focus:border-[#E8772E] transition-colors placeholder:text-[#A3A3A3]"
                placeholder="e.g. Connecting smallholder farmers to premium markets via mobile." />
            </div>
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-[#E8E4DF] text-[#1A1A1A] font-bold hover:bg-[#F5F4F0]/60 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-[#E8772E] text-white font-bold hover:bg-[#D4691E] transition-colors">Save Startup</button>
          </div>
        </form>
      </div>
    </div>
  );
}
