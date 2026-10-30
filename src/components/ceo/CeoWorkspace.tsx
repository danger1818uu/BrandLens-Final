import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Company,
  UserAccount,
  CompanyGuidelinesBundle,
  CompanyAIPrompt,
  CompanyCategory,
  Role,
  Platform,
  CompanyPlatformConfig
} from '../../types';
import { apiClient } from '../../services/api';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Power,
  Trash2,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Info,
  Radio,
  Sparkles
} from 'lucide-react';
import { MessagesView } from '../messages/MessagesView';
import { TabParticleTransition } from '../common/TabParticleTransition';
import { WorkspaceGuide } from '../tour/WorkspaceGuide';
import type { WorkspaceGuideStep } from '../tour/WorkspaceGuide';

// ─── CEO Guide Steps ──────────────────────────────────────────────────────────
//  Step 0  Dashboard       'auto'        fires 2.2 s after login
//  Step 1  About Company   'auto'        fires 1.2 s after step 0 OK
//  Step 2  Guidelines      'tab-switch'  fires when user switches ANY tab after step 1 OK
//  Step 3  Connected Accts 'tab-switch'  fires when user switches ANY tab after step 2 OK
//  Step 4  Team Messages   'tab-switch'  fires when user switches ANY tab after step 3 OK
//  Step 5  CEO Account     'tab-switch'  fires when user switches ANY tab after step 4 OK
//  Step 6  Log Out         'auto'        fires 1.2 s after step 5 OK (button always visible)
const CEO_GUIDE_STEPS: WorkspaceGuideStep[] = [
  {
    trigger: 'auto',
    targetSelector: '[data-tour-id="ceo-nav-dashboard"]',
    icon: '⌘',
    description: 'This is your <strong>Dashboard</strong> — a live overview of your company workspace, team counts and employee directory all in one place.',
    delay: 2200,
  },
  {
    trigger: 'auto',
    targetSelector: '[data-tour-id="ceo-nav-company"]',
    icon: '◉',
    description: 'Click on <strong>"About Company"</strong> to view and edit the company details, brand voice and structure. Keeping this accurate lets the AI generate brand-correct content.',
    delay: 1200,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="ceo-nav-guidelines"]',
    icon: '◇',
    description: 'Open <strong>"Guidelines"</strong> to define company-wide rules and role-specific policies. Saved guidelines are instantly compiled into AI review instructions for your team.',
    delay: 800,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="ceo-nav-connected-accounts"]',
    icon: '⚡',
    description: 'Set up <strong>"Connected Accounts"</strong> to link your LinkedIn, Instagram and X credentials — this enables your team to publish posts directly from BrandLens.',
    delay: 800,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="ceo-nav-messages"]',
    icon: '💬',
    description: 'Use <strong>"Team Messages"</strong> to communicate with your team, discuss drafts and coordinate publishing — all without leaving BrandLens.',
    delay: 800,
  },
  {
    trigger: 'tab-switch',
    targetSelector: '[data-tour-id="ceo-nav-ceo-account"]',
    icon: '🛡️',
    description: 'Manage your <strong>CEO Account & Security</strong> — update your executive profile, rotate your master password and review security settings.',
    delay: 800,
  },
  {
    trigger: 'auto',
    targetSelector: '[data-tour-id="ceo-nav-logout"]',
    icon: '⎋',
    description: 'When you\'re done exploring, click <strong>"Log Out"</strong> to securely end your CEO session. Your team can then log in with their own credentials.',
    delay: 1200,
  },
];

interface CeoWorkspaceProps {
  company: Company;
  currentUser: UserAccount;
  onLogout: () => void;
  onCompanyUpdate?: (updated: Company) => void;
  onUserUpdate?: (updated: UserAccount) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onReturnToAdmin?: () => void;
}

type CeoTab = 'dashboard' | 'company' | 'guidelines' | 'connected-accounts' | 'messages' | 'ceo-account';
type TeamFilter = 'all' | 'employees' | 'managers' | 'hods';

const CATEGORIES: CompanyCategory[] = [
  'Technology',
  'Cosmetics',
  'Education',
  'Services',
  'Art and Design',
  'Healthcare',
  'Finance',
  'E-commerce',
  'Media and Entertainment',
  'Manufacturing',
  'Consulting',
  'Other'
];

export function CeoWorkspace({
  company: initialCompany,
  currentUser,
  onLogout,
  onCompanyUpdate,
  onUserUpdate,
  onShowToast,
  onReturnToAdmin
}: CeoWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<CeoTab>('dashboard');
  const [company, setCompany] = useState<Company>(initialCompany);
  const [teamMembers, setTeamMembers] = useState<UserAccount[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('employees');

  // CEO Viewport Main Scroll Container Ref
  const ceoMainRef = useRef<HTMLElement>(null);

  // Smoothly reset scroll position to top whenever active tab changes
  useEffect(() => {
    ceoMainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Employee' | 'Manager' | 'HOD'>('Employee');
  const [submittingMember, setSubmittingMember] = useState(false);
  const [createdLoginId, setCreatedLoginId] = useState<string | null>(null);

  // About Company Form State
  const [aboutForm, setAboutForm] = useState({
    name: initialCompany.name,
    category: initialCompany.category,
    description: initialCompany.description,
    productsServices: initialCompany.productsServices,
    targetAudience: initialCompany.targetAudience,
    brandVoice: initialCompany.brandVoice,
    approvedTerminology: initialCompany.approvedTerminology,
    companyContext: initialCompany.companyContext
  });
  const [savingAbout, setSavingAbout] = useState(false);

  // Guidelines Form State
  const [guidelines, setGuidelines] = useState<CompanyGuidelinesBundle>({
    companyWide: '',
    employee: '',
    manager: '',
    hod: '',
    platformLinkedIn: '',
    platformInstagram: '',
    platformX: ''
  });
  const [guidelineVersion, setGuidelineVersion] = useState<number>(initialCompany.guidelineVersion);
  const [savingGuidelines, setSavingGuidelines] = useState(false);

  // AI Prompts Configuration State
  const [aiPrompt, setAiPrompt] = useState<CompanyAIPrompt | null>(null);
  const [regeneratingPrompt, setRegeneratingPrompt] = useState(false);

  // Manage Member Modal State
  const [selectedMember, setSelectedMember] = useState<UserAccount | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageForm, setManageForm] = useState({
    name: '',
    role: 'Employee' as Role,
    status: 'active' as 'active' | 'suspended',
    department: '',
    permissions: ''
  });
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingMemberProfile, setSavingMemberProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);
  const [manageActiveTab, setManageActiveTab] = useState<'profile' | 'password' | 'danger'>('profile');

  // CEO Self Account & Executive Management State
  const [ceoUser, setCeoUser] = useState<UserAccount>(currentUser);
  const [ceoProfileForm, setCeoProfileForm] = useState({
    name: currentUser.name,
    loginId: currentUser.loginId
  });
  const [ceoPasswordForm, setCeoPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
    showPassword: false
  });
  const [savingCeoProfile, setSavingCeoProfile] = useState(false);
  const [savingCeoPassword, setSavingCeoPassword] = useState(false);
  const [isCeoManageModalOpen, setIsCeoManageModalOpen] = useState(false);
  const [ceoManageActiveTab, setCeoManageActiveTab] = useState<'profile' | 'password' | 'security'>('profile');

  // CEO Real-Time Messages Indicator State
  const [ceoUnreadMessages, setCeoUnreadMessages] = useState<number>(0);

  const fetchCeoUnread = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const count = await apiClient.getUnreadMessageCount(company.id, ceoUser.id);
      setCeoUnreadMessages((prev) => (prev === count ? prev : count));
    } catch {}
  }, [company.id, ceoUser.id]);

  useEffect(() => {
    fetchCeoUnread();
    const interval = setInterval(fetchCeoUnread, 6000);
    return () => clearInterval(interval);
  }, [fetchCeoUnread]);

  const onUserUpdateRef = useRef(onUserUpdate);
  onUserUpdateRef.current = onUserUpdate;

  // Load team members from backend
  const loadTeam = useCallback(async () => {
    try {
      setLoadingTeam(true);
      const team = await apiClient.getCeoTeam(company.id);
      setTeamMembers(team);
    } catch (err: any) {
      console.error('Failed to load team:', err);
    } finally {
      setLoadingTeam(false);
    }
  }, [company.id]);

  // Load CEO executive profile from backend
  const loadCeoProfile = useCallback(async () => {
    try {
      const data = await apiClient.getCeoProfile(company.id);
      if (data && data.ceo) {
        setCeoUser(data.ceo);
        setCeoProfileForm({
          name: data.ceo.name,
          loginId: data.ceo.loginId
        });
        if (data.ceo.name !== currentUser.name || data.ceo.loginId !== currentUser.loginId) {
          onUserUpdateRef.current?.(data.ceo);
        }
      }
    } catch (err: any) {
      console.warn('Could not load separate CEO profile, using currentUser:', err);
    }
  }, [company.id, currentUser.name, currentUser.loginId]);

  // Load company details & prompts
  const loadCompanyData = useCallback(async () => {
    try {
      const data = await apiClient.getCeoCompany(company.id);
      setCompany(data.company);
      setAiPrompt(data.prompt);
      setAboutForm({
        name: data.company.name,
        category: data.company.category,
        description: data.company.description,
        productsServices: data.company.productsServices,
        targetAudience: data.company.targetAudience,
        brandVoice: data.company.brandVoice,
        approvedTerminology: data.company.approvedTerminology,
        companyContext: data.company.companyContext
      });
    } catch (err: any) {
      console.error('Failed to load company details:', err);
    }
  }, [company.id]);

  // Load guidelines
  const loadGuidelines = useCallback(async () => {
    try {
      const data = await apiClient.getCeoGuidelines(company.id);
      setGuidelines(data.guidelines);
      setGuidelineVersion(data.guidelineVersion);
      if (data.prompt) setAiPrompt(data.prompt);
    } catch (err: any) {
      console.error('Failed to load guidelines:', err);
    }
  }, [company.id]);

  // Platform configurations state for CEO Connected Accounts
  const [platformConfigs, setPlatformConfigs] = useState<CompanyPlatformConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState<Platform | null>(null);
  const [testingPlatform, setTestingPlatform] = useState<Platform | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [platformForms, setPlatformForms] = useState<Record<Platform, {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    pageId: string;
    accountName: string;
    accountIdentifier: string;
    isActive: boolean;
    showSecret: boolean;
    showToken: boolean;
  }>>({
    LinkedIn: { clientId: '', clientSecret: '', accessToken: '', pageId: '', accountName: '', accountIdentifier: '', isActive: true, showSecret: false, showToken: false },
    Instagram: { clientId: '', clientSecret: '', accessToken: '', pageId: '', accountName: '', accountIdentifier: '', isActive: true, showSecret: false, showToken: false },
    X: { clientId: '', clientSecret: '', accessToken: '', pageId: '', accountName: '', accountIdentifier: '', isActive: true, showSecret: false, showToken: false }
  });

  const loadPlatformConfigs = useCallback(async () => {
    try {
      setLoadingConfigs(true);
      const configs = await apiClient.getCeoPlatformConfigs(company.id);
      setPlatformConfigs(configs);

      setPlatformForms((prev) => {
        const next = { ...prev };
        configs.forEach((cfg) => {
          next[cfg.platform] = {
            clientId: cfg.clientId || '',
            clientSecret: '',
            accessToken: '',
            pageId: cfg.pageId || '',
            accountName: cfg.accountName || '',
            accountIdentifier: cfg.accountIdentifier || '',
            isActive: cfg.isActive,
            showSecret: false,
            showToken: false
          };
        });
        return next;
      });
    } catch (err: any) {
      console.error('Failed to load CEO platform configs:', err);
    } finally {
      setLoadingConfigs(false);
    }
  }, [company.id]);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        onShowToast(`Successfully connected ${event.data.platform || 'social'} channel!`, 'success');
        loadPlatformConfigs();
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [loadPlatformConfigs, onShowToast]);

  const handleSavePlatformConfig = async (plat: Platform) => {
    const form = platformForms[plat];
    try {
      setSavingPlatform(plat);
      const res = await apiClient.saveCeoPlatformConfig(company.id, {
        platform: plat,
        clientId: form.clientId,
        clientSecret: form.clientSecret,
        accessToken: form.accessToken,
        pageId: form.pageId,
        accountName: form.accountName,
        accountIdentifier: form.accountIdentifier,
        isActive: form.isActive
      });

      onShowToast(res.message || `${plat} credentials saved successfully!`, 'success');
      await loadPlatformConfigs();
    } catch (err: any) {
      onShowToast(err.message || `Failed to save ${plat} configuration`, 'error');
    } finally {
      setSavingPlatform(null);
    }
  };

  const handleTestPlatformConfig = async (plat: Platform) => {
    try {
      setTestingPlatform(plat);
      const res = await apiClient.testCeoPlatformConfig(company.id, plat);
      onShowToast(res.message || `${plat} connection test successful!`, 'success');
    } catch (err: any) {
      onShowToast(err.message || `Failed to verify ${plat} credentials`, 'error');
    } finally {
      setTestingPlatform(null);
    }
  };

  const handleTogglePlatformActive = async (plat: Platform, currentActive: boolean) => {
    try {
      await apiClient.toggleCeoPlatformConfig(company.id, plat, !currentActive);
      onShowToast(`${plat} publishing is now ${!currentActive ? 'active' : 'paused'} for employees.`, 'info');
      await loadPlatformConfigs();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to toggle platform status', 'error');
    }
  };

  const handleClearPlatformConfig = async (plat: Platform) => {
    if (!window.confirm(`Are you sure you want to remove the credentials for ${plat}? Employees will not be able to publish to ${plat} until you reconfigure it.`)) {
      return;
    }
    try {
      await apiClient.deleteCeoPlatformConfig(company.id, plat);
      onShowToast(`${plat} credentials cleared.`, 'success');
      await loadPlatformConfigs();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to clear platform credentials', 'error');
    }
  };

  const handleOAuthConnect = async (plat: Platform, mode?: string) => {
    try {
      const url = await apiClient.getAuthUrl(plat, mode, company.id);
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        url,
        `brandlens_ceo_oauth_${plat.toLowerCase()}`,
        `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
      );

      if (!authWindow) {
        onShowToast('Popup was blocked by your browser. Please allow popups for this site.', 'warning');
      }
    } catch (err: any) {
      onShowToast(err.message || `Failed to initiate ${plat} connection`, 'error');
    }
  };

  const handleCopyHelper = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
    onShowToast(`Copied ${key} to clipboard!`);
  };

  useEffect(() => {
    let active = true;
    const fetchWorkspaceData = async () => {
      try {
        await Promise.allSettled([
          loadCeoProfile(),
          loadTeam(),
          loadCompanyData(),
          loadGuidelines(),
          loadPlatformConfigs()
        ]);
      } catch (err) {
        console.error('Error fetching initial CEO workspace data:', err);
      }
    };
    fetchWorkspaceData();
    return () => {
      active = false;
    };
  }, [company.id, loadPlatformConfigs]);

  // Computed counts for KPI cards
  const employeeCount = teamMembers.filter((m) => m.role === 'Employee').length;
  const managerCount = teamMembers.filter((m) => m.role === 'Manager').length;
  const hodCount = teamMembers.filter((m) => m.role === 'HOD').length;
  const totalTeamCount = employeeCount + managerCount + hodCount;

  // Filtered directory (CEO featured at the top when viewing all members)
  const displayedMembers = [
    ...(teamFilter === 'all' ? [ceoUser] : []),
    ...teamMembers.filter((m) => {
      if (teamFilter === 'all') return true;
      if (teamFilter === 'employees') return m.role === 'Employee';
      if (teamFilter === 'managers') return m.role === 'Manager';
      if (teamFilter === 'hods') return m.role === 'HOD';
      return true;
    })
  ];

  // Meta for team view headers & actions
  const teamMeta = {
    employees: {
      title: 'Employee directory',
      description: 'Manage the people creating content for your company.',
      add: '＋ ADD EMPLOYEE',
      role: 'Employee' as const
    },
    managers: {
      title: 'Manager directory',
      description: 'Manage the people reviewing and coordinating team content.',
      add: '＋ ADD MANAGER',
      role: 'Manager' as const
    },
    hods: {
      title: 'HOD directory',
      description: 'Manage department leads and specialist reviewers.',
      add: '＋ ADD HOD',
      role: 'HOD' as const
    },
    all: {
      title: 'Everyone in your team',
      description: 'A combined view of employees, managers and HODs.',
      add: '＋ ADD TEAM MEMBER',
      role: 'Employee' as const
    }
  };

  // Ref for smooth auto-scroll to team directory
  const teamDirectoryRef = useRef<HTMLDivElement>(null);

  // Smooth scroll and feedback when KPI box is selected
  const handleSelectTeamFilter = (filter: TeamFilter) => {
    setTeamFilter(filter);
    setTimeout(() => {
      teamDirectoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
    const filterLabels: Record<TeamFilter, string> = {
      all: 'All Organization Roles',
      employees: 'Employees (Content Creators)',
      managers: 'Managers (Review & Compliance)',
      hods: 'Department HODs (Specialist Sign-Off)'
    };
    onShowToast(`Filtered view: ${filterLabels[filter]}`, 'info');
  };

  // Scroll lock and ESC key handling when any modal is open
  useEffect(() => {
    const hasOpenModal = isAddModalOpen || isManageModalOpen || isCeoManageModalOpen;
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('brandlens-modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('brandlens-modal-open');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (isManageModalOpen) setIsManageModalOpen(false);
        if (isCeoManageModalOpen) setIsCeoManageModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('brandlens-modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddModalOpen, isManageModalOpen, isCeoManageModalOpen]);

  // Helper for initials avatar
  const getInitials = (name: string) => {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || '')
      .join('')
      .toUpperCase();
  };

  // Handle Add Member via backend API
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPassword.trim()) {
      onShowToast('Please fill in both name and password.', 'warning');
      return;
    }

    try {
      setSubmittingMember(true);
      const newMember = await apiClient.createTeamMember({
        companyId: company.id,
        name: newMemberName.trim(),
        password: newMemberPassword.trim(),
        role: newMemberRole
      });

      setCreatedLoginId(newMember.loginId);
      onShowToast(`Account created for ${newMember.name}: ${newMember.loginId}`, 'success');
      await loadTeam();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create team account', 'error');
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setNewMemberName('');
    setNewMemberPassword('');
    setCreatedLoginId(null);
  };

  const openAddModal = (role?: 'Employee' | 'Manager' | 'HOD') => {
    if (role) {
      setNewMemberRole(role);
    } else {
      setNewMemberRole(teamMeta[teamFilter].role);
    }
    setCreatedLoginId(null);
    setNewMemberName('');
    setNewMemberPassword('');
    setIsAddModalOpen(true);
  };

  // Open Manage Member Modal
  const handleOpenManageModal = (member: UserAccount) => {
    if (member.role === 'CEO') {
      setCeoProfileForm({
        name: member.name,
        loginId: member.loginId
      });
      setCeoPasswordForm({ newPassword: '', confirmPassword: '', showPassword: false });
      setCeoManageActiveTab('profile');
      setIsCeoManageModalOpen(true);
      return;
    }
    setSelectedMember(member);
    setManageForm({
      name: member.name,
      role: member.role,
      status: member.status || 'active',
      department: member.department || (member.role === 'HOD' ? 'Systems Architecture' : member.role === 'Manager' ? 'Technical Operations' : 'Cloud Engineering'),
      permissions: member.permissions || (member.role === 'HOD' ? 'Departmental Sign-Off' : member.role === 'Manager' ? 'Full Publishing' : 'Review Required')
    });
    setNewPasswordInput('');
    setShowPassword(false);
    setConfirmDeleteOpen(false);
    setManageActiveTab('profile');
    setIsManageModalOpen(true);
  };

  const handleOpenCeoAccountManagement = (tab: 'profile' | 'password' | 'security' = 'profile') => {
    setCeoProfileForm({
      name: ceoUser.name,
      loginId: ceoUser.loginId
    });
    setCeoPasswordForm({ newPassword: '', confirmPassword: '', showPassword: false });
    setCeoManageActiveTab(tab);
    setIsCeoManageModalOpen(true);
  };

  const handleCloseCeoManageModal = () => {
    setIsCeoManageModalOpen(false);
    setCeoPasswordForm({ newPassword: '', confirmPassword: '', showPassword: false });
  };

  const handleSaveCeoProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ceoProfileForm.name.trim() || !ceoProfileForm.loginId.trim()) {
      onShowToast('CEO name and login ID cannot be empty');
      return;
    }
    try {
      setSavingCeoProfile(true);
      const updated = await apiClient.updateCeoProfile({
        companyId: company.id,
        name: ceoProfileForm.name.trim(),
        loginId: ceoProfileForm.loginId.trim()
      });
      setCeoUser(updated);
      onUserUpdate?.(updated);
      onShowToast(`CEO Executive profile updated: ${updated.name} (${updated.loginId})`, 'success');
      setIsCeoManageModalOpen(false);
      await loadTeam();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update CEO profile', 'error');
    } finally {
      setSavingCeoProfile(false);
    }
  };

  const handleChangeCeoPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ceoPasswordForm.newPassword || ceoPasswordForm.newPassword.trim().length < 6) {
      onShowToast('Password must be at least 6 characters long', 'warning');
      return;
    }
    if (ceoPasswordForm.newPassword !== ceoPasswordForm.confirmPassword) {
      onShowToast('New password and confirmation do not match', 'warning');
      return;
    }
    try {
      setSavingCeoPassword(true);
      await apiClient.changeCeoPassword({
        companyId: company.id,
        newPassword: ceoPasswordForm.newPassword.trim()
      });
      onShowToast('CEO master credentials updated successfully!', 'success');
      setCeoPasswordForm({ newPassword: '', confirmPassword: '', showPassword: false });
      setIsCeoManageModalOpen(false);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to change CEO password', 'error');
    } finally {
      setSavingCeoPassword(false);
    }
  };

  const generateCeoRandomPassword = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    const pwd = `BrandLens#Ceo${num}!`;
    setCeoPasswordForm(prev => ({
      ...prev,
      newPassword: pwd,
      confirmPassword: pwd,
      showPassword: true
    }));
    onShowToast(`Generated temporary executive key: ${pwd}`);
  };

  const handleCloseManageModal = () => {
    setIsManageModalOpen(false);
    setSelectedMember(null);
    setNewPasswordInput('');
    setConfirmDeleteOpen(false);
  };

  const handleSaveMemberProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      setSavingMemberProfile(true);
      const updated = await apiClient.updateTeamMember(selectedMember.id, {
        companyId: company.id,
        name: manageForm.name.trim(),
        role: manageForm.role,
        status: manageForm.status,
        department: manageForm.department.trim(),
        permissions: manageForm.permissions
      });
      setSelectedMember(updated);
      onShowToast(`Profile for ${updated.name} updated successfully!`, 'success');
      await loadTeam();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update member profile', 'error');
    } finally {
      setSavingMemberProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (!newPasswordInput || newPasswordInput.trim().length < 6) {
      onShowToast('Password must be at least 6 characters long', 'warning');
      return;
    }
    try {
      setSavingPassword(true);
      await apiClient.changeTeamMemberPassword(selectedMember.id, {
        companyId: company.id,
        newPassword: newPasswordInput.trim()
      });
      onShowToast(`Password changed successfully for ${selectedMember.name}`, 'success');
      setNewPasswordInput('');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    try {
      setDeletingMember(true);
      await apiClient.deleteTeamMember(selectedMember.id, company.id);
      onShowToast(`Account for ${selectedMember.name} has been deleted.`, 'success');
      handleCloseManageModal();
      await loadTeam();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete account', 'error');
    } finally {
      setDeletingMember(false);
    }
  };

  const generateRandomPassword = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    const safePrefix = (company.name || 'Brand').replace(/[^a-zA-Z]/g, '').slice(0, 8) || 'Brand';
    const pwd = `${safePrefix}#${num}!`;
    setNewPasswordInput(pwd);
    setShowPassword(true);
    onShowToast(`Generated temporary password: ${pwd}`);
  };

  // Export team members as CSV
  const handleExportTeam = () => {
    if (teamMembers.length === 0) {
      onShowToast('No team members to export.');
      return;
    }
    const headers = ['Name', 'Login ID', 'Role', 'Company ID', 'Created At'];
    const rows = teamMembers.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.loginId}"`,
      `"${m.role}"`,
      `"${m.companyId}"`,
      `"${new Date(m.createdAt).toISOString()}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `brandlens-team-${company.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Team directory exported as CSV.');
  };

  // Handle Save About Company
  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingAbout(true);
      const res = await apiClient.updateCeoCompany(company.id, aboutForm);
      setCompany(res.company);
      onCompanyUpdate?.(res.company);
      onShowToast('Company profile saved! AI instructions regenerated.');
      const prompt = await apiClient.getCeoPrompts(company.id);
      setAiPrompt(prompt);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update company profile');
    } finally {
      setSavingAbout(false);
    }
  };

  // Handle Save Guidelines
  const handleSaveGuidelines = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGuidelines(true);
      const res = await apiClient.updateCeoGuidelines(company.id, guidelines);
      setGuidelineVersion(res.guidelineVersion);
      
      // Refresh prompt status from server
      const prompt = await apiClient.getCeoPrompts(company.id);
      setAiPrompt(prompt);
      
      if (prompt && prompt.generationStatus === 'needs_refresh') {
        onShowToast(`Guidelines saved (v${res.guidelineVersion}). AI prompt sync pending.`, 'info');
      } else {
        onShowToast(`Guidelines saved (v${res.guidelineVersion}) and AI instructions refreshed!`, 'success');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save guidelines', 'error');
    } finally {
      setSavingGuidelines(false);
    }
  };

  // Handle Manual Force Re-sync
  const handleRegeneratePrompt = async () => {
    try {
      setRegeneratingPrompt(true);
      const updatedPrompt = await apiClient.regenerateCeoPrompts(company.id);
      setAiPrompt(updatedPrompt);
      onShowToast('Company AI instructions successfully synchronized!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to regenerate prompt', 'error');
    } finally {
      setRegeneratingPrompt(false);
    }
  };

  const companyInitials = getInitials(company.name) || 'BL';

  return (
    <div className="ceo-workspace open" id="ceoWorkspace">
      {/* CEO Sidebar (Left Navigation) */}
      <aside className="ceo-sidebar">
        <div className="ceo-brand">
          <span className="brandmark" aria-hidden="true" />
          <div>
            <div className="ceo-brand-name">BrandLens</div>
            <span className="ceo-brand-sub">COMPANY WORKSPACE</span>
          </div>
        </div>

        {/* Company Switcher Profile Card */}
        <div className="company-switcher">
          <div className="company-avatar">{companyInitials}</div>
          <div style={{ minWidth: 0 }}>
            <strong>{company.name}</strong>
            <small>{company.category} · CEO workspace</small>
          </div>
        </div>

        <div className="ceo-nav-label">ORGANISATION</div>
        <nav className="ceo-nav" aria-label="CEO navigation">
          <button
            className={`ceo-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            type="button"
            data-tour-id="ceo-nav-dashboard"
          >
            <span className="nav-icon">⌘</span>
            <span>Dashboard</span>
          </button>
          <button
            className={`ceo-nav-btn ${activeTab === 'company' ? 'active' : ''}`}
            onClick={() => setActiveTab('company')}
            type="button"
            data-tour-id="ceo-nav-company"
          >
            <span className="nav-icon">◉</span>
            <span>About Company</span>
          </button>
          <button
            className={`ceo-nav-btn ${activeTab === 'guidelines' ? 'active' : ''}`}
            onClick={() => setActiveTab('guidelines')}
            type="button"
            data-tour-id="ceo-nav-guidelines"
          >
            <span className="nav-icon">◇</span>
            <span>Guidelines</span>
          </button>
          <button
            className={`ceo-nav-btn ${activeTab === 'connected-accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('connected-accounts')}
            type="button"
            title="Configure platform credentials (App Secret, Tokens) for employee 1-click publishing"
            data-tour-id="ceo-nav-connected-accounts"
          >
            <span className="nav-icon">⚡</span>
            <span>Connected Accounts</span>
          </button>
          {onReturnToAdmin && (
            <button
              className="ceo-nav-btn"
              onClick={onReturnToAdmin}
              type="button"
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#6ee7b7',
                marginBottom: '4px'
              }}
              title="Return to BrandLens Admin Platform"
            >
              <span className="nav-icon">🛡️</span>
              <span>Admin Console</span>
              <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.8 }}>&larr;</span>
            </button>
          )}
          <button
            className={`ceo-nav-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
            type="button"
            title="Brand Team Directory & Direct Messaging"
            style={{ position: 'relative' }}
            data-tour-id="ceo-nav-messages"
          >
            <span className="nav-icon">💬</span>
            <span>Team Messages</span>
            {ceoUnreadMessages > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  lineHeight: '1.2',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.7)',
                  animation: 'pulse 2s infinite'
                }}
              >
                {ceoUnreadMessages}
              </span>
            )}
          </button>
          <button
            className={`ceo-nav-btn ${activeTab === 'ceo-account' ? 'active' : ''}`}
            onClick={() => setActiveTab('ceo-account')}
            type="button"
            title="Manage CEO Profile, Credentials, and Master Key"
            data-tour-id="ceo-nav-ceo-account"
          >
            <span className="nav-icon">🛡️</span>
            <span>CEO Account &amp; Security</span>
          </button>

          {/* Log Out */}
          <div className="ceo-nav-divider" />
          <button
            className="ceo-nav-btn ceo-nav-logout"
            id="ceoNavLogout"
            onClick={onLogout}
            type="button"
            title="Log out of CEO workspace"
            data-tour-id="ceo-nav-logout"
          >
            <span className="nav-icon">⎋</span>
            <span>Log Out</span>
            <span className="nav-logout-arrow">↗</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <strong>One workspace. Your rules.</strong>
            Set the company context and team guidelines that shape how content is reviewed.
          </div>
        </div>
      </aside>

      {/* ── CEO Sequential Guide ── */}
      <WorkspaceGuide
        activeTab={activeTab}
        steps={CEO_GUIDE_STEPS}
        storageKey="brandlens_ceo_guide_v1"
        padding={22}
        active={true}
      />

      {/* CEO Main Viewport */}
      <section className="ceo-main" ref={ceoMainRef}>
        {/* Sticky Topbar */}
        <header className="ceo-topbar">
          <div className="ceo-mobile-brand">
            <span className="brandmark" aria-hidden="true" />
            <strong>BrandLens</strong>
          </div>
          <div className="ceo-breadcrumb">
            {company.name.toUpperCase()} <span>/ CEO WORKSPACE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onReturnToAdmin && (
              <button
                type="button"
                onClick={onReturnToAdmin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#6ee7b7',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Return to BrandLens Platform Admin Console"
              >
                <span>🛡️</span>
                <span>Admin Console</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: ceoUnreadMessages > 0 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${ceoUnreadMessages > 0 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                color: ceoUnreadMessages > 0 ? '#fca5a5' : '#cbd5e1',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Team Direct Messages"
            >
              <span>💬</span>
              <span>Messages</span>
              {ceoUnreadMessages > 0 ? (
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {ceoUnreadMessages}
                </span>
              ) : (
                <span style={{ color: '#64748b', fontSize: '10px' }}>0</span>
              )}
            </button>

            <div
              className="ceo-top-actions"
              onClick={() => handleOpenCeoAccountManagement('profile')}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              title="Click to manage CEO profile, credentials, and master password"
              role="button"
              tabIndex={0}
            >
              <span className="ui-only-tag" style={{ background: 'rgba(166, 139, 255, 0.15)', borderColor: 'rgba(166, 139, 255, 0.4)', color: '#c4b5fd' }}>
                👑 CEO Root Owner
              </span>
              <div className="ceo-avatar" style={{ border: '1px solid #a68bff', boxShadow: '0 0 10px rgba(166, 139, 255, 0.35)' }}>
                {companyInitials}
              </div>
              <div className="ceo-person">
                <strong>{ceoUser.name}</strong>
                <small style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#9cecff' }}>{ceoUser.loginId}</small>
              </div>
              <span style={{ fontSize: '10px', color: '#c4b5fd', background: 'rgba(166, 139, 255, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(166, 139, 255, 0.3)' }}>
                Manage ⚙
              </span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="ceo-content">
          <TabParticleTransition tabKey={activeTab}>
            {/* ========================================================
                TAB 1: DASHBOARD
                ======================================================== */}
          {activeTab === 'dashboard' && (
            <section className="ceo-page active" data-ceo-content="dashboard">
              <div className="ceo-page-head">
                <div>
                  <div className="ceo-kicker">OVERVIEW / 01</div>
                  <h1>
                    Your company,
                    <br />
                    <span style={{ color: '#b5a7e4' }}>at a glance.</span>
                  </h1>
                  <p>
                    Manage your team, define responsibilities, and build the company context behind every piece of content.
                  </p>
                </div>
                <div className="ceo-date">
                  WORKSPACE STATUS &nbsp; <span style={{ color: '#9ce6c5' }}>● ACTIVE</span>
                </div>
              </div>

              {/* KPI Cards with Smooth Auto-Scroll */}
              <div className="ceo-kpis">
                <button
                  className={`ceo-kpi ${teamFilter === 'employees' ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleSelectTeamFilter('employees')}
                >
                  <div className="kpi-top">
                    <span>EMPLOYEES</span>
                    <span className="kpi-mark">♙</span>
                  </div>
                  <div className="kpi-value" id="countEmployees">
                    {employeeCount}
                  </div>
                  <div className="kpi-foot">
                    Content creators · <span>View team ↗</span>
                  </div>
                </button>

                <button
                  className={`ceo-kpi ${teamFilter === 'managers' ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleSelectTeamFilter('managers')}
                >
                  <div className="kpi-top">
                    <span>MANAGERS</span>
                    <span className="kpi-mark">◇</span>
                  </div>
                  <div className="kpi-value" id="countManagers">
                    {managerCount}
                  </div>
                  <div className="kpi-foot">
                    Review &amp; coordination · <span>View team ↗</span>
                  </div>
                </button>

                <button
                  className={`ceo-kpi ${teamFilter === 'hods' ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleSelectTeamFilter('hods')}
                >
                  <div className="kpi-top">
                    <span>HODs</span>
                    <span className="kpi-mark">⌘</span>
                  </div>
                  <div className="kpi-value" id="countHods">
                    {hodCount}
                  </div>
                  <div className="kpi-foot">
                    Department leads · <span>View team ↗</span>
                  </div>
                </button>

                <button
                  className={`ceo-kpi ${teamFilter === 'all' ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleSelectTeamFilter('all')}
                >
                  <div className="kpi-top">
                    <span>TOTAL TEAM</span>
                    <span className="kpi-mark">↗</span>
                  </div>
                  <div className="kpi-value" id="countTotal">
                    {totalTeamCount}
                  </div>
                  <div className="kpi-foot">
                    Across all team roles · <span>View all ↗</span>
                  </div>
                </button>
              </div>

              {/* Directory Section Header & Tools with Smooth Scroll Anchor */}
              <div ref={teamDirectoryRef} id="teamDirectorySection" className="ceo-section-head scroll-mt-6">
                <div>
                  <h2 id="teamHeading">{teamMeta[teamFilter].title}</h2>
                  <p id="teamDescription">{teamMeta[teamFilter].description}</p>
                </div>
                <div className="ceo-section-tools">
                  <button className="subtle-button" id="exportTeam" onClick={handleExportTeam} type="button">
                    EXPORT LIST ↓
                  </button>
                  <button
                    className="ceo-add-btn"
                    id="addTeamMember"
                    onClick={() => openAddModal()}
                    type="button"
                  >
                    {teamMeta[teamFilter].add}
                  </button>
                </div>
              </div>

              {/* Executive CEO Account Spotlight Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(166, 139, 255, 0.08) 0%, rgba(9, 10, 18, 0.8) 100%)',
                  border: '1px solid rgba(166, 139, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 16px rgba(166, 139, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(166, 139, 255, 0.25), rgba(156, 236, 255, 0.15))',
                      border: '1px solid rgba(166, 139, 255, 0.6)',
                      boxShadow: '0 0 14px rgba(166, 139, 255, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      color: '#ffffff',
                      flexShrink: 0
                    }}
                  >
                    👑
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>{ceoUser.name}</span>
                      <span className="role-chip" style={{ background: 'rgba(166, 139, 255, 0.2)', borderColor: 'rgba(166, 139, 255, 0.4)', color: '#e2ddfe', fontSize: '9px', padding: '2px 8px' }}>
                        CEO · ROOT OWNER
                      </span>
                      <span className="status-chip" style={{ color: '#9ce6c5', borderColor: 'rgba(156, 230, 197, 0.3)', fontSize: '9px', padding: '2px 8px' }}>
                        ● ACTIVE (PROTECTED)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '11px', color: '#8e8b9e' }}>
                      <span style={{ fontFamily: 'var(--mono)', color: '#9cecff' }}>{ceoUser.loginId}</span>
                      <span>·</span>
                      <span>Executive Leadership</span>
                      <span>·</span>
                      <span style={{ color: '#c4b5fd' }}>PBKDF2 Secured</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="primary-cta"
                    style={{ padding: '6px 14px', fontSize: '10px', height: '30px' }}
                    type="button"
                    onClick={() => handleOpenCeoAccountManagement('profile')}
                    title="Edit CEO Display Name and Official Executive Email"
                  >
                    <span>MANAGE CEO ACCOUNT</span>
                    <span style={{ fontSize: '10px', marginLeft: '4px' }}>⚙</span>
                  </button>
                  <button
                    className="subtle-button"
                    style={{ padding: '6px 12px', fontSize: '10px', height: '30px', borderColor: 'rgba(156, 236, 255, 0.3)', color: '#9cecff' }}
                    type="button"
                    onClick={() => handleOpenCeoAccountManagement('password')}
                    title="Change Master Executive Password"
                  >
                    <span>CHANGE PASSWORD 🔒</span>
                  </button>
                  <button
                    className="subtle-button"
                    style={{ padding: '6px 10px', fontSize: '10px', height: '30px' }}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(ceoUser.loginId);
                      onShowToast(`Copied CEO Login ID: ${ceoUser.loginId}`);
                    }}
                    title="Copy CEO Login ID"
                  >
                    <span>📋 COPY ID</span>
                  </button>
                </div>
              </div>

              {/* Team Table */}
              <div className="team-table-wrap">
                <table className="team-table">
                  <thead>
                    <tr>
                      <th>TEAM MEMBER</th>
                      <th>LOGIN ID</th>
                      <th>DESIGNATION</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody id="teamTableBody">
                    {loadingTeam ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#8e8b9e' }}>
                          Loading team accounts...
                        </td>
                      </tr>
                    ) : displayedMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#8e8b9e' }}>
                          No accounts found in this category. Click &ldquo;{teamMeta[teamFilter].add}&rdquo; above to create one.
                        </td>
                      </tr>
                    ) : (
                      displayedMembers.map((member) => (
                        <tr
                          key={member.id}
                          className="team-row-interactive"
                          onClick={() => handleOpenManageModal(member)}
                          title={`Click to manage ${member.name}'s account (Change password, role, delete account)`}
                          style={member.role === 'CEO' ? { background: 'rgba(166, 139, 255, 0.05)', borderBottom: '1px solid rgba(166, 139, 255, 0.2)' } : undefined}
                        >
                          <td>
                            <div className="team-member">
                              <span
                                className="member-mark"
                                style={{
                                  borderColor: member.role === 'CEO' ? '#a68bff' : member.status === 'suspended' ? '#f87171' : 'rgba(166, 139, 255, 0.4)',
                                  boxShadow: member.role === 'CEO' ? '0 0 12px rgba(166, 139, 255, 0.4)' : member.status === 'suspended' ? '0 0 10px rgba(248, 113, 113, 0.3)' : '0 0 10px rgba(166, 139, 255, 0.2)',
                                  color: member.role === 'CEO' ? '#ffffff' : undefined
                                }}
                              >
                                {member.role === 'CEO' ? '👑' : getInitials(member.name)}
                              </span>
                              <span className="member-name">
                                <strong>{member.name} {member.role === 'CEO' && <span style={{ color: '#c4b5fd', fontSize: '10px' }}>· Owner</span>}</strong>
                                <small>{member.department || (member.role === 'CEO' ? 'Executive Leadership' : 'Engineering')} · {company.name}</small>
                              </span>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#9cecff' }}>
                            {member.loginId}
                          </td>
                          <td>
                            <span className="role-chip" style={member.role === 'CEO' ? { background: 'rgba(166, 139, 255, 0.2)', borderColor: 'rgba(166, 139, 255, 0.4)' } : undefined}>
                              {member.role === 'CEO' ? '👑 CEO / OWNER' : member.role.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span
                              className="status-chip"
                              style={{
                                color: member.role === 'CEO' ? '#9ce6c5' : member.status === 'suspended' ? '#f87171' : '#9ce6c5',
                                borderColor: member.role === 'CEO' ? 'rgba(156, 230, 197, 0.4)' : member.status === 'suspended' ? 'rgba(248, 113, 113, 0.3)' : 'rgba(156, 230, 197, 0.25)'
                              }}
                            >
                              {member.role === 'CEO' ? '● ROOT OWNER' : member.status === 'suspended' ? '● SUSPENDED' : '● ACTIVE'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                className="primary-cta"
                                style={{ padding: '4px 10px', fontSize: '9px', minWidth: 'auto', height: '24px' }}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenManageModal(member);
                                }}
                                title="Open account management controls"
                              >
                                <span>{member.role === 'CEO' ? 'MANAGE CEO' : 'MANAGE'}</span>
                                <span style={{ fontSize: '10px', marginLeft: '3px' }}>⚙</span>
                              </button>
                              <button
                                className="subtle-button"
                                style={{ padding: '4px 8px', fontSize: '9px', height: '24px' }}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(member.loginId);
                                  onShowToast(`Copied ${member.loginId} to clipboard.`);
                                }}
                              >
                                Copy ID
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p className="ceo-footnote">
                Enterprise directory with real tenant isolation. Accounts created here are stored securely with PBKDF2 hash encryption.
              </p>
            </section>
          )}

          {/* ========================================================
              TAB 2: ABOUT COMPANY
              ======================================================== */}
          {activeTab === 'company' && (
            <section className="ceo-page active" data-ceo-content="company">
              <div className="ceo-page-head">
                <div>
                  <div className="ceo-kicker">COMPANY PROFILE / 02</div>
                  <h1>
                    Give your brand
                    <br />
                    <span style={{ color: '#b5a7e4' }}>its own context.</span>
                  </h1>
                  <p>
                    These details help BrandLens understand what your company does, who it speaks to and how it should sound.
                  </p>
                </div>
                <div className="ceo-date">PROFILE &nbsp; / &nbsp; {company.name.toUpperCase()}</div>
              </div>

              <div className="ceo-two-col">
                <div className="ceo-panel">
                  <h2>Company information</h2>
                  <p className="ceo-panel-intro">
                    Keep this profile accurate. Company-specific AI instructions are generated from the saved profile and the latest guidelines.
                  </p>

                  <form className="ceo-form" id="companyProfileForm" onSubmit={handleSaveAbout}>
                    <div className="field">
                      <label htmlFor="profileCompanyName">Company name</label>
                      <input
                        id="profileCompanyName"
                        value={aboutForm.name}
                        onChange={(e) => setAboutForm({ ...aboutForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="profileCategory">Category</label>
                      <select
                        id="profileCategory"
                        value={aboutForm.category}
                        onChange={(e) => setAboutForm({ ...aboutForm, category: e.target.value as any })}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field full">
                      <label htmlFor="profileDescription">About the company</label>
                      <textarea
                        id="profileDescription"
                        rows={5}
                        value={aboutForm.description}
                        onChange={(e) => setAboutForm({ ...aboutForm, description: e.target.value })}
                        placeholder="Comprehensive summary of company mission, history, and core competency..."
                        required
                      />
                    </div>

                    <div className="field full">
                      <label htmlFor="profileServices">Products and services</label>
                      <textarea
                        id="profileServices"
                        rows={5}
                        value={aboutForm.productsServices}
                        onChange={(e) => setAboutForm({ ...aboutForm, productsServices: e.target.value })}
                        placeholder="Key offerings, server tiers, managed solutions, and platform features..."
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="profileAudience">Target audience</label>
                      <input
                        id="profileAudience"
                        value={aboutForm.targetAudience}
                        onChange={(e) => setAboutForm({ ...aboutForm, targetAudience: e.target.value })}
                        placeholder="e.g. Enterprise IT leads, DevOps engineers, CTOs"
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="profileVoice">Brand voice</label>
                      <input
                        id="profileVoice"
                        value={aboutForm.brandVoice}
                        onChange={(e) => setAboutForm({ ...aboutForm, brandVoice: e.target.value })}
                        placeholder="e.g. Precise, authoritative, customer-focused"
                      />
                    </div>

                    <div className="field full">
                      <label htmlFor="profileTerminology">Approved terminology</label>
                      <textarea
                        id="profileTerminology"
                        className="terminology-textarea"
                        rows={3}
                        value={aboutForm.approvedTerminology}
                        onChange={(e) => setAboutForm({ ...aboutForm, approvedTerminology: e.target.value })}
                        placeholder="e.g. Zero-trust architecture, NVMe storage, 99.99% uptime SLA..."
                      />
                    </div>

                    <div className="field full">
                      <label htmlFor="profileContext">Additional relevant company context</label>
                      <textarea
                        id="profileContext"
                        rows={5}
                        value={aboutForm.companyContext}
                        onChange={(e) => setAboutForm({ ...aboutForm, companyContext: e.target.value })}
                        placeholder="Operational boundaries, compliance standards, upcoming milestones..."
                      />
                    </div>

                    <div className="ceo-form-actions">
                      <button
                        className="subtle-button"
                        type="button"
                        onClick={() => {
                          setAboutForm({
                            name: company.name,
                            category: company.category,
                            description: company.description,
                            productsServices: company.productsServices,
                            targetAudience: company.targetAudience,
                            brandVoice: company.brandVoice,
                            approvedTerminology: company.approvedTerminology,
                            companyContext: company.companyContext
                          });
                          onShowToast('Form reset to saved profile.');
                        }}
                      >
                        RESET FORM
                      </button>
                      <button className="primary-cta" type="submit" disabled={savingAbout}>
                        <span>{savingAbout ? 'SAVING...' : 'SAVE CHANGES'}</span>
                        <span className="arrow">↗</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Context Card */}
                <aside className="context-card">
                  <div className="context-symbol">✳</div>
                  <div className="ceo-kicker">WHY THIS MATTERS</div>
                  <h3>Company facts shape the AI&apos;s point of view.</h3>
                  <p>
                    When this information is saved, the system refreshes the company&apos;s compact AI instructions. Text generation, enhancement and image prompts then use the latest approved context.
                  </p>
                  <div className="context-rule" />
                  <div className="context-stat">
                    <span>Profile version</span>
                    <strong>v{company.profileVersion}</strong>
                  </div>
                  <div className="context-stat">
                    <span>AI context status</span>
                    <strong style={{ color: '#9ce6c5' }}>{aiPrompt?.generationStatus || 'Current'}</strong>
                  </div>
                  <div className="context-stat">
                    <span>Config version</span>
                    <strong>v{aiPrompt?.configurationVersion || 1}</strong>
                  </div>
                  <div className="context-stat">
                    <span>Last updated</span>
                    <strong>{new Date(company.updatedAt).toLocaleDateString()}</strong>
                  </div>

                  {aiPrompt && (
                    <div style={{ marginTop: '14px', marginBottom: '14px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(166,139,255,0.2)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: '#a68bff', letterSpacing: '0.08em' }}>
                          SYNCED AI CONTEXT
                        </span>
                        <span style={{ fontSize: '10px', color: '#9ce6c5' }}>FreeLLM Powered</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#d0d0df', lineHeight: 1.5, margin: 0 }}>
                        {aiPrompt.compactCompanyContext || 'Prompts generated based on profile & guidelines.'}
                      </p>
                    </div>
                  )}

                  <button
                    className="subtle-button"
                    type="button"
                    onClick={() => setActiveTab('guidelines')}
                  >
                    CONTINUE TO GUIDELINES ↗
                  </button>
                </aside>
              </div>
            </section>
          )}

          {/* ========================================================
              TAB 3: GUIDELINES
              ======================================================== */}
          {activeTab === 'guidelines' && (
            <section className="ceo-page active" data-ceo-content="guidelines">
              <div className="ceo-page-head">
                <div>
                  <div className="ceo-kicker">CONTENT GOVERNANCE / 03</div>
                  <h1>
                    Set the rules.
                    <br />
                    <span style={{ color: '#b5a7e4' }}>Keep the signal clear.</span>
                  </h1>
                  <p>
                    Define what your team can say, how each role should work, and which claims must be checked before a post moves forward.
                  </p>
                </div>
                <div className="ceo-date">GUIDELINES &nbsp; / &nbsp; VERSION {guidelineVersion}</div>
              </div>

              <div className="guideline-grid">
                {/* 01: Company-wide */}
                <article className="guideline-card guideline-global">
                  <div className="guideline-card-head">
                    <div className="guideline-title">
                      <span className="guideline-icon">◉</span>
                      <div>
                        <h3>Company-wide guidelines</h3>
                        <p>Rules that apply across the organisation</p>
                      </div>
                    </div>
                    <span className="role-chip">ALL TEAM</span>
                  </div>
                  <textarea
                    id="guidelineCompany"
                    value={guidelines.companyWide}
                    onChange={(e) => setGuidelines({ ...guidelines, companyWide: e.target.value })}
                  />
                  <div className="guideline-footer">
                    <span>Applies to all supported content workflows</span>
                    <span>01 / 04</span>
                  </div>
                </article>

                {/* 02: Employee */}
                <article className="guideline-card">
                  <div className="guideline-card-head">
                    <div className="guideline-title">
                      <span className="guideline-icon">♙</span>
                      <div>
                        <h3>Employee guidelines</h3>
                        <p>Drafting and submission rules</p>
                      </div>
                    </div>
                    <span className="role-chip">EMPLOYEE</span>
                  </div>
                  <textarea
                    id="guidelineEmployee"
                    value={guidelines.employee}
                    onChange={(e) => setGuidelines({ ...guidelines, employee: e.target.value })}
                  />
                  <div className="guideline-footer">
                    <span>Creator permissions</span>
                    <span>02 / 04</span>
                  </div>
                </article>

                {/* 03: Manager */}
                <article className="guideline-card">
                  <div className="guideline-card-head">
                    <div className="guideline-title">
                      <span className="guideline-icon">◇</span>
                      <div>
                        <h3>Manager guidelines</h3>
                        <p>Review and coordination</p>
                      </div>
                    </div>
                    <span className="role-chip">MANAGER</span>
                  </div>
                  <textarea
                    id="guidelineManager"
                    value={guidelines.manager}
                    onChange={(e) => setGuidelines({ ...guidelines, manager: e.target.value })}
                  />
                  <div className="guideline-footer">
                    <span>Review responsibilities</span>
                    <span>03 / 04</span>
                  </div>
                </article>

                {/* 04: HOD */}
                <article className="guideline-card">
                  <div className="guideline-card-head">
                    <div className="guideline-title">
                      <span className="guideline-icon">⌘</span>
                      <div>
                        <h3>HOD guidelines</h3>
                        <p>Department-level expertise</p>
                      </div>
                    </div>
                    <span className="role-chip">HOD</span>
                  </div>
                  <textarea
                    id="guidelineHod"
                    value={guidelines.hod}
                    onChange={(e) => setGuidelines({ ...guidelines, hod: e.target.value })}
                  />
                  <div className="guideline-footer">
                    <span>Specialist review responsibilities</span>
                    <span>04 / 04</span>
                  </div>
                </article>

                {/* 05: Prompt Configuration Status Card */}
                <article className="guideline-card">
                  <div className="guideline-card-head">
                    <div className="guideline-title">
                      <span className="guideline-icon">✳</span>
                      <div>
                        <h3>Prompt configuration status</h3>
                        <p>Active company AI context</p>
                      </div>
                    </div>
                    <span className={`status-chip ${aiPrompt?.generationStatus === 'current' ? '' : 'text-amber-400 border-amber-400/30 bg-amber-400/10'}`}>
                      {aiPrompt?.generationStatus === 'current' ? '● SYNCHRONIZED' : '▲ PENDING SYNC'}
                    </span>
                  </div>
                  <p className="ceo-panel-intro" style={{ marginTop: '5px' }}>
                    Saving guidelines updates company policies immediately. If prompt sync needs refresh, you can safely retry below without losing your saved guidelines.
                  </p>
                  <div className="context-stat">
                    <span>Guidelines version</span>
                    <strong style={{ color: '#9ce6c5' }}>v{guidelineVersion} (Saved)</strong>
                  </div>
                  <div className="context-stat">
                    <span>AI prompt sync status</span>
                    <strong style={{ color: aiPrompt?.generationStatus === 'current' ? '#9ce6c5' : '#ffd166' }}>
                      {aiPrompt?.generationStatus === 'current' ? 'Synchronized' : 'Re-sync Required'}
                    </strong>
                  </div>
                  <div className="context-stat">
                    <span>Active config version</span>
                    <strong>v{aiPrompt?.configurationVersion || 1}</strong>
                  </div>

                  {aiPrompt && (
                    <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', fontSize: '11px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: '#9cecff', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Employee Draft Instructions:</span>
                        <span style={{ color: '#d0d0df', fontSize: '10.5px', lineHeight: 1.4 }}>{aiPrompt.employeeInstructions || 'Standard governance policies'}</span>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: '#9cecff', fontWeight: 600, display: 'block', marginBottom: '2px' }}>AI Image Generation Guidance:</span>
                        <span style={{ color: '#d0d0df', fontSize: '10.5px', lineHeight: 1.4 }}>{aiPrompt.imageGenerationInstructions || 'Brand-aligned photorealistic visuals'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#9cecff', fontWeight: 600, display: 'block', marginBottom: '2px' }}>AI Text Enhancement Guidance:</span>
                        <span style={{ color: '#d0d0df', fontSize: '10.5px', lineHeight: 1.4 }}>{aiPrompt.textEnhancementInstructions || 'Tone and brand authority'}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="subtle-button"
                      type="button"
                      onClick={handleRegeneratePrompt}
                      disabled={regeneratingPrompt}
                    >
                      {regeneratingPrompt ? 'SYNCING AI PROMPTS...' : '⚡ RETRY / FORCE SYNC PROMPTS'}
                    </button>
                    {aiPrompt?.generationStatus !== 'current' && (
                      <span style={{ fontSize: '10px', color: '#ffd166' }}>
                        Guidelines are saved.
                      </span>
                    )}
                  </div>
                </article>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', marginTop: '19px' }}>
                <button
                  className="subtle-button"
                  type="button"
                  onClick={() => setActiveTab('company')}
                >
                  ← ABOUT COMPANY
                </button>
                <button
                  className="primary-cta"
                  id="saveGuidelines"
                  type="button"
                  onClick={handleSaveGuidelines}
                  disabled={savingGuidelines}
                >
                  <span>{savingGuidelines ? 'SAVING...' : 'SAVE GUIDELINES'}</span>
                  <span className="arrow">↗</span>
                </button>
              </div>
            </section>
          )}

          {/* ========================================================
              TAB 4: CONNECTED ACCOUNTS & PLATFORM CREDENTIALS (CEO)
              ======================================================== */}
          {activeTab === 'connected-accounts' && (
            <section className="ceo-page active" data-ceo-content="connected-accounts">
              <div className="ceo-page-head">
                <div>
                  <div className="ceo-kicker">PLATFORM INTEGRATIONS / 04</div>
                  <h1>
                    Connect company channels,
                    <br />
                    <span style={{ color: '#b5a7e4' }}>employees just click post.</span>
                  </h1>
                  <p>
                    As CEO, configure the official social publishing channels (LinkedIn, Instagram, X) and their required API secrets, tokens, and page identifiers. Once saved and active, all employees across your organization can publish approved posts directly with one click without managing credentials.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div className="ceo-date">
                    CHANNELS STATUS &nbsp; / &nbsp; <span style={{ color: '#9ce6c5' }}>{platformConfigs.filter(c => c.isConfigured && c.isActive).length} OF 3 ACTIVE</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadPlatformConfigs}
                    disabled={loadingConfigs}
                    className="subtle-button"
                    style={{ fontSize: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Refresh channel configs"
                  >
                    <RefreshCw size={12} className={loadingConfigs ? 'animate-spin text-[#a68bff]' : ''} />
                    <span>REFRESH CHANNELS</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="ceo-kpis" style={{ marginBottom: '28px' }}>
                <div className="ceo-kpi active" style={{ cursor: 'default' }}>
                  <div className="kpi-top">
                    <span>CONFIGURED CHANNELS</span>
                    <span className="kpi-mark">⚡</span>
                  </div>
                  <div className="kpi-value">
                    {platformConfigs.filter(c => c.isConfigured).length} <span style={{ fontSize: '14px', color: '#8e8b9e' }}>/ 3</span>
                  </div>
                  <div className="kpi-foot">
                    <span>LinkedIn, Instagram, X</span>
                  </div>
                </div>

                <div className="ceo-kpi" style={{ cursor: 'default' }}>
                  <div className="kpi-top">
                    <span>EMPLOYEE 1-CLICK POST</span>
                    <span className="kpi-mark">✓</span>
                  </div>
                  <div className="kpi-value" style={{ fontSize: '20px', color: '#9ce6c5' }}>
                    READY
                  </div>
                  <div className="kpi-foot">
                    <span>Zero employee config needed</span>
                  </div>
                </div>

                <div className="ceo-kpi" style={{ cursor: 'default' }}>
                  <div className="kpi-top">
                    <span>CREDENTIAL SECURITY</span>
                    <span className="kpi-mark">🛡️</span>
                  </div>
                  <div className="kpi-value" style={{ fontSize: '20px', color: '#c4b5fd' }}>
                    VAULT
                  </div>
                  <div className="kpi-foot">
                    <span>AES-256 PBKDF2 Encrypted</span>
                  </div>
                </div>
              </div>

              {/* Platform Cards */}
              <div style={{ display: 'grid', gap: '24px' }}>
                {(['LinkedIn', 'Instagram', 'X'] as Platform[]).map((plat) => {
                  const config = platformConfigs.find(c => c.platform === plat);
                  const form = platformForms[plat] || {
                    clientId: '',
                    clientSecret: '',
                    accessToken: '',
                    pageId: '',
                    accountName: '',
                    accountIdentifier: '',
                    isActive: true,
                    showSecret: false,
                    showToken: false
                  };

                  const isConfigured = Boolean(config?.isConfigured);
                  const isActive = config ? config.isActive : form.isActive;
                  const isSaving = savingPlatform === plat;
                  const isTesting = testingPlatform === plat;
                  const computedRedirectUri = config?.redirectUri || `${window.location.origin}/api/auth/callback/${plat.toLowerCase()}`;

                  return (
                    <div
                      key={plat}
                      style={{
                        background: 'linear-gradient(135deg, rgba(20, 22, 34, 0.7) 0%, rgba(10, 11, 18, 0.85) 100%)',
                        border: '1px solid rgba(166, 139, 255, 0.22)',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(16px)'
                      }}
                    >
                      {/* Top Bar: Platform Identity & Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              background: plat === 'LinkedIn' ? 'rgba(156, 236, 255, 0.12)' : plat === 'Instagram' ? 'rgba(255, 156, 217, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                              border: `1px solid ${plat === 'LinkedIn' ? 'rgba(156, 236, 255, 0.35)' : plat === 'Instagram' ? 'rgba(255, 156, 217, 0.35)' : 'rgba(255, 255, 255, 0.2)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'var(--mono)',
                              fontWeight: 800,
                              fontSize: '18px',
                              color: plat === 'LinkedIn' ? '#9cecff' : plat === 'Instagram' ? '#ff9cd9' : '#ffffff'
                            }}
                          >
                            {plat === 'LinkedIn' && 'in'}
                            {plat === 'Instagram' && 'ig'}
                            {plat === 'X' && '𝕏'}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                                {plat}
                              </h3>
                              {isConfigured && (
                                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#c4b5fd' }}>
                                  {config?.accountIdentifier || '@company'}
                                </span>
                              )}
                            </div>
                            <small style={{ color: '#8e8b9e', fontSize: '12px' }}>
                              {plat === 'LinkedIn' && 'Professional organization page updates, rich articles, and team leadership content.'}
                              {plat === 'Instagram' && 'Visual asset showcases, corporate aesthetics, and verified product highlights.'}
                              {plat === 'X' && 'Real-time corporate announcements, technical status updates, and developer relations.'}
                            </small>
                          </div>
                        </div>

                        {/* Status Badges & Quick Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {isConfigured ? (
                            <span
                              className="status-chip"
                              style={{
                                color: isActive ? '#9ce6c5' : '#ffd166',
                                borderColor: isActive ? 'rgba(156, 230, 197, 0.4)' : 'rgba(255, 209, 102, 0.4)',
                                background: isActive ? 'rgba(156, 230, 197, 0.1)' : 'rgba(255, 209, 102, 0.1)',
                                padding: '4px 10px',
                                fontSize: '10px'
                              }}
                            >
                              {isActive ? '● CONNECTED & ACTIVE' : '⏸ PAUSED FOR EMPLOYEES'}
                            </span>
                          ) : (
                            <span
                              className="status-chip"
                              style={{
                                color: '#ffd166',
                                borderColor: 'rgba(255, 209, 102, 0.3)',
                                background: 'rgba(255, 209, 102, 0.08)',
                                padding: '4px 10px',
                                fontSize: '10px'
                              }}
                            >
                              ○ SETUP REQUIRED
                            </span>
                          )}

                          {isConfigured && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleTogglePlatformActive(plat, isActive)}
                                className="subtle-button"
                                style={{ padding: '4px 10px', fontSize: '11px', height: '28px', color: isActive ? '#9ce6c5' : '#ffd166' }}
                                title={isActive ? 'Pause publishing for employees' : 'Activate publishing for employees'}
                              >
                                <Power size={13} style={{ marginRight: '4px' }} />
                                <span>{isActive ? 'Active' : 'Paused'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleClearPlatformConfig(plat)}
                                className="subtle-button"
                                style={{ padding: '4px 10px', fontSize: '11px', height: '28px', color: '#ff9aa7', borderColor: 'rgba(255, 154, 167, 0.3)' }}
                                title="Disconnect and clear stored platform credentials"
                              >
                                <Trash2 size={13} style={{ marginRight: '4px' }} />
                                <span>Clear</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Configured Channel Banner */}
                      {isConfigured && (
                        <div
                          style={{
                            background: 'rgba(0, 0, 0, 0.45)',
                            border: '1px solid rgba(156, 230, 197, 0.25)',
                            borderRadius: '8px',
                            padding: '14px 18px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <CheckCircle2 size={16} className="text-emerald-400" />
                              <strong style={{ fontSize: '13px', color: '#ffffff', fontFamily: 'var(--mono)' }}>
                                {config?.accountName || `${company.name} Official`} ({config?.accountIdentifier || '@company'})
                              </strong>
                              <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(156, 230, 197, 0.15)', color: '#9ce6c5', border: '1px solid rgba(156, 230, 197, 0.3)' }}>
                                1-Click Employee Publishing Active
                              </span>
                            </div>
                            <div style={{ marginTop: '4px', fontSize: '11px', color: '#8e8b9e', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                              <span>Token: <strong style={{ color: '#9cecff', fontFamily: 'var(--mono)' }}>{config?.accessTokenMasked || 'Verified in Vault'}</strong></span>
                              <span>·</span>
                              <span>Secret: <strong style={{ color: config?.hasClientSecret ? '#34d399' : '#ffd166' }}>{config?.hasClientSecret ? 'Stored in Vault' : 'Not set'}</strong></span>
                              <span>·</span>
                              <span>Updated: {new Date(config?.updatedAt || '').toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleTestPlatformConfig(plat)}
                              disabled={isTesting}
                              className="subtle-button"
                              style={{ padding: '6px 12px', fontSize: '10px', height: '28px', color: '#9cecff', borderColor: 'rgba(156, 236, 255, 0.3)' }}
                              title="Test if the configured token successfully connects to the API"
                            >
                              {isTesting ? (
                                <Loader2 size={12} className="animate-spin text-[#9cecff]" />
                              ) : (
                                <ShieldCheck size={12} className="text-[#9cecff]" />
                              )}
                              <span>TEST CONNECTION ↗</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Credential Configuration Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSavePlatformConfig(plat);
                        }}
                        style={{ display: 'grid', gap: '16px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', letterSpacing: '0.08em', color: '#c4b5fd', textTransform: 'uppercase' }}>
                            Configure Platform Credentials &amp; Tokens
                          </span>
                          <span style={{ fontSize: '10px', color: '#8e8b9e' }}>
                            Update credentials anytime below
                          </span>
                        </div>

                        {/* Row 1: Client ID & Secret */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                          <div className="field">
                            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{plat === 'Instagram' ? 'Meta App ID' : 'Client ID / App ID'}</span>
                              <span style={{ color: '#8e8b9e', fontSize: '9px' }}>Public Identifier</span>
                            </label>
                            <input
                              type="text"
                              value={form.clientId}
                              onChange={(e) => setPlatformForms(prev => ({
                                ...prev,
                                [plat]: { ...prev[plat], clientId: e.target.value }
                              }))}
                              placeholder={plat === 'LinkedIn' ? 'e.g. 78abcde12345' : plat === 'Instagram' ? 'e.g. 102938475610293' : 'e.g. your_x_client_id'}
                            />
                          </div>

                          <div className="field">
                            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{plat === 'Instagram' ? 'Meta App Secret' : 'App Secret / Client Secret'}</span>
                              <span style={{ color: config?.hasClientSecret ? '#34d399' : '#8e8b9e', fontSize: '9px' }}>
                                {config?.hasClientSecret ? '● Encrypted in Vault' : 'Required'}
                              </span>
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input
                                type={form.showSecret ? 'text' : 'password'}
                                value={form.clientSecret}
                                onChange={(e) => setPlatformForms(prev => ({
                                  ...prev,
                                  [plat]: { ...prev[plat], clientSecret: e.target.value }
                                }))}
                                placeholder={config?.hasClientSecret ? '•••••••••••• (Leave blank to keep existing secret)' : 'Enter Client / App Secret'}
                                style={{ paddingRight: '40px' }}
                              />
                              <button
                                type="button"
                                onClick={() => setPlatformForms(prev => ({
                                  ...prev,
                                  [plat]: { ...prev[plat], showSecret: !prev[plat].showSecret }
                                }))}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8e8b9e', cursor: 'pointer', padding: '4px' }}
                                title={form.showSecret ? 'Hide secret' : 'Show secret'}
                              >
                                {form.showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            <small style={{ color: '#8e8b9e', fontSize: '10px', marginTop: '2px' }}>
                              {config?.hasClientSecret ? 'To change, type a new secret above. Otherwise leave empty to keep the saved secret.' : 'Provided in your developer portal application settings.'}
                            </small>
                          </div>
                        </div>

                        {/* Row 2: Access Token */}
                        <div className="field">
                          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{plat === 'Instagram' ? 'Page / System Access Token' : 'Access Token (Bearer / Long-Lived Token)'}</span>
                            <span style={{ color: config?.hasAccessToken ? '#34d399' : '#ffd166', fontSize: '9px' }}>
                              {config?.hasAccessToken ? '● Token Active in Vault' : 'Required for Direct Posting'}
                            </span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={form.showToken ? 'text' : 'password'}
                              value={form.accessToken}
                              onChange={(e) => setPlatformForms(prev => ({
                                ...prev,
                                [plat]: { ...prev[plat], accessToken: e.target.value }
                              }))}
                              placeholder={config?.hasAccessToken ? `${config.accessTokenMasked || '••••••••••••'} (Leave blank to keep existing token)` : 'Paste Page Access Token or OAuth Bearer Token here'}
                              style={{ paddingRight: '40px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setPlatformForms(prev => ({
                                ...prev,
                                [plat]: { ...prev[plat], showToken: !prev[plat].showToken }
                              }))}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8e8b9e', cursor: 'pointer', padding: '4px' }}
                              title={form.showToken ? 'Hide token' : 'Show token'}
                            >
                              {form.showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          <small style={{ color: '#8e8b9e', fontSize: '10px', marginTop: '2px' }}>
                            {plat === 'Instagram'
                              ? 'Paste a Meta Page Access Token (from Graph API Explorer / App Token) with instagram_content_publish permission.'
                              : plat === 'LinkedIn'
                              ? 'Paste a LinkedIn Member or Community Management API token with w_member_social scope.'
                              : 'Paste an X OAuth 2.0 User Access Token with tweet.write permission.'}
                          </small>
                        </div>

                        {/* Row 3: Account Identifier & Display Name */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                          <div className="field">
                            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{plat === 'LinkedIn' ? 'Organization URN or Handle' : plat === 'Instagram' ? 'Instagram Business Account ID or Handle' : 'Official X Handle'}</span>
                              <span style={{ color: '#8e8b9e', fontSize: '9px' }}>Page / Profile</span>
                            </label>
                            <input
                              type="text"
                              value={form.accountIdentifier}
                              onChange={(e) => setPlatformForms(prev => ({
                                ...prev,
                                [plat]: { ...prev[plat], accountIdentifier: e.target.value }
                              }))}
                              placeholder={plat === 'LinkedIn' ? 'e.g. @nova_unlimited or urn:li:organization:12345' : plat === 'Instagram' ? 'e.g. @nova_hosting or Business ID' : 'e.g. @nova_unlimited'}
                            />
                          </div>

                          <div className="field">
                            <label>Official Page Display Name</label>
                            <input
                              type="text"
                              value={form.accountName}
                              onChange={(e) => setPlatformForms(prev => ({
                                ...prev,
                                [plat]: { ...prev[plat], accountName: e.target.value }
                              }))}
                              placeholder={`e.g. ${company.name} Official`}
                            />
                          </div>
                        </div>

                        {/* Save & Action Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleOAuthConnect(plat)}
                              className="subtle-button"
                              style={{ padding: '6px 12px', fontSize: '10px', height: '32px' }}
                              title="Connect directly via OAuth popup window"
                            >
                              <Share2 size={12} style={{ marginRight: '5px' }} />
                              <span>CONNECT VIA OAUTH ↗</span>
                            </button>

                            {plat === 'Instagram' && (
                              <button
                                type="button"
                                onClick={() => handleOAuthConnect(plat, 'basic')}
                                className="subtle-button"
                                style={{ padding: '6px 10px', fontSize: '10px', height: '32px', color: '#9ce6c5', borderColor: 'rgba(156, 230, 197, 0.3)' }}
                                title="Quick connect using standard Meta profile"
                              >
                                <span>QUICK CONNECT (BASIC)</span>
                              </button>
                            )}

                            {config?.hasAccessToken && (
                              <button
                                type="button"
                                onClick={() => handleTestPlatformConfig(plat)}
                                disabled={isTesting}
                                className="subtle-button"
                                style={{ padding: '6px 12px', fontSize: '10px', height: '32px', color: '#9cecff', borderColor: 'rgba(156, 236, 255, 0.3)' }}
                              >
                                {isTesting ? <Loader2 size={12} className="animate-spin text-[#9cecff]" /> : <ShieldCheck size={12} />}
                                <span>TEST CONNECTION</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="submit"
                            disabled={isSaving}
                            className="primary-cta"
                            style={{ padding: '8px 20px', fontSize: '11px', height: '34px' }}
                          >
                            <span>{isSaving ? 'SAVING & ENCRYPTING...' : 'SAVE & UPDATE CREDENTIALS'}</span>
                            <span className="arrow">↗</span>
                          </button>
                        </div>
                      </form>

                      {/* Developer Callback & Step-by-Step Helpers */}
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: '#8e8b9e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Developer Portal Setup Reference &amp; Redirect URI
                          </span>
                        </div>

                        {/* Callback URI Copy Box */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px' }}>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <small style={{ color: '#8e8b9e', fontSize: '9px', display: 'block', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
                              Authorized OAuth Redirect URI:
                            </small>
                            <code style={{ fontSize: '11px', color: '#9cecff', fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>
                              {computedRedirectUri}
                            </code>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyHelper(`${plat} Redirect URI`, computedRedirectUri)}
                            className="subtle-button"
                            style={{ padding: '4px 8px', fontSize: '10px', height: '26px', flexShrink: 0 }}
                          >
                            {copiedKey === `${plat} Redirect URI` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            <span>{copiedKey === `${plat} Redirect URI` ? 'Copied' : 'Copy URI'}</span>
                          </button>
                        </div>

                        {plat === 'Instagram' && config?.appDomain && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '8px 12px' }}>
                              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                <small style={{ color: '#ff9cd9', fontSize: '9px', display: 'block', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
                                  Meta App Domain:
                                </small>
                                <code style={{ fontSize: '11px', color: '#ffffff', fontFamily: 'var(--mono)' }}>
                                  {config.appDomain}
                                </code>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyHelper('App Domain', config.appDomain!)}
                                className="subtle-button"
                                style={{ padding: '4px 8px', fontSize: '10px', height: '24px', flexShrink: 0 }}
                              >
                                {copiedKey === 'App Domain' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                              </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '8px 12px' }}>
                              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                <small style={{ color: '#9ce6c5', fontSize: '9px', display: 'block', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
                                  Site URL:
                                </small>
                                <code style={{ fontSize: '11px', color: '#ffffff', fontFamily: 'var(--mono)' }}>
                                  {config.siteUrl || `${window.location.origin}/`}
                                </code>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyHelper('Site URL', config.siteUrl || `${window.location.origin}/`)}
                                className="subtle-button"
                                style={{ padding: '4px 8px', fontSize: '10px', height: '24px', flexShrink: 0 }}
                              >
                                {copiedKey === 'Site URL' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Guide instructions */}
                        {config?.instructions && (
                          <details style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '6px', padding: '10px 14px', fontSize: '11px' }}>
                            <summary style={{ cursor: 'pointer', color: '#c4b5fd', fontFamily: 'var(--mono)', fontSize: '10px' }}>
                              View Developer Portal Setup Checklist for {plat} ▼
                            </summary>
                            <ol style={{ marginTop: '8px', paddingLeft: '18px', color: '#a0a0af', lineHeight: 1.6, display: 'grid', gap: '4px' }}>
                              {config.instructions.map((inst, i) => (
                                <li key={i}>{inst}</li>
                              ))}
                            </ol>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '24px', padding: '16px 20px', background: 'rgba(166, 139, 255, 0.04)', border: '1px solid rgba(166, 139, 255, 0.18)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} className="text-[#a68bff]" />
                  <div>
                    <strong style={{ fontSize: '12px', color: '#ffffff' }}>CEO Multi-Channel Authority</strong>
                    <p style={{ margin: 0, fontSize: '11px', color: '#8e8b9e' }}>
                      All tokens configured here are stored securely with PBKDF2/AES-256 encryption. Employees do not have access to these raw credentials and simply click &ldquo;Confirm &amp; Publish&rdquo; when content is approved.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="subtle-button"
                  style={{ fontSize: '10px', padding: '6px 14px' }}
                >
                  RETURN TO CEO DASHBOARD ↗
                </button>
              </div>
            </section>
          )}

          {/* ========================================================
              TAB 5: CEO ACCOUNT & MASTER CREDENTIALS
              ======================================================== */}
          {activeTab === 'ceo-account' && (
            <section className="ceo-page active" data-ceo-content="ceo-account">
              <div className="ceo-page-head">
                <div>
                  <div className="ceo-kicker">GOVERNANCE &amp; CREDENTIALS / 05</div>
                  <h1>
                    Executive Account,
                    <br />
                    <span style={{ color: '#b5a7e4' }}>Master Control.</span>
                  </h1>
                  <p>
                    Manage your primary executive profile, official CEO login email, password encryption, and organization root credentials.
                  </p>
                </div>
                <div className="ceo-date">
                  SECURITY CLEARANCE &nbsp; <span style={{ color: '#9ce6c5' }}>● ROOT OWNER</span>
                </div>
              </div>

              {/* Grid of Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginTop: '16px' }}>
                {/* Panel 1: Profile & Official Email */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(166, 139, 255, 0.25)',
                    borderRadius: '10px',
                    padding: '24px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'rgba(166, 139, 255, 0.15)',
                        border: '1px solid rgba(166, 139, 255, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        color: '#c4b5fd'
                      }}
                    >
                      👑
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#f4f4f7' }}>Executive Profile Details</h3>
                      <small style={{ color: '#8e8b9e', fontSize: '11px' }}>Primary organization administrator identity</small>
                    </div>
                  </div>

                  <form onSubmit={handleSaveCeoProfile}>
                    <div className="field">
                      <label>Executive Full Name</label>
                      <input
                        type="text"
                        required
                        value={ceoProfileForm.name}
                        onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, name: e.target.value })}
                        placeholder="e.g. Nova Founder / Executive"
                      />
                    </div>

                    <div className="field">
                      <label>Official CEO Login ID / Email</label>
                      <input
                        type="text"
                        required
                        value={ceoProfileForm.loginId}
                        onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, loginId: e.target.value })}
                        placeholder="e.g. novaunlimited0@gmail.com"
                      />
                      <small style={{ color: '#8e8b9e', fontSize: '10px', marginTop: '4px', display: 'block' }}>
                        Used as the primary master login credential across BrandLens.
                      </small>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div className="field">
                        <label>Designation</label>
                        <input
                          type="text"
                          disabled
                          value="CEO (Chief Executive Officer)"
                          style={{ opacity: 0.7, cursor: 'not-allowed' }}
                        />
                      </div>
                      <div className="field">
                        <label>Department</label>
                        <input
                          type="text"
                          disabled
                          value="Executive Leadership"
                          style={{ opacity: 0.7, cursor: 'not-allowed' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="primary-cta" type="submit" disabled={savingCeoProfile}>
                        <span>{savingCeoProfile ? 'SAVING PROFILE...' : 'SAVE PROFILE CHANGES'}</span>
                        <span className="arrow">✓</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Panel 2: Master Password & Security Encryption */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(156, 236, 255, 0.25)',
                    borderRadius: '10px',
                    padding: '24px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'rgba(156, 236, 255, 0.12)',
                          border: '1px solid rgba(156, 236, 255, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          color: '#9cecff'
                        }}
                      >
                        🔒
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#f4f4f7' }}>Master Password Reset</h3>
                        <small style={{ color: '#8e8b9e', fontSize: '11px' }}>PBKDF2 SHA-512 cryptographic salt</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#9cecff', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={generateCeoRandomPassword}
                    >
                      ⚡ Key Generator
                    </button>
                  </div>

                  <form onSubmit={handleChangeCeoPassword}>
                    <div className="field">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ margin: 0 }}>New Master Password</label>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#8e8b9e', fontSize: '10px', cursor: 'pointer' }}
                          onClick={() => setCeoPasswordForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                        >
                          {ceoPasswordForm.showPassword ? 'HIDE' : 'SHOW'}
                        </button>
                      </div>
                      <input
                        type={ceoPasswordForm.showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={ceoPasswordForm.newPassword}
                        onChange={(e) => setCeoPasswordForm({ ...ceoPasswordForm, newPassword: e.target.value })}
                        placeholder="At least 6 characters"
                      />
                    </div>

                    <div className="field">
                      <label>Confirm Master Password</label>
                      <input
                        type={ceoPasswordForm.showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={ceoPasswordForm.confirmPassword}
                        onChange={(e) => setCeoPasswordForm({ ...ceoPasswordForm, confirmPassword: e.target.value })}
                        placeholder="Re-enter new password"
                      />
                    </div>

                    <div
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#9ce6c5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '12px'
                      }}
                    >
                      <span>🛡️</span>
                      <span>Secure PBKDF2 hash encryption with per-tenant cryptographic salt.</span>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="primary-cta" type="submit" disabled={savingCeoPassword || !ceoPasswordForm.newPassword}>
                        <span>{savingCeoPassword ? 'UPDATING KEY...' : 'UPDATE MASTER PASSWORD'}</span>
                        <span className="arrow">↗</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Panel 3: Organization Root Safeguards & Session Audit */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '24px',
                    gridColumn: '1 / -1',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'rgba(52, 211, 153, 0.12)',
                          border: '1px solid rgba(52, 211, 153, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          color: '#34d399'
                        }}
                      >
                        ✓
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#f4f4f7' }}>Tenant Isolation &amp; Root Safeguards</h3>
                        <small style={{ color: '#8e8b9e', fontSize: '11px' }}>Enterprise organization ownership verification</small>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="subtle-button" type="button" onClick={handleExportTeam}>
                        EXPORT AUDIT DIRECTORY ↓
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <small style={{ color: '#8e8b9e', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Organization Tenant ID</small>
                      <strong style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: '#9cecff' }}>{company.id}</strong>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <small style={{ color: '#8e8b9e', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Managed Accounts</small>
                      <strong style={{ fontSize: '13px', color: '#e2ddfe' }}>{totalTeamCount} active team members</strong>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <small style={{ color: '#8e8b9e', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Root Account Protection</small>
                      <strong style={{ fontSize: '12px', color: '#34d399' }}>● Immutable (Cannot be deleted or locked)</strong>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <small style={{ color: '#8e8b9e', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Guidelines Revision</small>
                      <strong style={{ fontSize: '12px', color: '#c4b5fd' }}>Version {company.guidelineVersion} (Active)</strong>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================
              TAB 5: BRAND TEAM MESSAGES
              ======================================================== */}
          {activeTab === 'messages' && (
            <section className="ceo-page active" data-ceo-content="messages" style={{ maxWidth: '100%' }}>
              <div
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: 0 }}>Executive Messaging Console</h2>
                    <span style={{ fontSize: '11px', color: '#a68bff', fontFamily: 'var(--mono)', background: 'rgba(166, 139, 255, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(166, 139, 255, 0.25)' }}>
                      CEO Direct Line
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                    Direct communication with department personnel, managers, and creators across {company.name}.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontFamily: 'var(--mono)',
                      background: ceoUnreadMessages > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                      color: ceoUnreadMessages > 0 ? '#fca5a5' : '#6ee7b7',
                      border: `1px solid ${ceoUnreadMessages > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: ceoUnreadMessages > 0 ? '#ef4444' : '#10b981',
                        boxShadow: ceoUnreadMessages > 0 ? '0 0 8px #ef4444' : '0 0 8px #10b981'
                      }}
                    />
                    {ceoUnreadMessages > 0 ? `${ceoUnreadMessages} Unread Message${ceoUnreadMessages > 1 ? 's' : ''}` : 'All Messages Read'}
                  </span>
                  <button
                    onClick={fetchCeoUnread}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#cbd5e1',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontFamily: 'var(--mono)'
                    }}
                    title="Refresh message inbox"
                  >
                    Sync ↻
                  </button>
                </div>
              </div>
              <MessagesView
                currentUser={ceoUser}
                currentCompany={company}
                onShowToast={onShowToast}
              />
            </section>
          )}
          </TabParticleTransition>
        </main>
      </section>

      {/* Add Member Modal via React Portal */}
      {isAddModalOpen && createPortal(
        <div
          className="brandlens-portal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseAddModal();
          }}
        >
          <div className="brandlens-governance-modal glow-card custom-scrollbar" style={{ maxWidth: '520px' }}>
            <div className="auth-top">
              <div>
                <div className="auth-eyebrow">NEW TEAM CREDENTIALS</div>
                <h3 className="auth-heading" style={{ fontSize: '24px', margin: '4px 0' }}>
                  Add Team Member
                </h3>
              </div>
              <button
                className="auth-close"
                type="button"
                onClick={handleCloseAddModal}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {createdLoginId ? (
              <div style={{ padding: '16px 0' }}>
                <div className="auth-message show">
                  <strong style={{ display: 'block', marginBottom: '6px' }}>
                    Account Successfully Created!
                  </strong>
                  The member can now sign in using this login ID:
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      border: '1px solid rgba(190,174,255,0.3)',
                      padding: '10px',
                      borderRadius: '6px',
                      marginTop: '8px',
                      fontFamily: 'var(--mono)',
                      fontSize: '12px',
                      color: '#9cecff',
                      userSelect: 'all'
                    }}
                  >
                    {createdLoginId}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    className="subtle-button"
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdLoginId);
                      onShowToast('Copied login ID to clipboard.');
                    }}
                  >
                    Copy Login ID
                  </button>
                  <button
                    className="primary-cta"
                    type="button"
                    style={{ flex: 1 }}
                    onClick={handleCloseAddModal}
                  >
                    <span>DONE</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddMember}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="field">
                    <label>Designation / Role</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as any)}
                    >
                      <option value="Employee">Employee (Draft &amp; Submit Posts)</option>
                      <option value="Manager">Manager (Review &amp; Compliance)</option>
                      <option value="HOD">HOD (Specialist Sign-Off)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="e.g. Sarah Chen"
                    />
                  </div>

                  <div className="field">
                    <label>Password</label>
                    <input
                      type="password"
                      required
                      value={newMemberPassword}
                      onChange={(e) => setNewMemberPassword(e.target.value)}
                      placeholder="Initial secure password"
                    />
                  </div>

                  <div className="demo-hint">
                    <span aria-hidden="true">✳</span>
                    <div>
                      <strong>Login ID auto-format:</strong>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>
                        {newMemberRole.toLowerCase()}.{newMemberName.trim().toLowerCase().replace(/[^a-z0-9]/g, '.') || 'name'}@{company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.test
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button className="subtle-button" type="button" onClick={handleCloseAddModal}>
                    CANCEL
                  </button>
                  <button className="primary-cta" type="submit" disabled={submittingMember}>
                    <span>{submittingMember ? 'CREATING...' : 'CREATE ACCOUNT'}</span>
                    <span className="arrow">↗</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================
          ACCOUNT MANAGEMENT MODAL (Employee, Manager, HOD)
          ======================================================== */}
      {isManageModalOpen && selectedMember && createPortal(
        <div
          className="brandlens-portal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseManageModal();
          }}
        >
          <div className="brandlens-governance-modal glow-card custom-scrollbar" style={{ maxWidth: '620px' }}>
            {/* Modal Header */}
            <div className="auth-head" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
              <div>
                <div className="auth-eyebrow" style={{ color: '#a68bff' }}>TENANT ACCOUNT GOVERNANCE</div>
                <h3 className="auth-heading" style={{ fontSize: '22px', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Manage Profile</span>
                  <span style={{ fontSize: '13px', color: '#92939f', fontWeight: 'normal' }}>· {selectedMember.role}</span>
                </h3>
              </div>
              <button
                className="auth-close"
                type="button"
                onClick={handleCloseManageModal}
                aria-label="Close management modal"
              >
                ×
              </button>
            </div>

            {/* Profile Overview Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px',
                margin: '16px 0',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(166, 139, 255, 0.2)',
                borderRadius: '8px'
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(166, 139, 255, 0.15)',
                  border: '1px solid rgba(166, 139, 255, 0.4)',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#e2ddfe',
                  flexShrink: 0
                }}
              >
                {getInitials(selectedMember.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '15px', color: '#f4f4f7' }}>{selectedMember.name}</strong>
                  <span className="role-chip" style={{ fontSize: '9px', padding: '2px 6px' }}>{selectedMember.role}</span>
                  <span
                    className="status-chip"
                    style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      color: selectedMember.status === 'suspended' ? '#f87171' : '#9ce6c5',
                      borderColor: selectedMember.status === 'suspended' ? 'rgba(248, 113, 113, 0.3)' : 'rgba(156, 230, 197, 0.25)'
                    }}
                  >
                    {selectedMember.status === 'suspended' ? '● SUSPENDED' : '● ACTIVE'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#9cecff' }}>
                    {selectedMember.loginId}
                  </span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#8e8b9e', cursor: 'pointer', padding: '0 4px', fontSize: '10px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMember.loginId);
                      onShowToast(`Copied ${selectedMember.loginId}`);
                    }}
                    title="Copy Login ID"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-tabs: Profile, Password, Danger Zone */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`subtle-button ${manageActiveTab === 'profile' ? 'active' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderColor: manageActiveTab === 'profile' ? '#a68bff' : 'rgba(255,255,255,0.1)',
                  color: manageActiveTab === 'profile' ? '#ffffff' : '#8e8b9e'
                }}
                onClick={() => setManageActiveTab('profile')}
              >
                ◉ Edit Role &amp; Dept
              </button>
              <button
                type="button"
                className={`subtle-button ${manageActiveTab === 'password' ? 'active' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderColor: manageActiveTab === 'password' ? '#9cecff' : 'rgba(255,255,255,0.1)',
                  color: manageActiveTab === 'password' ? '#ffffff' : '#8e8b9e'
                }}
                onClick={() => setManageActiveTab('password')}
              >
                🔒 Change Password
              </button>
              <button
                type="button"
                className={`subtle-button ${manageActiveTab === 'danger' ? 'active' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderColor: manageActiveTab === 'danger' ? '#f87171' : 'rgba(255,255,255,0.1)',
                  color: manageActiveTab === 'danger' ? '#f87171' : '#8e8b9e'
                }}
                onClick={() => setManageActiveTab('danger')}
              >
                ⚠ Delete Account
              </button>
            </div>

            {/* TAB 1: Edit Profile & Role */}
            {manageActiveTab === 'profile' && (
              <form onSubmit={handleSaveMemberProfile}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="field">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      value={manageForm.name}
                      onChange={(e) => setManageForm({ ...manageForm, name: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="field">
                      <label>Designation / Role</label>
                      <select
                        value={manageForm.role}
                        onChange={(e) => setManageForm({ ...manageForm, role: e.target.value as Role })}
                      >
                        <option value="Employee">Employee (Draft &amp; Submit)</option>
                        <option value="Manager">Manager (Review &amp; Compliance)</option>
                        <option value="HOD">HOD (Department Sign-off)</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Account Status</label>
                      <select
                        value={manageForm.status}
                        onChange={(e) => setManageForm({ ...manageForm, status: e.target.value as any })}
                      >
                        <option value="active">Active (Can log in)</option>
                        <option value="suspended">Suspended (Access blocked)</option>
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label>Department / Team</label>
                    <input
                      type="text"
                      value={manageForm.department}
                      onChange={(e) => setManageForm({ ...manageForm, department: e.target.value })}
                      placeholder="e.g. Cloud Engineering, Brand Marketing, DevOps"
                    />
                  </div>

                  <div className="field">
                    <label>Posting Governance Level</label>
                    <select
                      value={manageForm.permissions}
                      onChange={(e) => setManageForm({ ...manageForm, permissions: e.target.value })}
                    >
                      <option value="Review Required">Review Required (Must undergo AI &amp; Manager check)</option>
                      <option value="Full Publishing">Full Publishing (Direct publishing authorized)</option>
                      <option value="Departmental Sign-Off">Departmental Sign-Off (Strategic review authority)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button className="subtle-button" type="button" onClick={handleCloseManageModal}>
                    CANCEL
                  </button>
                  <button className="primary-cta" type="submit" disabled={savingMemberProfile}>
                    <span>{savingMemberProfile ? 'SAVING...' : 'SAVE CHANGES'}</span>
                    <span className="arrow">✓</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Change Password */}
            {manageActiveTab === 'password' && (
              <form onSubmit={handleChangePassword}>
                <div style={{ marginBottom: '14px', fontSize: '13px', color: '#c4b5fd', lineHeight: '1.5' }}>
                  Reset or assign a new password for <strong>{selectedMember.name}</strong>. Passwords are securely hashed on the server using PBKDF2 SHA-512 encryption.
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ margin: 0 }}>New Password</label>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#9cecff', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={generateRandomPassword}
                      >
                        ⚡ Generate Secure Key
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="At least 6 characters"
                        style={{ paddingRight: '60px' }}
                      />
                      <button
                        type="button"
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#8e8b9e',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>

                  <div className="demo-hint" style={{ marginTop: '4px' }}>
                    <span aria-hidden="true">🔑</span>
                    <div>
                      <strong>Login ID for this user:</strong>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#9cecff', display: 'block' }}>
                        {selectedMember.loginId}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button className="subtle-button" type="button" onClick={handleCloseManageModal}>
                    CANCEL
                  </button>
                  <button className="primary-cta" type="submit" disabled={savingPassword || !newPasswordInput}>
                    <span>{savingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}</span>
                    <span className="arrow">↗</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Danger Zone - Delete Account */}
            {manageActiveTab === 'danger' && (
              <div>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    marginBottom: '18px'
                  }}
                >
                  <strong style={{ color: '#f87171', display: 'block', marginBottom: '6px', fontSize: '14px' }}>
                    Permanently Delete Account
                  </strong>
                  <p style={{ color: '#d1d5db', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                    This action will immediately remove <strong>{selectedMember.name}</strong> ({selectedMember.loginId}) from {company.name}. The user will no longer be able to log in or access any company drafts, posts, or history. This cannot be undone.
                  </p>
                </div>

                {!confirmDeleteOpen ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="subtle-button" type="button" onClick={handleCloseManageModal}>
                      CANCEL
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '10px 18px',
                        background: 'rgba(239, 68, 68, 0.18)',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        color: '#fca5a5',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        letterSpacing: '0.08em'
                      }}
                      onClick={() => setConfirmDeleteOpen(true)}
                    >
                      DELETE THIS ACCOUNT...
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '14px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(239, 68, 68, 0.6)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '12px', fontWeight: 'bold' }}>
                      Are you absolutely sure you want to delete {selectedMember.name}?
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        className="subtle-button"
                        type="button"
                        onClick={() => setConfirmDeleteOpen(false)}
                      >
                        NO, CANCEL
                      </button>
                      <button
                        type="button"
                        disabled={deletingMember}
                        style={{
                          padding: '10px 20px',
                          background: '#dc2626',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          letterSpacing: '0.08em'
                        }}
                        onClick={handleDeleteMember}
                      >
                        {deletingMember ? 'DELETING...' : 'YES, PERMANENTLY DELETE'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================
          CEO EXECUTIVE ACCOUNT MANAGEMENT MODAL
          ======================================================== */}
      {isCeoManageModalOpen && createPortal(
        <div
          className="brandlens-portal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseCeoManageModal();
          }}
        >
          <div className="brandlens-governance-modal glow-card custom-scrollbar" style={{ maxWidth: '620px' }}>
            {/* Modal Header */}
            <div className="auth-head" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
              <div>
                <div className="auth-eyebrow" style={{ color: '#a68bff' }}>PRIMARY ROOT GOVERNANCE</div>
                <h3 className="auth-heading" style={{ fontSize: '22px', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>CEO Executive Account</span>
                  <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 'normal' }}>· Master Owner</span>
                </h3>
              </div>
              <button
                className="auth-close"
                type="button"
                onClick={handleCloseCeoManageModal}
                aria-label="Close CEO management modal"
              >
                ×
              </button>
            </div>

            {/* Profile Overview Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px',
                margin: '16px 0',
                background: 'linear-gradient(135deg, rgba(166, 139, 255, 0.1) 0%, rgba(9, 10, 18, 0.8) 100%)',
                border: '1px solid rgba(166, 139, 255, 0.35)',
                borderRadius: '8px'
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(166, 139, 255, 0.2)',
                  border: '1px solid rgba(166, 139, 255, 0.6)',
                  boxShadow: '0 0 12px rgba(166, 139, 255, 0.35)',
                  fontSize: '18px',
                  color: '#ffffff',
                  flexShrink: 0
                }}
              >
                👑
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '15px', color: '#f4f4f7' }}>{ceoUser.name}</strong>
                  <span className="role-chip" style={{ background: 'rgba(166, 139, 255, 0.2)', borderColor: 'rgba(166, 139, 255, 0.4)', fontSize: '9px', padding: '2px 8px' }}>
                    CEO · PRIMARY ROOT
                  </span>
                  <span className="status-chip" style={{ color: '#9ce6c5', borderColor: 'rgba(156, 230, 197, 0.3)', fontSize: '9px', padding: '2px 8px' }}>
                    ● ACTIVE OWNER
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#9cecff' }}>
                    {ceoUser.loginId}
                  </span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#8e8b9e', cursor: 'pointer', padding: '0 4px', fontSize: '10px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(ceoUser.loginId);
                      onShowToast(`Copied ${ceoUser.loginId}`);
                    }}
                    title="Copy Login ID"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-tabs: Profile, Password, Security */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`subtle-button ${ceoManageActiveTab === 'profile' ? 'active' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderColor: ceoManageActiveTab === 'profile' ? '#a68bff' : 'rgba(255,255,255,0.1)',
                  color: ceoManageActiveTab === 'profile' ? '#ffffff' : '#8e8b9e'
                }}
                onClick={() => setCeoManageActiveTab('profile')}
              >
                ◉ Edit Profile &amp; Login
              </button>
              <button
                type="button"
                className={`subtle-button ${ceoManageActiveTab === 'password' ? 'active' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderColor: ceoManageActiveTab === 'password' ? '#9cecff' : 'rgba(255,255,255,0.1)',
                  color: ceoManageActiveTab === 'password' ? '#ffffff' : '#8e8b9e'
                }}
                onClick={() => setCeoManageActiveTab('password')}
              >
                🔒 Change Password
              </button>
              <button
                type="button"
                className={`subtle-button ${ceoManageActiveTab === 'security' ? 'active' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderColor: ceoManageActiveTab === 'security' ? '#34d399' : 'rgba(255,255,255,0.1)',
                  color: ceoManageActiveTab === 'security' ? '#34d399' : '#8e8b9e'
                }}
                onClick={() => setCeoManageActiveTab('security')}
              >
                🛡️ Root Safeguards
              </button>
            </div>

            {/* SUB-TAB 1: Edit Profile & Login ID */}
            {ceoManageActiveTab === 'profile' && (
              <form onSubmit={handleSaveCeoProfile}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="field">
                    <label>Executive Full Name</label>
                    <input
                      type="text"
                      required
                      value={ceoProfileForm.name}
                      onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, name: e.target.value })}
                      placeholder="e.g. Nova Founder / Executive"
                    />
                  </div>

                  <div className="field">
                    <label>Official CEO Login ID / Email</label>
                    <input
                      type="text"
                      required
                      value={ceoProfileForm.loginId}
                      onChange={(e) => setCeoProfileForm({ ...ceoProfileForm, loginId: e.target.value })}
                      placeholder="e.g. novaunlimited0@gmail.com"
                    />
                    <small style={{ color: '#8e8b9e', fontSize: '10px', marginTop: '4px', display: 'block' }}>
                      Primary login ID for the CEO account across the entire system.
                    </small>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="field">
                      <label>Designation</label>
                      <input
                        type="text"
                        disabled
                        value="CEO (Chief Executive Officer)"
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                      />
                    </div>
                    <div className="field">
                      <label>Department</label>
                      <input
                        type="text"
                        disabled
                        value="Executive Leadership"
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button className="subtle-button" type="button" onClick={handleCloseCeoManageModal}>
                    CANCEL
                  </button>
                  <button className="primary-cta" type="submit" disabled={savingCeoProfile}>
                    <span>{savingCeoProfile ? 'SAVING...' : 'SAVE CHANGES'}</span>
                    <span className="arrow">✓</span>
                  </button>
                </div>
              </form>
            )}

            {/* SUB-TAB 2: Change Password */}
            {ceoManageActiveTab === 'password' && (
              <form onSubmit={handleChangeCeoPassword}>
                <div style={{ marginBottom: '14px', fontSize: '13px', color: '#c4b5fd', lineHeight: '1.5' }}>
                  Assign a new master password for the CEO account. Password will be hashed using PBKDF2 SHA-512 with cryptographic salt.
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ margin: 0 }}>New Master Password</label>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#9cecff', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={generateCeoRandomPassword}
                      >
                        ⚡ Generate Key
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={ceoPasswordForm.showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={ceoPasswordForm.newPassword}
                        onChange={(e) => setCeoPasswordForm({ ...ceoPasswordForm, newPassword: e.target.value })}
                        placeholder="At least 6 characters"
                        style={{ paddingRight: '60px' }}
                      />
                      <button
                        type="button"
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#8e8b9e',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                        onClick={() => setCeoPasswordForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      >
                        {ceoPasswordForm.showPassword ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label>Confirm Master Password</label>
                    <input
                      type={ceoPasswordForm.showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={ceoPasswordForm.confirmPassword}
                      onChange={(e) => setCeoPasswordForm({ ...ceoPasswordForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button className="subtle-button" type="button" onClick={handleCloseCeoManageModal}>
                    CANCEL
                  </button>
                  <button className="primary-cta" type="submit" disabled={savingCeoPassword || !ceoPasswordForm.newPassword}>
                    <span>{savingCeoPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}</span>
                    <span className="arrow">↗</span>
                  </button>
                </div>
              </form>
            )}

            {/* SUB-TAB 3: Root Safeguards & Security Overview */}
            {ceoManageActiveTab === 'security' && (
              <div>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'rgba(52, 211, 153, 0.08)',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    marginBottom: '16px'
                  }}
                >
                  <strong style={{ color: '#34d399', display: 'block', marginBottom: '6px', fontSize: '14px' }}>
                    🛡️ Primary Root Administrator Safeguard Active
                  </strong>
                  <p style={{ color: '#d1d5db', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                    The CEO account is the root owner of <strong>{company.name}</strong> ({company.id}). To prevent organization lockouts and orphaned data, this account cannot be deleted or suspended. All security operations are logged to the organization audit trail.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <small style={{ color: '#8e8b9e', display: 'block' }}>Account ID</small>
                    <span style={{ fontFamily: 'var(--mono)', color: '#9cecff', fontSize: '11px' }}>{ceoUser.id}</span>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <small style={{ color: '#8e8b9e', display: 'block' }}>Created On</small>
                    <span style={{ color: '#e2ddfe', fontSize: '11px' }}>{new Date(ceoUser.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button className="primary-cta" type="button" onClick={handleCloseCeoManageModal}>
                    <span>CLOSE WINDOW</span>
                    <span className="arrow">✓</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
