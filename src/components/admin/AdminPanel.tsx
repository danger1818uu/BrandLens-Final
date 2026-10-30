import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Building2,
  Key,
  Users,
  Database,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  Activity,
  HardDrive,
  LogOut,
  Sliders,
  Check,
  Zap,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../../services/api';
import {
  AdminBrandOverview,
  AdminUserRecord,
  AdminPlatformOverview,
  AdminApiSettingItem,
  Company,
  UserAccount,
  Role
} from '../../types';

interface AdminPanelProps {
  currentAdmin: UserAccount;
  onLogout: () => void;
  onImpersonateCompany: (company: Company, user: UserAccount) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

type AdminTab = 'overview' | 'brands' | 'apis' | 'users' | 'database';

export function AdminPanel({
  currentAdmin,
  onLogout,
  onImpersonateCompany,
  onShowToast
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);

  // Smoothly reset window scroll position to top whenever active admin tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);
  const [overview, setOverview] = useState<AdminPlatformOverview | null>(null);
  const [brands, setBrands] = useState<AdminBrandOverview[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [apiSettings, setApiSettings] = useState<Record<string, AdminApiSettingItem>>({});
  const [dbStats, setDbStats] = useState<any>(null);

  // Search & Filters
  const [brandSearch, setBrandSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('all');

  // Modals & Forms
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandData, setNewBrandData] = useState({
    companyName: '',
    companyCategory: 'Technology',
    companyEmail: '',
    password: '',
    description: '',
    brandVoice: ''
  });

  const [editingBrand, setEditingBrand] = useState<AdminBrandOverview | null>(null);
  const [editBrandForm, setEditBrandForm] = useState({
    name: '',
    category: '',
    email: '',
    description: '',
    brandVoice: '',
    productsServices: ''
  });

  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    role: 'Employee' as Role,
    status: 'active' as 'active' | 'suspended',
    department: '',
    newPassword: ''
  });

  // API Key Edits
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [showMasked, setShowMasked] = useState<Record<string, boolean>>({});
  const [apiTesting, setApiTesting] = useState<string | null>(null);
  const [apiTestResult, setApiTestResult] = useState<{ [key: string]: { success: boolean; message: string } }>({});
  const [isSavingApis, setIsSavingApis] = useState(false);

  // Load Admin Data
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovData, brandsData, usersData, apisData] = await Promise.all([
        apiClient.fetchAdminOverview(),
        apiClient.fetchAdminBrands(),
        apiClient.fetchAdminUsers(),
        apiClient.fetchAdminApiSettings()
      ]);

      setOverview(ovData);
      setBrands(brandsData);
      setUsers(usersData);
      setApiSettings(apisData.settings || {});
      setDbStats(apisData.stats || null);

      // Initialize API input fields with current values
      const initialKeys: Record<string, string> = {};
      Object.entries(apisData.settings || {}).forEach(([k, item]) => {
        initialKeys[k] = item.value || '';
      });
      setApiKeyValues(initialKeys);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load platform admin data', 'error');
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Brand Actions
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandData.companyName || !newBrandData.companyEmail) {
      onShowToast('Brand name and email are required.', 'warning');
      return;
    }
    try {
      await apiClient.createAdminBrand(newBrandData);
      onShowToast(`Brand "${newBrandData.companyName}" registered successfully!`, 'success');
      setShowAddBrandModal(false);
      setNewBrandData({
        companyName: '',
        companyCategory: 'Technology',
        companyEmail: '',
        password: '',
        description: '',
        brandVoice: ''
      });
      loadAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create brand', 'error');
    }
  };

  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    try {
      await apiClient.updateAdminBrand(editingBrand.id, editBrandForm);
      onShowToast('Brand details updated.', 'success');
      setEditingBrand(null);
      loadAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update brand', 'error');
    }
  };

  const handleDeleteBrand = async (brand: AdminBrandOverview) => {
    if (brand.id === 'org-brandlens-hq') {
      onShowToast('Cannot delete BrandLens System Headquarters.', 'warning');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to completely delete "${brand.name}"? This removes all associated users, posts, and guidelines.`
    );
    if (!confirmed) return;

    try {
      await apiClient.deleteAdminBrand(brand.id);
      onShowToast(`Brand "${brand.name}" removed from platform.`, 'info');
      loadAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete brand', 'error');
    }
  };

  const handleImpersonate = async (brandId: string) => {
    try {
      const { company, user } = await apiClient.impersonateCompany(brandId);
      onShowToast(`Switching to workspace: ${company.name}`, 'info');
      onImpersonateCompany(company, user);
    } catch (err: any) {
      onShowToast(err.message || 'Could not enter brand workspace', 'error');
    }
  };

  // User Actions
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await apiClient.updateAdminUser(editingUser.id, {
        name: editUserForm.name,
        role: editUserForm.role,
        status: editUserForm.status,
        department: editUserForm.department,
        newPassword: editUserForm.newPassword ? editUserForm.newPassword : undefined
      });
      onShowToast('User updated successfully.', 'success');
      setEditingUser(null);
      loadAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (user: AdminUserRecord) => {
    if (user.loginId.toLowerCase() === 'brandlens@gmail.com') {
      onShowToast('Cannot delete root platform administrator.', 'warning');
      return;
    }
    const confirmed = window.confirm(`Delete user ${user.name} (${user.loginId})?`);
    if (!confirmed) return;

    try {
      await apiClient.deleteAdminUser(user.id);
      onShowToast('User deleted from platform.', 'info');
      loadAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete user', 'error');
    }
  };

  // API Key Actions
  const handleSaveApiKeys = async () => {
    setIsSavingApis(true);
    try {
      const res = await apiClient.saveAdminApiSettings(apiKeyValues);
      setApiSettings(res.settings);
      onShowToast('API keys and environment variables saved successfully.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save API settings', 'error');
    } finally {
      setIsSavingApis(false);
    }
  };

  const handleTestService = async (service: 'gemini' | 'freellm' | 'image_gen' | 'database') => {
    setApiTesting(service);
    try {
      const result = await apiClient.testAdminService(service);
      setApiTestResult(prev => ({
        ...prev,
        [service]: {
          success: result.success,
          message: result.message
        }
      }));
      if (result.success) {
        onShowToast(`${service.toUpperCase()}: ${result.message}`, 'success');
      } else {
        onShowToast(`${service.toUpperCase()} Test: ${result.message}`, 'error');
      }
    } catch (err: any) {
      onShowToast(`Test failed: ${err.message}`, 'error');
    } finally {
      setApiTesting(null);
    }
  };

  const handleVacuumDb = async () => {
    try {
      const res = await apiClient.vacuumDatabase();
      if (res.success) {
        onShowToast('Database vacuum and optimization completed.', 'success');
        loadAdminData();
      } else {
        onShowToast(res.message || 'Vacuum failed', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Vacuum failed', 'error');
    }
  };

  // Filtered lists
  const filteredBrands = brands.filter(b => {
    const q = brandSearch.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
  });

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    const matchesSearch = u.name.toLowerCase().includes(q) || u.loginId.toLowerCase().includes(q) || u.companyName.toLowerCase().includes(q);
    const matchesBrand = selectedBrandFilter === 'all' || u.companyId === selectedBrandFilter;
    return matchesSearch && matchesBrand;
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-200 flex flex-col font-sans">
      {/* Top Admin Navigation Header */}
      <header className="border-b border-white/10 bg-[#0d1017]/95 sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-wide">BrandLens</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                  Admin Console
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Platform Root &bull; <span className="text-slate-300 font-mono">brandlens@gmail.com</span>
              </p>
            </div>
          </div>

          {/* Quick Impersonation / Workspace Access & Admin Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleImpersonate('org-nova-unlimited')}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium transition-colors"
              title="Open Nova Unlimited Executive Workspace"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Launch Nova Workspace</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>

            <button
              onClick={loadAdminData}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto border-t border-white/5 pt-2">
          {[
            { id: 'overview', label: 'System Overview', icon: Activity },
            { id: 'brands', label: `Brands (${brands.length})`, icon: Building2 },
            { id: 'apis', label: 'API Keys & Engine Config', icon: Key },
            { id: 'users', label: `Accounts (${users.length})`, icon: Users },
            { id: 'database', label: 'Database & Maintenance', icon: Database }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0f141d] p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Registered Brands</span>
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">{overview?.totalBrands ?? brands.length}</div>
                <p className="text-xs text-slate-400 mt-1">Multi-tenant enterprise organizations</p>
              </div>

              <div className="bg-[#0f141d] p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Total Accounts</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white">{overview?.totalUsers ?? users.length}</div>
                <p className="text-xs text-slate-400 mt-1">CEOs, HODs, Managers, Employees</p>
              </div>

              <div className="bg-[#0f141d] p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Social Posts Governed</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white">{overview?.totalPosts ?? 0}</div>
                <p className="text-xs text-slate-400 mt-1">LinkedIn, X, Meta analyzed</p>
              </div>

              <div className="bg-[#0f141d] p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Database Storage</span>
                  <HardDrive className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white">{dbStats?.fileSizeKB ? `${dbStats.fileSizeKB} KB` : 'Active'}</div>
                <p className="text-xs text-slate-400 mt-1">SQLite &bull; Zero external lock-in</p>
              </div>
            </div>

            {/* Quick Engine Health Status & Diagnostics */}
            <div className="bg-[#0f141d] rounded-xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">System Service Diagnostics</h3>
                  <p className="text-xs text-slate-400">Live checks for core API engines and database pipelines</p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Engine Status: Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gemini API */}
                <div className="p-3.5 rounded-lg bg-slate-900/60 border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs">Gemini Flash / Pro</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        apiSettings.GEMINI_API_KEY?.isSet ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                      }`}>
                        {apiSettings.GEMINI_API_KEY?.isSet ? 'CONFIGURED' : 'UNSET'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Primary model for content reviews, guidelines &amp; AI chat.</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => handleTestService('gemini')}
                      disabled={apiTesting === 'gemini'}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      {apiTesting === 'gemini' ? 'Pinging...' : 'Test Ping'}
                    </button>
                    {apiTestResult.gemini && (
                      <span className={`text-[11px] font-mono ${apiTestResult.gemini.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {apiTestResult.gemini.success ? 'Online' : 'Failed'}
                      </span>
                    )}
                  </div>
                </div>

                {/* SQLite Database */}
                <div className="p-3.5 rounded-lg bg-slate-900/60 border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs">SQLite Database</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-500/15 text-emerald-300">
                        HEALTHY
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Node 22 built-in DatabaseSync with WAL journaling.</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => handleTestService('database')}
                      disabled={apiTesting === 'database'}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      {apiTesting === 'database' ? 'Checking...' : 'Check Speed'}
                    </button>
                    <button
                      onClick={handleVacuumDb}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      Vacuum
                    </button>
                  </div>
                </div>

                {/* WhatsApp Human Escalation */}
                <div className="p-3.5 rounded-lg bg-slate-900/60 border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs">WhatsApp Support</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-500/15 text-emerald-300">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Direct Human Support Escalation routing for all enterprise users.
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">
                      {apiSettings.WHATSAPP_SUPPORT_NUMBER?.value || '+919310296839'}
                    </span>
                    <button
                      onClick={() => setActiveTab('apis')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Brands */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions Panel */}
              <div className="bg-[#0f141d] rounded-xl border border-white/10 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-white">Administrator Quick Actions</h3>
                <p className="text-xs text-slate-400">Direct shortcuts to critical platform utilities</p>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      setActiveTab('brands');
                      setShowAddBrandModal(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-left text-xs font-medium text-slate-200 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      Provision New Brand Organization
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  <button
                    onClick={() => setActiveTab('apis')}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-left text-xs font-medium text-slate-200 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      Change Master API Keys &amp; Tokens
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  <a
                    href="/api/database/backup"
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-left text-xs font-medium text-slate-200 transition-colors"
                    download
                  >
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-400" />
                      Download Raw SQLite Backup (.db)
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </div>
              </div>

              {/* Brands summary preview */}
              <div className="lg:col-span-2 bg-[#0f141d] rounded-xl border border-white/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Active Organizations</h3>
                    <p className="text-xs text-slate-400">Click any brand to instantly manage or enter its workspace</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('brands')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    View All ({brands.length}) &rarr;
                  </button>
                </div>

                <div className="divide-y divide-white/5">
                  {brands.slice(0, 4).map(b => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{b.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                            {b.category}
                          </span>
                        </div>
                        <div className="text-slate-400 font-mono text-[11px] mt-0.5">{b.email}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-[11px]">
                          {b.totalUsers} users &bull; {b.totalPosts} posts
                        </span>
                        <button
                          onClick={() => handleImpersonate(b.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 border border-white/10 text-xs font-medium"
                        >
                          Enter Workspace
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: BRANDS MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'brands' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search brands by name, category, email..."
                  value={brandSearch}
                  onChange={e => setBrandSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={() => setShowAddBrandModal(true)}
                className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Brand</span>
              </button>
            </div>

            {/* Brands Table */}
            <div className="bg-[#0f141d] rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-white/5 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Brand / Org Name</th>
                      <th className="py-3 px-4">Industry / Category</th>
                      <th className="py-3 px-4">Admin Email</th>
                      <th className="py-3 px-4 text-center">Members</th>
                      <th className="py-3 px-4 text-center">Posts</th>
                      <th className="py-3 px-4">Guideline Ver.</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredBrands.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No brands found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredBrands.map(b => (
                        <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{b.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">{b.id}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5 font-mono text-[11px]">
                              {b.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">{b.email}</td>
                          <td className="py-3 px-4 text-center font-semibold text-white">{b.totalUsers}</td>
                          <td className="py-3 px-4 text-center font-semibold text-white">{b.totalPosts}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">v{b.guidelineVersion}.0</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleImpersonate(b.id)}
                                className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 font-medium text-[11px]"
                                title="Open this brand's executive workspace"
                              >
                                Launch
                              </button>
                              <button
                                onClick={() => {
                                  setEditingBrand(b);
                                  setEditBrandForm({
                                    name: b.name,
                                    category: b.category,
                                    email: b.email,
                                    description: b.description || '',
                                    brandVoice: b.brandVoice || '',
                                    productsServices: b.productsServices || ''
                                  });
                                }}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5"
                                title="Edit Brand Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteBrand(b)}
                                disabled={b.id === 'org-brandlens-hq'}
                                className={`p-1 rounded ${
                                  b.id === 'org-brandlens-hq'
                                    ? 'opacity-30 cursor-not-allowed'
                                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20'
                                }`}
                                title="Delete Brand"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: API KEYS & SYSTEM ENGINE CONFIGURATION */}
        {/* ======================================================== */}
        {activeTab === 'apis' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f141d] p-4 rounded-xl border border-white/10">
              <div>
                <h3 className="text-sm font-semibold text-white">Platform APIs, AI Models &amp; OAuth Credentials</h3>
                <p className="text-xs text-slate-400">
                  Update master API keys, AI model endpoints, and platform variables. Changes persist directly into SQLite and runtime environment.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadAdminData}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSaveApiKeys}
                  disabled={isSavingApis}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingApis ? 'Saving...' : 'Save All Keys'}</span>
                </button>
              </div>
            </div>

            {/* API Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Section 1: AI Engines */}
              <div className="bg-[#0f141d] p-5 rounded-xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">AI Intelligence Engines</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    apiSettings.GEMINI_API_KEY?.isSet
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}>
                    {apiSettings.GEMINI_API_KEY?.isSet ? 'GEMINI FLASH ACTIVE' : 'LOCAL ENGINE ACTIVE'}
                  </span>
                </div>

                {/* Banner explanation */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5 text-[11px] text-slate-300 leading-relaxed">
                  BrandLens runs zero-downtime post reviews, text enhancements, and assistant responses. Enter your <span className="text-emerald-400 font-mono font-semibold">GEMINI_API_KEY</span> below and click <span className="text-white font-semibold">Save All Keys</span> to instantly activate live Gemini 3.1 generative AI across the entire platform.
                </div>

                {/* GEMINI_API_KEY */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 font-mono flex items-center gap-1.5">
                      <span>GEMINI_API_KEY</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        apiSettings.GEMINI_API_KEY?.isSet ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {apiSettings.GEMINI_API_KEY?.isSet ? '● Ready' : '○ Not set'}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTestService('gemini')}
                      disabled={apiTesting === 'gemini'}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      {apiTesting === 'gemini' ? 'Testing...' : 'Test Gemini Ping'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showMasked['GEMINI_API_KEY'] ? 'text' : 'password'}
                      value={apiKeyValues['GEMINI_API_KEY'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, GEMINI_API_KEY: e.target.value }))}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-1.5 pr-9 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasked(prev => ({ ...prev, GEMINI_API_KEY: !prev['GEMINI_API_KEY'] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showMasked['GEMINI_API_KEY'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Powers Text Enhancer, brand tone adaptation, 3-dimension governance review, and Assistant answers.
                  </p>
                  {apiTestResult.gemini && (
                    <div className={`text-[11px] font-mono px-2.5 py-1 rounded bg-slate-900 border ${apiTestResult.gemini.success ? 'border-emerald-500/30 text-emerald-300' : 'border-rose-500/30 text-rose-300'}`}>
                      {apiTestResult.gemini.message}
                    </div>
                  )}
                </div>

                {/* FREELLM_API_KEY & URL */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 font-mono">Custom / Fallback LLM Endpoint</label>
                    <button
                      type="button"
                      onClick={() => handleTestService('freellm')}
                      disabled={apiTesting === 'freellm'}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      {apiTesting === 'freellm' ? 'Testing...' : 'Test FreeLLM'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={apiKeyValues['FREELLM_API_URL'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, FREELLM_API_URL: e.target.value }))}
                      placeholder="https://.../v1/chat/completions"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <div className="relative">
                      <input
                        type={showMasked['FREELLM_API_KEY'] ? 'text' : 'password'}
                        value={apiKeyValues['FREELLM_API_KEY'] || ''}
                        onChange={e => setApiKeyValues(prev => ({ ...prev, FREELLM_API_KEY: e.target.value }))}
                        placeholder="Fallback LLM key"
                        className="w-full px-3 py-1.5 pr-9 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMasked(prev => ({ ...prev, FREELLM_API_KEY: !prev['FREELLM_API_KEY'] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showMasked['FREELLM_API_KEY'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {apiTestResult.freellm && (
                    <div className={`text-[11px] font-mono px-2.5 py-1 rounded bg-slate-900 border ${apiTestResult.freellm.success ? 'border-emerald-500/30 text-emerald-300' : 'border-rose-500/30 text-rose-300'}`}>
                      {apiTestResult.freellm.message}
                    </div>
                  )}
                </div>

                {/* IMAGE_GEN */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 font-mono">Image Generation Worker</label>
                    <button
                      type="button"
                      onClick={() => handleTestService('image_gen')}
                      disabled={apiTesting === 'image_gen'}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                    >
                      {apiTesting === 'image_gen' ? 'Testing...' : 'Test Generator'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={apiKeyValues['IMAGE_GEN_URL'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, IMAGE_GEN_URL: e.target.value }))}
                      placeholder="https://ai-image...workers.dev/"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={apiKeyValues['IMAGE_GEN_KEY'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, IMAGE_GEN_KEY: e.target.value }))}
                      placeholder="Image generation access token"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {apiTestResult.image_gen && (
                    <div className={`text-[11px] font-mono px-2.5 py-1 rounded bg-slate-900 border ${apiTestResult.image_gen.success ? 'border-emerald-500/30 text-emerald-300' : 'border-rose-500/30 text-rose-300'}`}>
                      {apiTestResult.image_gen.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Social OAuth & Security Credentials */}
              <div className="bg-[#0f141d] p-5 rounded-xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Social OAuth &amp; Security</span>
                  </div>
                </div>

                {/* APP_ENCRYPTION_KEY */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-mono">APP_ENCRYPTION_KEY (AES-256)</label>
                  <input
                    type="text"
                    value={apiKeyValues['APP_ENCRYPTION_KEY'] || ''}
                    onChange={e => setApiKeyValues(prev => ({ ...prev, APP_ENCRYPTION_KEY: e.target.value }))}
                    placeholder="32-byte secret encryption key"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500">Encrypts all user social tokens at rest in SQLite database.</p>
                </div>

                {/* LinkedIn OAuth */}
                <div className="space-y-1 pt-2">
                  <label className="text-xs font-semibold text-slate-300 font-mono">LinkedIn OAuth (Client ID &amp; Secret)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={apiKeyValues['LINKEDIN_CLIENT_ID'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, LINKEDIN_CLIENT_ID: e.target.value }))}
                      placeholder="LinkedIn Client ID"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="password"
                      value={apiKeyValues['LINKEDIN_CLIENT_SECRET'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, LINKEDIN_CLIENT_SECRET: e.target.value }))}
                      placeholder="LinkedIn Client Secret"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Meta / Instagram */}
                <div className="space-y-1 pt-2">
                  <label className="text-xs font-semibold text-slate-300 font-mono">Meta / Instagram (App ID &amp; Secret)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={apiKeyValues['META_APP_ID'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, META_APP_ID: e.target.value }))}
                      placeholder="Meta App ID"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="password"
                      value={apiKeyValues['META_APP_SECRET'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, META_APP_SECRET: e.target.value }))}
                      placeholder="Meta App Secret"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* X / Twitter */}
                <div className="space-y-1 pt-2">
                  <label className="text-xs font-semibold text-slate-300 font-mono">X (Twitter) (Client ID &amp; Secret)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={apiKeyValues['X_CLIENT_ID'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, X_CLIENT_ID: e.target.value }))}
                      placeholder="X Client ID"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="password"
                      value={apiKeyValues['X_CLIENT_SECRET'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, X_CLIENT_SECRET: e.target.value }))}
                      placeholder="X Client Secret"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* WhatsApp & Max Upload */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 font-mono">WHATSAPP_SUPPORT_NUMBER</label>
                    <input
                      type="text"
                      value={apiKeyValues['WHATSAPP_SUPPORT_NUMBER'] || ''}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, WHATSAPP_SUPPORT_NUMBER: e.target.value }))}
                      placeholder="+919310296839"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 font-mono">MAX_UPLOAD_MB</label>
                    <input
                      type="number"
                      value={apiKeyValues['MAX_UPLOAD_MB'] || '25'}
                      onChange={e => setApiKeyValues(prev => ({ ...prev, MAX_UPLOAD_MB: e.target.value }))}
                      placeholder="25"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: USER ACCOUNTS DIRECTORY */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search accounts by name, email, brand..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={selectedBrandFilter}
                  onChange={e => setSelectedBrandFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Brands ({brands.length})</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-400">
                Total accounts: <span className="font-semibold text-white">{filteredUsers.length}</span>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#0f141d] rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-white/5 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Login / Email</th>
                      <th className="py-3 px-4">Brand Organization</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No users found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">
                            <div>{u.name}</div>
                            <div className="text-[10px] text-slate-500">{u.department || 'Standard'}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">{u.loginId}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-300">{u.companyName}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              u.role === 'CEO'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                                : u.role === 'Administrator'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                : u.role === 'HOD'
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditUserForm({
                                    name: u.name,
                                    role: u.role,
                                    status: u.status,
                                    department: u.department || '',
                                    newPassword: ''
                                  });
                                }}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5"
                                title="Edit user permissions & password"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={u.loginId.toLowerCase() === 'brandlens@gmail.com'}
                                className={`p-1 rounded ${
                                  u.loginId.toLowerCase() === 'brandlens@gmail.com'
                                    ? 'opacity-30 cursor-not-allowed'
                                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20'
                                }`}
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: DATABASE & SYSTEM MAINTENANCE */}
        {/* ======================================================== */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div className="bg-[#0f141d] p-5 rounded-xl border border-white/10 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Database Engine Diagnostics &amp; Physical Storage</h3>
                <p className="text-xs text-slate-400">
                  SQLite database file path: <span className="font-mono text-slate-300">{dbStats?.filePath || 'data/brandlens.db'}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-3.5 rounded-lg bg-slate-900 border border-white/5">
                  <div className="text-xs text-slate-400">Database Size</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {dbStats?.fileSizeKB ? `${dbStats.fileSizeKB} KB` : 'Active'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900 border border-white/5">
                  <div className="text-xs text-slate-400">Total User Accounts</div>
                  <div className="text-xl font-bold text-white mt-1">{users.length}</div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900 border border-white/5">
                  <div className="text-xs text-slate-400">Total Social Posts</div>
                  <div className="text-xl font-bold text-white mt-1">{overview?.totalPosts ?? 0}</div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900 border border-white/5">
                  <div className="text-xs text-slate-400">Journaling Mode</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">WAL / Sync</div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleVacuumDb}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                >
                  Run VACUUM &amp; Optimize
                </button>

                <a
                  href="/api/database/backup"
                  download
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-colors"
                >
                  Download .db Binary Backup
                </a>

                <a
                  href="/api/database/export"
                  download
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-colors"
                >
                  Export Full Database (JSON)
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE BRAND MODAL */}
      {showAddBrandModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#111622] rounded-xl border border-white/15 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Create New Brand Organization</h3>
              <button onClick={() => setShowAddBrandModal(false)} className="text-slate-400 hover:text-white text-sm">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateBrand} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company / Brand Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Cybernetics"
                  value={newBrandData.companyName}
                  onChange={e => setNewBrandData({ ...newBrandData, companyName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Industry Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cyber Security"
                    value={newBrandData.companyCategory}
                    onChange={e => setNewBrandData({ ...newBrandData, companyCategory: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Initial CEO Password</label>
                  <input
                    type="password"
                    placeholder="Default: brandlens123"
                    value={newBrandData.password}
                    onChange={e => setNewBrandData({ ...newBrandData, password: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company Login Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@apexcyber.test"
                  value={newBrandData.companyEmail}
                  onChange={e => setNewBrandData({ ...newBrandData, companyEmail: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Brand Voice</label>
                <input
                  type="text"
                  placeholder="e.g. Direct, authoritative, technically precise"
                  value={newBrandData.brandVoice}
                  onChange={e => setNewBrandData({ ...newBrandData, brandVoice: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description / Core Offerings</label>
                <textarea
                  rows={2}
                  placeholder="Summary of what the brand specializes in..."
                  value={newBrandData.description}
                  onChange={e => setNewBrandData({ ...newBrandData, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddBrandModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Provision Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRAND MODAL */}
      {editingBrand && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#111622] rounded-xl border border-white/15 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Edit Brand: {editingBrand.name}</h3>
              <button onClick={() => setEditingBrand(null)} className="text-slate-400 hover:text-white text-sm">
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateBrand} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Brand Name</label>
                <input
                  type="text"
                  required
                  value={editBrandForm.name}
                  onChange={e => setEditBrandForm({ ...editBrandForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={editBrandForm.category}
                    onChange={e => setEditBrandForm({ ...editBrandForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={editBrandForm.email}
                    onChange={e => setEditBrandForm({ ...editBrandForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Brand Voice</label>
                <input
                  type="text"
                  value={editBrandForm.brandVoice}
                  onChange={e => setEditBrandForm({ ...editBrandForm, brandVoice: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editBrandForm.description}
                  onChange={e => setEditBrandForm({ ...editBrandForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingBrand(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#111622] rounded-xl border border-white/15 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Edit User: {editingUser.name}</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white text-sm">
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editUserForm.name}
                  onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Role</label>
                  <select
                    value={editUserForm.role}
                    onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value as Role })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CEO">CEO</option>
                    <option value="HOD">HOD (Head of Dept)</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Account Status</label>
                  <select
                    value={editUserForm.status}
                    onChange={e => setEditUserForm({ ...editUserForm, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Department</label>
                <input
                  type="text"
                  value={editUserForm.department}
                  onChange={e => setEditUserForm({ ...editUserForm, department: e.target.value })}
                  placeholder="e.g. Executive, Engineering, Marketing"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reset Password <span className="text-slate-500 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password (min 6 chars)"
                  value={editUserForm.newPassword}
                  onChange={e => setEditUserForm({ ...editUserForm, newPassword: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
