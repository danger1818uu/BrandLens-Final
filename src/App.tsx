import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Role, PostRecord, MetricCounts, Company, UserAccount } from './types';
import { apiClient } from './services/api';
import { Sidebar, NavTab } from './components/dashboard/Sidebar';
import { Header } from './components/dashboard/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { NewPost } from './components/new-post/NewPost';
import { PendingView } from './components/pending/PendingView';
import { HistoryView } from './components/history/HistoryView';
import { ConnectedAccountsView } from './components/accounts/ConnectedAccountsView';
import { HelpView } from './components/help/HelpView';
import { AboutView } from './components/about/AboutView';
import { LandingPage } from './components/landing/LandingPage';
import { FloatingAssistant } from './components/common/FloatingAssistant';
import { EnhancerView } from './components/enhancer/EnhancerView';
import { DataSecurityView } from './components/security/DataSecurityView';
import { AuthModal } from './components/auth/AuthModal';
import { CeoWorkspace } from './components/ceo/CeoWorkspace';
import { MessagesView } from './components/messages/MessagesView';
import { AliveAtmosphere } from './components/common/AliveAtmosphere';
import { TabParticleTransition } from './components/common/TabParticleTransition';
import { ProfileWelcomeOverlay } from './components/common/ProfileWelcomeOverlay';
import { AdminPanel } from './components/admin/AdminPanel';
import { AmbientAudioPlayer } from './components/common/AmbientAudioPlayer';
import { SilentAudioEngine } from './components/common/SilentAudioEngine';
import { SpotlightTour, TourTriggerButton, useSpotlightTour } from './components/tour/SpotlightTour';
import type { SpotlightStep } from './components/tour/SpotlightTour';
import { WorkspaceGuide } from './components/tour/WorkspaceGuide';
import type { WorkspaceGuideStep } from './components/tour/WorkspaceGuide';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Team Member Workspace Guide Steps ───────────────────────────────────────
//  Step 0  Dashboard          'auto'        fires 2.2 s after login
//  Step 1  New Post           'auto'        fires 1.2 s after step 0 OK
//  Step 2  Enhancer           'tab-switch'  fires on ANY tab switch after step 1 OK
//  Step 3  Pending            'tab-switch'  fires on ANY tab switch after step 2 OK
//  Step 4  History            'tab-switch'  fires on ANY tab switch after step 3 OK
//  Step 5  Messages           'tab-switch'  fires on ANY tab switch after step 4 OK
//  Step 6  Database & Sec     'tab-switch'  fires on ANY tab switch after step 5 OK
//  Step 7  Help               'tab-switch'  fires on ANY tab switch after step 6 OK
//  Step 8  About & Guidelines 'tab-switch'  fires on ANY tab switch after step 7 OK
//  Step 9  Log Out            'auto'        fires 1.2 s after step 8 OK (always visible)
const TEAM_GUIDE_STEPS: WorkspaceGuideStep[] = [
  {
    trigger: 'auto',
    targetSelector: '[data-tour-id="nav-dashboard"]',
    icon: '⌘',
    description: 'Welcome to your <strong>Dashboard</strong> — see your pending posts, recent activity and team metrics at a glance.',
    delay: 2200,
  },
  {
    trigger: 'auto',
    targetSelector: '[data-tour-id="nav-new-post"]',
    icon: '✏️',
    description: 'Use <strong>"New Post"</strong> to compose content for LinkedIn, Instagram or X. Every draft is reviewed by the AI governance engine against your company guidelines.',
    delay: 1200,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="nav-enhancer"]',
    icon: '✨',
    description: 'The <strong>Enhancer</strong> lets you rewrite and improve existing content using AI — tone-match it to your brand voice in seconds.',
    delay: 800,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="nav-pending"]',
    icon: '⏳',
    description: '<strong>Pending</strong> shows posts waiting for review or approval. Check here regularly so nothing gets stuck in the queue.',
    delay: 800,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="nav-history"]',
    icon: '📋',
    description: '<strong>History</strong> is your full publishing audit log — every post you\'ve sent or scheduled, with full AI review records.',
    delay: 800,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="nav-messages"]',
    icon: '💬',
    description: 'Use <strong>Messages</strong> to chat with your team and CEO — coordinate on drafts, get approvals and discuss brand strategy.',
    delay: 800,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="nav-data-security"]',
    icon: '🔒',
    description: '<strong>Database & Security</strong> shows how BrandLens stores your data and what security protections are in place for your account.',
    delay: 800,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="nav-help"]',
    icon: '❓',
    description: '<strong>Help & Assistant</strong> is your go-to for platform guidance — browse role-specific docs and ask the AI assistant anything.',
    delay: 800,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="nav-about"]',
    icon: 'ℹ️',
    description: '<strong>About & Guidelines</strong> contains your company\'s approved brand guidelines — the rules the AI uses to review your posts.',
    delay: 800,
  },
  {
    trigger: 'auto',
    targetSelector: '[data-tour-id="team-nav-logout"]',
    icon: '⎋',
    description: 'When you\'re done, click <strong>"Log Out"</strong> to end your session securely. Your drafts are saved automatically.',
    delay: 1200,
  },
];


const HERO_PHRASES = [
  "Without the noise.",
  "With crystalline focus.",
  "Without distortion.",
  "In absolute clarity.",
  "True to your identity.",
];

const INTRO_LETTERS = [
  { char: 'B', isLens: false },
  { char: 'r', isLens: false },
  { char: 'a', isLens: false },
  { char: 'n', isLens: false },
  { char: 'd', isLens: false },
  { char: 'L', isLens: true },
  { char: 'e', isLens: true },
  { char: 'n', isLens: true },
  { char: 's', isLens: true },
];

const THOUGHTS = [
  { words: ["Every", "detail", "has", "a"], em: "meaning." },
  { words: ["Every", "word", "leaves", "a"], em: "mark." },
  { words: ["Every", "brand", "has", "a"], em: "standard." },
  { words: ["Precision", "is", "not", "an"], em: "accident." },
  { words: ["Make", "every", "impression"], em: "count." },
];

const DEFAULT_COMPANY: Company = {
  id: 'org-nova-unlimited',
  name: 'Nova Unlimited',
  category: 'Technology',
  email: 'novaunlimited0@gmail.com',
  description: 'Nova Unlimited is a technology-focused service provider specializing in server and hosting solutions. Its communications should focus on hosting services, infrastructure, technical support, and verified information.',
  productsServices: 'High-performance cloud servers, managed VPS hosting, dedicated bare-metal infrastructure, 24/7 technical operations support.',
  targetAudience: 'IT directors, software developers, DevOps engineers, and digital agencies seeking dependable server infrastructure.',
  brandVoice: 'Direct, technically accurate, clear, and reassuring without hype, exaggeration, or unverified claims.',
  approvedTerminology: 'Bare-metal nodes, provisioned latency, verified redundancy, dedicated compute.',
  companyContext: 'Nova Unlimited operates tier-3 data center partner facilities.',
  profileVersion: 1,
  guidelineVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const DEFAULT_CEO_USER: UserAccount = {
  id: 'usr-nova-ceo',
  companyId: 'org-nova-unlimited',
  name: 'Alexander Vance',
  loginId: 'novaunlimited0@gmail.com',
  username: 'novaunlimited0@gmail.com',
  role: 'CEO',
  department: 'Executive Leadership',
  permissions: 'Full Administration',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

// ─── Spotlight Tour Steps (sequence defined here; expand later) ──────────────
const EMPLOYEE_TOUR_STEPS: SpotlightStep[] = [
  {
    target: '[data-tour-id="nav-dashboard"]',
    badge: 'Step 1 · Workspace',
    title: 'Your Dashboard',
    description:
      'This is your command centre. Get a live overview of all your posts — how many are pending review, enhanced, or already published.',
    arrowSide: 'left',
    tooltipPlacement: 'right',
  },
  {
    target: '[data-tour-id="nav-new-post"]',
    badge: 'Step 2 · Create',
    title: 'Create a New Post',
    description:
      'Compose social content for LinkedIn, Instagram or X. The AI governance engine reviews every post against your brand\'s guidelines in real time.',
    arrowSide: 'left',
    tooltipPlacement: 'right',
  },
  {
    target: '[data-tour-id="nav-enhancer"]',
    badge: 'Step 3 · AI Studio',
    title: 'AI Enhancer Studio',
    description:
      'Paste any draft and let BrandLens rewrite, sharpen and brand-align it — or generate fresh AI visuals to accompany your post.',
    arrowSide: 'left',
    tooltipPlacement: 'right',
  },
  {
    target: '[data-tour-id="nav-pending"]',
    badge: 'Step 4 · Review Queue',
    title: 'Pending Posts',
    description:
      'Posts waiting for AI review or manager approval live here. Track governance scores and fix flagged issues before they reach your audience.',
    arrowSide: 'left',
    tooltipPlacement: 'right',
  },
  {
    target: '[data-tour-id="nav-history"]',
    badge: 'Step 5 · Audit Log',
    title: 'Publishing History',
    description:
      'A complete audit trail of every post you\'ve published — timestamps, platform, and governance verdict all in one place.',
    arrowSide: 'left',
    tooltipPlacement: 'right',
  },
  {
    target: '[data-tour-id="nav-messages"]',
    badge: 'Step 6 · Messaging',
    title: 'Team Messages',
    description:
      'Communicate directly with teammates inside BrandLens — discuss drafts, flag issues, or coordinate publishing without leaving the platform.',
    arrowSide: 'left',
    tooltipPlacement: 'right',
  },
];

export default function App() {
  // BrandLens intro plays every time the website loads (logged in or not)
  const [introVisible, setIntroVisible] = useState(true);
  const [introDone, setIntroDone] = useState(false);
  const [thoughtsActive, setThoughtsActive] = useState(false);
  const [activeThoughtIndex, setActiveThoughtIndex] = useState<number>(-1);
  const [siteVisible, setSiteVisible] = useState(false);

  // Header dynamic phrase changing state
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Authenticated multi-company state - starts with NO user logged in (fixed: does not auto-log into CEO)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const stored = sessionStorage.getItem('brandlens_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.user) return session.user;
      }
    } catch {}
    return null;
  });

  const [currentCompany, setCurrentCompany] = useState<Company | null>(() => {
    try {
      const stored = sessionStorage.getItem('brandlens_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.company) return session.company;
      }
    } catch {}
    return null;
  });

  const [dashboardActive, setDashboardActive] = useState<boolean>(() => {
    try {
      const stored = sessionStorage.getItem('brandlens_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.user) return true;
      }
    } catch {}
    return false;
  });

  const [guestAboutOpen, setGuestAboutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Guided first-time sequence state: 'unstarted' -> 'ceo_active' -> 'employee_active' -> 'admin_active' -> 'completed'
  // Only happens when the web is opened first time; never repeats again and again!
  const [guidedTourStage, setGuidedTourStage] = useState<
    'unstarted' | 'ceo_active' | 'employee_active' | 'admin_active' | 'completed'
  >(() => {
    try {
      const stored = sessionStorage.getItem('brandlens_tour_stage');
      if (
        stored === 'unstarted' ||
        stored === 'ceo_active' ||
        stored === 'employee_active' ||
        stored === 'admin_active' ||
        stored === 'completed'
      ) {
        return stored;
      }
    } catch {}
    return 'unstarted';
  });

  // Auto-login sequence config (CEO logout -> Employee -> Admin -> completed/freely)
  const [autoLoginConfig, setAutoLoginConfig] = useState<{
    loginId: string;
    pass: string;
    delayMs?: number;
    notice?: string;
  } | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'register' | 'login'>('register');
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [metrics, setMetrics] = useState<MetricCounts>({ total: 0, pending: 0, enhanced: 0, published: 0 });
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [, setLoadingData] = useState(false);

  // Spotlight tour state – shown once per session for Employee/Manager/HOD roles
  const [tourActive, setTourActive] = useState(false);
  const [tourKey, setTourKey] = useState(0); // bump to force re-mount/restart

  // Big welcome message animation state (Welcome CEO, Welcome EMPLOYEE)
  const [welcomeProfile, setWelcomeProfile] = useState<{
    role: Role;
    name: string;
    companyName: string;
    department?: string;
  } | null>(null);

  // Admin platform tracking (when Super Admin enters a brand workspace, they can switch back)
  const [adminUserSession, setAdminUserSession] = useState<UserAccount | null>(() => {
    try {
      const stored = sessionStorage.getItem('brandlens_admin_root');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  // Poll unread messages count for current authenticated user
  useEffect(() => {
    if (!currentUser) return;
    const compId = currentCompany?.id || currentUser.companyId || 'org-nova-unlimited';
    const fetchUnread = () => {
      if (document.hidden) return; // Skip polling when tab is backgrounded
      apiClient.getUnreadMessageCount(compId, currentUser.id)
        .then((count) => {
          setUnreadMessages((prev) => (prev === count ? prev : count));
        })
        .catch(() => {});
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 6000);
    return () => clearInterval(timer);
  }, [currentUser, currentCompany]);

  // Toast notification state
  const [toast, setToast] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4200);
  }, []);

  // Refs
  const lensRef = useRef<HTMLDivElement>(null);
  const thoughtTimersRef = useRef<number[]>([]);

  const clearIntroTimers = useCallback(() => {
    thoughtTimersRef.current.forEach((t) => window.clearTimeout(t));
    thoughtTimersRef.current = [];
  }, []);

  const showLanding = useCallback(() => {
    clearIntroTimers();
    setIntroDone(true);
    setThoughtsActive(false);
    setActiveThoughtIndex(-1);
    setSiteVisible(true);

    // Completely release body scroll locks
    document.body.classList.remove('brandlens-intro-locked');
    document.body.classList.remove('intro-active');
    document.body.style.overflow = '';

    // Switch persistent particles smoothly into continuous drift mode across the site
    if (window.__brandlensFx?.drift) {
      window.__brandlensFx.drift();
    } else if ((window as any).__fx?.toAmbient) {
      (window as any).__fx.toAmbient();
    }

    const t = window.setTimeout(() => {
      setIntroVisible(false);
    }, 900);
    thoughtTimersRef.current.push(t);
  }, [clearIntroTimers]);

  const runIntro = useCallback(() => {
    clearIntroTimers();

    if (window.__brandlensFx?.gather) {
      window.__brandlensFx.gather();
    } else if ((window as any).__fx?.gather) {
      (window as any).__fx.gather();
    }

    setIntroVisible(true);
    setIntroDone(false);
    setThoughtsActive(false);
    setActiveThoughtIndex(-1);
    setSiteVisible(false);

    // Apply temporary scroll lock only while full-screen intro is running
    document.body.classList.add('brandlens-intro-locked');
    document.body.classList.add('intro-active');

    // Phase 1 -> Phase 2 transition at 3000ms (gather into burst)
    const tIntro = window.setTimeout(() => {
      setIntroDone(true);
      setThoughtsActive(true);

      if (window.__brandlensFx?.burst) {
        window.__brandlensFx.burst();
      } else if ((window as any).__fx?.burst) {
        (window as any).__fx.burst();
      }

      // Cycle each thought sequentially (950ms each)
      THOUGHTS.forEach((_, index) => {
        const tThought = window.setTimeout(() => {
          setActiveThoughtIndex(index);
        }, index * 950 + 80);
        thoughtTimersRef.current.push(tThought);
      });

      // Show landing or dashboard after all thoughts complete
      const tEnd = window.setTimeout(showLanding, THOUGHTS.length * 950 + 260);
      thoughtTimersRef.current.push(tEnd);
    }, 3000);

    thoughtTimersRef.current.push(tIntro);
  }, [clearIntroTimers, showLanding]);

  const handleReplayIntro = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    runIntro();
  }, [runIntro]);

  // Initial intro mount and keyboard shortcuts (Enter / Space / Escape skip)
  const hasStartedIntroRef = useRef(false);
  useEffect(() => {
    if (!hasStartedIntroRef.current) {
      hasStartedIntroRef.current = true;
      runIntro();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!siteVisible && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) {
        e.preventDefault();
        showLanding();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    (window as any).resetBrandLensIntro = () => {
      runIntro();
    };

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearIntroTimers();
    };
  }, [runIntro, showLanding, siteVisible, clearIntroTimers]);

  // Dynamic header phrase rotation on landing page
  useEffect(() => {
    if (!siteVisible || dashboardActive) return;

    const interval = window.setInterval(() => {
      if (document.hidden) return;
      setPhraseIndex((prev) => (prev + 1) % HERO_PHRASES.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [siteVisible, dashboardActive]);

  // Modal keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && authModalOpen) {
        setAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalOpen]);

  // Ambient lens subtle parallax (gentle, throttled, zero RAF lag)
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    let ticking = false;
    const handlePointerMove = (e: PointerEvent) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (lensRef.current) {
            const xOffset = (e.clientX / window.innerWidth - 0.5) * 16;
            const yOffset = (e.clientY / window.innerHeight - 0.5) * 16;
            lensRef.current.style.transform = `translate3d(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px), 0)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  // Load user data from server API
  const loadUserData = async (authorUsername: string, companyId?: string, userRole?: Role) => {
    setLoadingData(true);
    try {
      const [fetchedPosts, fetchedMetrics] = await Promise.all([
        apiClient.fetchPosts(authorUsername, companyId, userRole),
        apiClient.fetchMetrics(authorUsername),
      ]);
      setPosts(fetchedPosts);
      setMetrics(fetchedMetrics);
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Restore authenticated session on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('brandlens_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session && session.user && session.company) {
          setCurrentUser(session.user);
          setCurrentCompany(session.company);
          setDashboardActive(true);
          if (session.user.role !== 'CEO') {
            loadUserData(session.user.loginId || session.user.username || '', session.company.id, session.user.role);
          }
          return;
        } else {
          sessionStorage.removeItem('brandlens_session');
        }
      }
    } catch {
      sessionStorage.removeItem('brandlens_session');
    }
  }, []);

  const openLogin = (tab: 'register' | 'login' = 'register') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = async (session: { company: Company; user: UserAccount }) => {
    setAutoLoginConfig(null);
    setCurrentCompany(session.company);
    setCurrentUser(session.user);
    sessionStorage.setItem('brandlens_session', JSON.stringify(session));

    // Progress the first-time tour flow
    if (session.user.role === 'CEO') {
      if (guidedTourStage === 'unstarted') {
        setGuidedTourStage('ceo_active');
        sessionStorage.setItem('brandlens_tour_stage', 'ceo_active');
      }
    } else if (session.user.role === 'Employee' || session.user.loginId?.includes('employee')) {
      if (guidedTourStage === 'ceo_active') {
        setGuidedTourStage('employee_active');
        sessionStorage.setItem('brandlens_tour_stage', 'employee_active');
      }
    } else if (session.user.role === 'Administrator' || session.user.loginId?.toLowerCase() === 'brandlens@gmail.com') {
      if (guidedTourStage === 'employee_active') {
        setGuidedTourStage('admin_active');
        sessionStorage.setItem('brandlens_tour_stage', 'admin_active');
      }
    }

    if (session.user.role === 'Administrator' || session.user.loginId.toLowerCase() === 'brandlens@gmail.com') {
      setAdminUserSession(session.user);
      sessionStorage.setItem('brandlens_admin_root', JSON.stringify(session.user));
    }

    setAuthModalOpen(false);
    setDashboardActive(true);
    setSiteVisible(true);
    setIntroVisible(false);
    document.body.classList.remove('intro-active');
    document.body.classList.remove('brandlens-intro-locked');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger Big Message Animation (e.g. Welcome CEO, Welcome EMPLOYEE)
    setWelcomeProfile({
      role: session.user.role,
      name: session.user.name,
      companyName: session.company.name,
      department: session.user.department
    });

    if (session.user.role === 'Administrator' || session.user.loginId.toLowerCase() === 'brandlens@gmail.com') {
      // Admin directly opens AdminPanel
    } else if (session.user.role === 'CEO') {
      setActiveTab('dashboard');
    } else {
      await loadUserData(session.user.loginId || session.user.username || '', session.company.id, session.user.role);
      setActiveTab('dashboard');
      // Activate spotlight tour for team members (Employee / Manager / HOD)
      setTourActive(true);
      setTourKey((k) => k + 1);
    }
  };

  const handleReturnToAdmin = useCallback(() => {
    if (!adminUserSession) return;
    const hqCompany: Company = {
      id: 'org-brandlens-hq',
      name: 'BrandLens Platform HQ',
      category: 'Technology',
      email: 'brandlens@gmail.com',
      description: 'BrandLens Core System Infrastructure',
      productsServices: 'Multi-Tenant Brand Intelligence Platform',
      targetAudience: 'Enterprise Brands & Executive Teams',
      brandVoice: 'Authoritative, Precision-driven, Neutral',
      approvedTerminology: '',
      companyContext: '',
      profileVersion: 1,
      guidelineVersion: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };
    setCurrentCompany(hqCompany);
    setCurrentUser(adminUserSession);
    sessionStorage.setItem('brandlens_session', JSON.stringify({ company: hqCompany, user: adminUserSession }));
    showToast('Returned to BrandLens Platform Admin Console', 'info');
  }, [adminUserSession, showToast]);

  const handleLogout = () => {
    const wasCeo = currentUser?.role === 'CEO';
    const wasEmployee = currentUser?.role === 'Employee' || currentUser?.loginId?.includes('employee');
    const wasAdmin = currentUser?.role === 'Administrator' || currentUser?.loginId?.toLowerCase() === 'brandlens@gmail.com';

    sessionStorage.removeItem('brandlens_session');
    sessionStorage.removeItem('brandlens_admin_root');
    setAdminUserSession(null);
    setCurrentUser(null);
    setCurrentCompany(null);
    setDashboardActive(false);
    setSiteVisible(true);
    setIntroVisible(false);
    document.body.classList.remove('intro-active');
    document.body.classList.remove('brandlens-intro-locked');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Step 1: When CEO logs out in first-time tour flow, auto-fill & auto-login Employee profile
    if (wasCeo && guidedTourStage === 'ceo_active') {
      setAutoLoginConfig({
        loginId: 'employee@novaunlimited.test',
        pass: 'employee123',
        delayMs: 1400,
        notice: 'CEO session logged out. Step 2/3: Auto-logging into Employee profile (Sarah Lin)...'
      });
      openLogin('login');
      return;
    }

    // Step 2: When Employee logs out in first-time tour flow, auto-fill & auto-login Admin Panel
    if (wasEmployee && guidedTourStage === 'employee_active') {
      setAutoLoginConfig({
        loginId: 'brandlens@gmail.com',
        pass: 'brandlensadmin',
        delayMs: 1400,
        notice: 'Employee session logged out. Step 3/3: Auto-logging into BrandLens Admin Console...'
      });
      openLogin('login');
      return;
    }

    // Step 3: When Admin logs out, tour is completed. No more auto-logins!
    if (wasAdmin && guidedTourStage === 'admin_active') {
      setGuidedTourStage('completed');
      sessionStorage.setItem('brandlens_tour_stage', 'completed');
      setAutoLoginConfig(null);
      openLogin('login');
      showToast('First-time guided tour complete. You may now freely sign in to any workspace.', 'success');
      return;
    }

    // All subsequent logouts (or if tour already completed): freely sign in with no auto login
    setAutoLoginConfig(null);
    openLogin('login');
  };

  const handleCompanyUpdate = useCallback((updated: Company) => {
    setCurrentCompany((prev) => {
      if (
        prev &&
        prev.id === updated.id &&
        prev.name === updated.name &&
        prev.category === updated.category &&
        prev.guidelineVersion === updated.guidelineVersion &&
        prev.profileVersion === updated.profileVersion
      ) {
        return prev;
      }
      return updated;
    });
  }, []);

  const handleUserUpdate = useCallback((updated: UserAccount) => {
    setCurrentUser((prev) => {
      if (
        prev &&
        prev.id === updated.id &&
        prev.name === updated.name &&
        prev.loginId === updated.loginId &&
        prev.role === updated.role
      ) {
        return prev;
      }
      return updated;
    });
  }, []);

  // Callback when a post is created with moving redirection to Pending queue
  const handlePostSaved = useCallback((newPost: PostRecord) => {
    setPosts((prev) => [newPost, ...prev]);
    if (currentUser) {
      const userIdentifier = currentUser.loginId || currentUser.username || '';
      apiClient.fetchMetrics(userIdentifier, currentCompany?.id, currentUser.role).then(setMetrics).catch(() => {});
    }
    setActiveTab('pending');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Post "${newPost.title}" saved to Pending for Review.`, 'success');
  }, [currentUser, currentCompany, showToast]);

  // Callback when a post is updated or status changed
  const handlePostUpdated = useCallback((updatedPost: PostRecord) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    if (currentUser) {
      const userIdentifier = currentUser.loginId || currentUser.username || '';
      apiClient.fetchMetrics(userIdentifier, currentCompany?.id, currentUser.role).then(setMetrics).catch(() => {});
    }
    const statusLabel =
      updatedPost.status === 'ready_to_post'
        ? 'Ready to Post'
        : updatedPost.status === 'posted'
        ? 'Posted'
        : 'Pending for Review';
    showToast(`Post "${updatedPost.title}" updated (${statusLabel}).`, 'success');
  }, [currentUser, currentCompany, showToast]);

  // Smooth moving redirection between workspace tabs
  const navigateTab = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Scroll smoothly to top whenever active tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="stage">
      {/* Cinematic BrandLens Opening Intro Animation (brandlens_intro_alive) */}
      {introVisible && (
        <>
          <section
            className={`intro ${introDone ? 'done' : ''}`}
            id="intro"
            aria-label="BrandLens introduction"
          >
            <div className="flare" aria-hidden="true" />
            <div className="intro-core">
              <div className="intro-mark" aria-hidden="true">
                <b className="m-orb" />
                <b className="m-ping" />
                <b className="m-ping p2" />
              </div>
              <h1 className="intro-name split" aria-label="BrandLens">
                {INTRO_LETTERS.map((item, idx) => (
                  <span
                    key={idx}
                    className={`ch ${item.isLens ? 'text-[#c8bbff]' : ''}`}
                    style={{ '--i': idx } as any}
                  >
                    {item.char}
                  </span>
                ))}
              </h1>
              <div className="intro-line" aria-hidden="true" />
              <p className="intro-caption">CLARITY IN EVERY IMPRESSION</p>
            </div>
            <button
              className="intro-skip"
              id="skipIntro"
              type="button"
              onClick={showLanding}
              aria-label="Skip BrandLens intro"
            >
              SKIP INTRO ↗
            </button>
          </section>

          <section
            className={`thoughts ${thoughtsActive ? 'active' : ''}`}
            id="thoughts"
            aria-hidden="true"
          >
            {THOUGHTS.map((t, idx) => (
              <p
                key={idx}
                className={`thought ${activeThoughtIndex === idx ? 'active' : ''}`}
              >
                {t.words.map((w, wIdx) => (
                  <React.Fragment key={wIdx}>
                    <span className="tw" style={{ '--i': wIdx } as any}>
                      {w}
                    </span>{' '}
                  </React.Fragment>
                ))}
                <em>
                  <span className="tw" style={{ '--i': t.words.length } as any}>
                    {t.em}
                  </span>
                </em>
              </p>
            ))}
          </section>

          {/* Active thoughts segment tracker & skip */}
          <div
            className={`meta ${thoughtsActive ? 'active' : ''}`}
            id="meta"
            aria-hidden="true"
          >
            <div className="segs" id="segs">
              {THOUGHTS.map((_, i) => (
                <i
                  key={i}
                  className={
                    i < activeThoughtIndex
                      ? 'done'
                      : i === activeThoughtIndex
                      ? 'now'
                      : ''
                  }
                />
              ))}
            </div>
            <div className="meta-row">
              <span id="count">
                {String(Math.max(1, activeThoughtIndex + 1)).padStart(2, '0')} / 05
              </span>
              <button
                className="meta-skip"
                id="skipThoughts"
                type="button"
                onClick={showLanding}
              >
                SKIP ↗
              </button>
            </div>
          </div>
        </>
      )}

      {/* Ambient background atmosphere */}
      <div className="ambient" aria-hidden="true">
        <div className="haze" />
        <div className="lens" ref={lensRef}>
          <div className="lens-caustic-ring" />
        </div>
        <div className="light-streak" />
        <div className="light-streak two" />
        <span className="grain-dot" style={{ left: '17%', top: '26%', animationDelay: '1s' }} />
        <span className="grain-dot" style={{ left: '72%', top: '19%', animationDelay: '3s' }} />
        <span className="grain-dot" style={{ left: '81%', top: '72%', animationDelay: '2s' }} />
        <span className="grain-dot" style={{ left: '31%', top: '79%', animationDelay: '5s' }} />
        <span className="grain-dot" style={{ left: '60%', top: '63%', animationDelay: '4s' }} />
      </div>

      {/* BrandLens Reactive Toast Notification Banner */}
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-[999999] max-w-md p-4 rounded-xl shadow-2xl backdrop-blur-2xl border flex items-center gap-3.5 transition-all duration-300 animate-fade-in ${
            toast.type === 'success'
              ? 'bg-[#0e1915]/95 border-emerald-500/50 text-emerald-200 shadow-[0_12px_40px_rgba(16,185,129,0.25)]'
              : toast.type === 'error'
              ? 'bg-[#1f0e13]/95 border-red-500/50 text-red-200 shadow-[0_12px_40px_rgba(239,68,68,0.25)]'
              : toast.type === 'warning'
              ? 'bg-[#211909]/95 border-amber-500/50 text-amber-200 shadow-[0_12px_40px_rgba(245,158,11,0.25)]'
              : 'bg-[#101322]/95 border-cyan-500/50 text-cyan-200 shadow-[0_12px_40px_rgba(156,236,255,0.2)]'
          }`}
        >
          <div className="flex-shrink-0">
            {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-red-400" />}
            {toast.type === 'warning' && <AlertTriangle size={18} className="text-amber-400" />}
            {toast.type === 'info' && <Info size={18} className="text-cyan-400" />}
          </div>
          <div className="flex-1 text-xs sm:text-[13px] font-mono leading-relaxed">
            {toast.message}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/40 hover:text-white transition-colors p-1 -mr-1 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </aside>
      )}

      {/* Alive Atmosphere: Constellation particle canvas (gather/burst/free), cursor glow, and top progress */}
      <AliveAtmosphere isIntroActive={introVisible && !introDone} activeTab={activeTab} />

      {/* Movable Floating BrandLens AI Assistant */}
      <FloatingAssistant
        isCurrentTabHelp={activeTab === 'help'}
        onFocusHelpPage={() => navigateTab('help')}
        currentUser={currentUser}
        currentCompany={currentCompany}
      />

      {/* ========================================================
          FULL-STACK APPLICATION WORKSPACE (CEO or TEAM ROLE)
          ======================================================== */}
      {dashboardActive && currentUser ? (
        <div className={`transition-opacity duration-1000 ease-out ${(!introVisible || siteVisible) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {currentUser.role === 'Administrator' || currentUser.loginId.toLowerCase() === 'brandlens@gmail.com' ? (
            <AdminPanel
              currentAdmin={currentUser}
              onLogout={handleLogout}
              onImpersonateCompany={(comp, user) => {
                if (!adminUserSession) {
                  setAdminUserSession(currentUser);
                  sessionStorage.setItem('brandlens_admin_root', JSON.stringify(currentUser));
                }
                setCurrentCompany(comp);
                setCurrentUser(user);
                sessionStorage.setItem('brandlens_session', JSON.stringify({ company: comp, user }));
                showToast(`Switched into workspace: ${comp.name}`, 'success');
              }}
              onShowToast={showToast}
            />
          ) : currentUser.role === 'CEO' && currentCompany ? (
            <CeoWorkspace
              company={currentCompany}
              currentUser={currentUser}
              onLogout={handleLogout}
              onCompanyUpdate={handleCompanyUpdate}
              onUserUpdate={handleUserUpdate}
              onShowToast={showToast}
              onReturnToAdmin={adminUserSession ? handleReturnToAdmin : undefined}
            />
          ) : (
            <div className="min-h-screen bg-[#08090d]/60 relative z-20 flex">
              {/* Responsive Sidebar */}
              <Sidebar
                currentTab={activeTab}
                onSelectTab={navigateTab}
                username={currentUser.name || currentUser.username || currentUser.loginId}
                role={currentUser.role}
                companyName={currentCompany?.name}
                companyCategory={currentCompany?.category}
                onLogout={handleLogout}
                mobileOpen={mobileMenuOpen}
                onCloseMobile={() => setMobileMenuOpen(false)}
                pendingCount={metrics.pending}
                unreadMessagesCount={unreadMessages}
              />

              {/* Main Content Area */}
              <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
                <Header
                  title={
                    activeTab === 'dashboard'
                      ? 'WORKSPACE DASHBOARD'
                      : activeTab === 'new-post'
                      ? 'CREATE NEW POST'
                      : activeTab === 'enhancer'
                      ? 'AI ENHANCER STUDIO'
                      : activeTab === 'pending'
                      ? 'PENDING POSTS QUEUE'
                      : activeTab === 'history'
                      ? 'PUBLISHING HISTORY & AUDIT LOG'
                      : activeTab === 'messages'
                      ? 'TEAM MESSAGING & DIRECTORY'
                      : activeTab === 'data-security'
                      ? 'DATA SOVEREIGNTY & SECURITY'
                      : activeTab === 'help'
                      ? 'HELP & SYSTEM GUIDELINES'
                      : 'ABOUT BRANDLENS PLATFORM'
                  }
                  role={currentUser.role}
                  companyName={currentCompany?.name}
                  onOpenMobile={() => setMobileMenuOpen(true)}
                />

                <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
                  <TabParticleTransition tabKey={activeTab}>
                    {activeTab === 'dashboard' && (
                      <DashboardView
                        role={currentUser.role}
                        metrics={metrics}
                        posts={posts}
                        username={currentUser.loginId || currentUser.username || ''}
                        organizationId={currentCompany?.id}
                        companyName={currentCompany?.name}
                        onPostUpdated={handlePostUpdated}
                        onCreateNew={() => navigateTab('new-post')}
                      />
                    )}

                    {activeTab === 'new-post' && (
                      <NewPost
                        role={currentUser.role}
                        authorUsername={currentUser.loginId || currentUser.username || ''}
                        organizationId={currentCompany?.id}
                        companyName={currentCompany?.name}
                        companyCategory={currentCompany?.category}
                        onPostSaved={handlePostSaved}
                        onCancel={() => navigateTab('dashboard')}
                      />
                    )}

                    {activeTab === 'enhancer' && (
                      <EnhancerView
                        userRole={currentUser.role}
                        username={currentUser.loginId || currentUser.username || ''}
                        organizationId={currentCompany?.id}
                        companyName={currentCompany?.name}
                        companyCategory={currentCompany?.category}
                        onSendToNewPost={() => {
                          navigateTab('new-post');
                        }}
                      />
                    )}

                    {activeTab === 'pending' && (
                      <PendingView
                        posts={posts}
                        username={currentUser.loginId || currentUser.username || ''}
                        onPostUpdated={handlePostUpdated}
                        onCreateNew={() => navigateTab('new-post')}
                        onEditDraft={() => navigateTab('new-post')}
                      />
                    )}

                    {activeTab === 'history' && (
                      <HistoryView
                        posts={posts}
                        username={currentUser.loginId || currentUser.username || ''}
                        onPostUpdated={handlePostUpdated}
                        onCreateNew={() => navigateTab('new-post')}
                      />
                    )}

                    {activeTab === 'messages' && currentUser && (
                      <MessagesView
                        currentUser={currentUser}
                        currentCompany={currentCompany}
                        onShowToast={showToast}
                      />
                    )}

                    {activeTab === 'data-security' && (
                      <DataSecurityView />
                    )}

                    {activeTab === 'help' && (
                      <HelpView
                        currentUser={currentUser}
                        currentCompany={currentCompany}
                        onNavigateTab={navigateTab}
                      />
                    )}

                    {activeTab === 'about' && (
                      <AboutView
                        onNavigateToDashboard={() => navigateTab('dashboard')}
                        onNavigateToHelp={() => navigateTab('help')}
                      />
                    )}
                  </TabParticleTransition>
                </main>
              </div>

              {/* ── Team Member Sequential Workspace Guide ── */}
              <WorkspaceGuide
                activeTab={activeTab}
                steps={TEAM_GUIDE_STEPS}
                storageKey="brandlens_team_guide_v1"
                padding={22}
                active={true}
              />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Main Landing Site */}
          <main className={`site ${siteVisible ? 'visible' : ''}`} id="site">
            <LandingPage
              onOpenLogin={() => {
                setGuestAboutOpen(false);
                openLogin('register');
              }}
              onOpenAbout={() => {
                setGuestAboutOpen(true);
              }}
              onReplayIntro={handleReplayIntro}
              phraseIndex={phraseIndex}
              onCyclePhrase={(e) => {
                e.stopPropagation();
                setPhraseIndex((prev) => (prev + 1) % HERO_PHRASES.length);
              }}
              onSetPhraseIndex={(pIdx) => {
                setPhraseIndex(pIdx);
              }}
              heroPhrases={HERO_PHRASES}
            />

            {/* Guest Full Governance / About Page Overlay */}
            {guestAboutOpen && (
              <div
                className="fixed inset-0 z-40 bg-[#08090d]/95 backdrop-blur-2xl overflow-y-auto pt-10 pb-20 px-4 sm:px-8 animate-fade-in"
                role="dialog"
                aria-modal="true"
                aria-label="BrandLens Governance Documentation"
              >
                <div className="max-w-6xl mx-auto">
                  <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <span className="brandmark" aria-hidden="true" />
                      <span className="font-mono text-sm text-white font-semibold">
                        BrandLens Documentation
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setGuestAboutOpen(false);
                          openLogin('register');
                        }}
                        className="nav-enter"
                      >
                        <span>ENTER BRANDLENS</span>
                        <span aria-hidden="true">↗</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuestAboutOpen(false)}
                        className="px-3.5 py-2 rounded border border-white/10 hover:border-white/30 text-xs font-mono text-[#a4a3b2] hover:text-white transition-colors cursor-pointer"
                        aria-label="Close documentation"
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>

                  <AboutView
                    onClose={() => setGuestAboutOpen(false)}
                    onNavigateToHelp={() => {
                      setGuestAboutOpen(false);
                      openLogin('register');
                    }}
                  />
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* ========================================================
          ROLE-BASED AUTH MODAL
          ======================================================== */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        autoLoginConfig={autoLoginConfig}
        onClose={() => {
          setAuthModalOpen(false);
          setAutoLoginConfig(null);
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* ========================================================
          BIG PROFILE WELCOME ANIMATION (Welcome CEO, Welcome EMPLOYEE)
          ======================================================== */}
      {welcomeProfile && (
        <ProfileWelcomeOverlay
          role={welcomeProfile.role}
          userName={welcomeProfile.name}
          companyName={welcomeProfile.companyName}
          department={welcomeProfile.department}
          onComplete={() => setWelcomeProfile(null)}
        />
      )}

      {/* ========================================================
          SILENT AUDIO ENGINE — zero UI, plays on first user interaction
          ======================================================== */}
      <SilentAudioEngine />
    </div>
  );
}
