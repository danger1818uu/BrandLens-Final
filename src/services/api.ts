import {
  PostRecord,
  PostStatus,
  PostActivity,
  MetricCounts,
  Platform,
  Role,
  TextReviewResult,
  ImageReviewResult,
  AITaskRecord,
  AITaskType,
  PostDraft,
  ConnectedAccount,
  PlatformConfigStatus,
  PublishingAttempt,
  Company,
  UserAccount,
  CompanyGuidelinesBundle,
  CompanyAIPrompt,
  RegisterCompanyInput,
  LoginInput,
  CompanyPlatformConfig,
  SaveCompanyPlatformConfigInput,
  TeamMessage,
  TeamRosterGrouped,
  ConversationSummary,
  AdminBrandOverview,
  AdminUserRecord,
  AdminPlatformOverview,
  AdminApiSettingItem
} from '../types';

export const apiClient = {
  // Posts CRUD
  async fetchPosts(authorUsername?: string, companyId?: string, role?: Role): Promise<PostRecord[]> {
    const params = new URLSearchParams();
    if (authorUsername) params.set('authorUsername', authorUsername);
    if (companyId) params.set('companyId', companyId);
    if (role) params.set('role', role);
    const res = await fetch(`/api/posts?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load posts');
    const data = await res.json();
    return data.posts || [];
  },

  async fetchPost(id: string): Promise<PostRecord> {
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Post not found');
    const data = await res.json();
    return data.post;
  },

  async createPost(post: {
    organizationId?: string;
    authorUsername: string;
    authorRole: Role;
    platform: Platform;
    title: string;
    caption: string;
    status?: PostStatus;
    isEnhanced?: boolean;
    mediaRef?: string | null;
    mediaType?: 'image' | 'video' | 'pdf' | null;
    mediaOriginalName?: string | null;
    mediaSize?: number | null;
    textReviewResult?: TextReviewResult | null;
    imageReviewResult?: ImageReviewResult | null;
    unresolvedIssuesCount: number;
  }): Promise<PostRecord> {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: post.organizationId || 'org-nova-unlimited', ...post })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create post' }));
      throw new Error(err.error || 'Failed to create post');
    }
    const data = await res.json();
    return data.post;
  },

  async updatePost(id: string, updates: Partial<PostRecord>, actorUsername: string): Promise<PostRecord> {
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, actorUsername })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update post' }));
      throw new Error(err.error || 'Failed to update post');
    }
    const data = await res.json();
    return data.post;
  },

  async markAsReady(id: string, actorUsername: string): Promise<PostRecord> {
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}/mark-ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorUsername })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to mark post as ready' }));
      throw new Error(err.error || 'Failed to mark post as ready');
    }
    const data = await res.json();
    return data.post;
  },

  async markAsPosted(id: string, actorUsername: string): Promise<PostRecord> {
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}/mark-posted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorUsername })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to mark post as posted' }));
      throw new Error(err.error || 'Failed to mark post as posted');
    }
    const data = await res.json();
    return data.post;
  },

  async reopenPost(id: string, actorUsername: string, targetStatus?: 'pending_review' | 'ready_to_post'): Promise<PostRecord> {
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorUsername, targetStatus: targetStatus || 'pending_review' })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to reopen post' }));
      throw new Error(err.error || 'Failed to reopen post');
    }
    const data = await res.json();
    return data.post;
  },

  async fetchActivities(postId: string): Promise<PostActivity[]> {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/activity`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.activities || [];
  },

  async fetchMetrics(authorUsername: string, companyId?: string, role?: Role): Promise<MetricCounts> {
    const params = new URLSearchParams();
    if (authorUsername) params.set('authorUsername', authorUsername);
    if (companyId) params.set('companyId', companyId);
    if (role) params.set('role', role);
    const res = await fetch(`/api/metrics?${params.toString()}`);
    if (!res.ok) {
      return { total: 0, pending: 0, enhanced: 0, published: 0 };
    }
    const data = await res.json();
    return data.metrics;
  },

  async uploadMedia(file: File): Promise<{
    mediaRef: string;
    mediaType: 'image' | 'video' | 'pdf';
    mediaOriginalName: string;
    mediaSize: number;
  }> {
    const formData = new FormData();
    formData.append('media', file);

    const res = await fetch('/api/uploads', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Media upload failed' }));
      throw new Error(err.error || 'Media upload failed');
    }

    const data = await res.json();
    return data;
  },

  // Organization APIs
  async fetchOrganizations(): Promise<any[]> {
    const res = await fetch('/api/organizations');
    if (!res.ok) return [];
    const data = await res.json();
    return data.organizations || [];
  },

  async fetchOrganization(id = 'org-nova-unlimited'): Promise<any> {
    const res = await fetch(`/api/organizations/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.organization || null;
  },

  // Persistent Background AI Tasks
  async startTask(params: {
    taskType: AITaskType;
    postId?: string | null;
    authorUsername: string;
    authorRole: Role;
    platform: Platform;
    title: string;
    caption: string;
    mediaRef?: string | null;
    organizationId?: string;
  }): Promise<{ success: boolean; task: AITaskRecord; duplicatePrevented?: boolean }> {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: 'org-nova-unlimited', ...params })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to initialize AI task');
    return data;
  },

  async fetchTasks(authorUsername: string): Promise<AITaskRecord[]> {
    const res = await fetch(`/api/tasks?authorUsername=${encodeURIComponent(authorUsername)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.tasks || [];
  },

  async fetchTask(id: string): Promise<AITaskRecord> {
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Task not found');
    const data = await res.json();
    return data.task;
  },

  async retryTask(id: string): Promise<AITaskRecord> {
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/retry`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to restart task');
    const data = await res.json();
    return data.task;
  },

  // Drafts & Autosave
  async fetchDraft(authorUsername: string): Promise<PostDraft | null> {
    const res = await fetch(`/api/drafts?authorUsername=${encodeURIComponent(authorUsername)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.draft || null;
  },

  async saveDraft(draft: PostDraft & { organizationId?: string }): Promise<PostDraft> {
    const res = await fetch('/api/drafts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: 'org-nova-unlimited', ...draft })
    });
    if (!res.ok) throw new Error('Draft autosave failed');
    const data = await res.json();
    return data.draft;
  },

  async clearDraft(authorUsername: string): Promise<void> {
    await fetch(`/api/drafts?authorUsername=${encodeURIComponent(authorUsername)}`, {
      method: 'DELETE'
    });
  },

  // Direct sync endpoints (preserved)
  async checkText(params: {
    title: string;
    caption: string;
    platform: Platform;
    role: Role;
    organizationId?: string;
    orgId?: string;
    simulate?: 'malformed_response' | 'api_failure' | 'timeout';
  }): Promise<{ success: boolean; data?: TextReviewResult; error?: string }> {
    const res = await fetch('/api/ai/check-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        organizationId: params.organizationId || params.orgId || 'org-nova-unlimited',
        orgId: params.orgId || params.organizationId || 'org-nova-unlimited'
      })
    });
    return res.json();
  },

  async checkImage(params: {
    mediaRef: string;
    title?: string;
    caption?: string;
    platform?: Platform;
    role?: Role;
    organizationId?: string;
    orgId?: string;
  }): Promise<{ success: boolean; data?: ImageReviewResult; error?: string }> {
    const res = await fetch('/api/ai/check-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        organizationId: params.organizationId || params.orgId || 'org-nova-unlimited',
        orgId: params.orgId || params.organizationId || 'org-nova-unlimited'
      })
    });
    return res.json();
  },

  async generateImage(params: {
    prompt?: string;
    title?: string;
    caption?: string;
    platform?: Platform;
    role?: Role;
    organizationId?: string;
    orgId?: string;
  }): Promise<{ success: boolean; prompt?: string; generatedPrompt?: string; mediaRef?: string; error?: string }> {
    const res = await fetch('/api/ai/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        organizationId: params.organizationId || params.orgId || 'org-nova-unlimited',
        orgId: params.orgId || params.organizationId || 'org-nova-unlimited'
      })
    });
    return res.json();
  },

  async enhanceText(params: {
    text: string;
    role?: Role;
    platform?: Platform;
    tone?: string;
    organizationId?: string;
    orgId?: string;
  }): Promise<{
    success: boolean;
    originalText?: string;
    enhancedText?: string;
    briefExplanation?: string;
    keyImprovements?: string[];
    wordCount?: number;
    charCount?: number;
    error?: string;
  }> {
    const res = await fetch('/api/ai/enhance-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        organizationId: params.organizationId || params.orgId || 'org-nova-unlimited',
        orgId: params.orgId || params.organizationId || 'org-nova-unlimited'
      })
    });
    return res.json();
  },

  async extractDocument(file: File): Promise<{
    success: boolean;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    text?: string;
    wordCount?: number;
    charCount?: number;
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/ai/extract-document', {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  // --- Connected Accounts & Direct Publishing ---
  async fetchConnectedAccounts(orgId?: string): Promise<ConnectedAccount[]> {
    const res = await fetch(`/api/connected-accounts${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.accounts || [];
  },

  async fetchPlatformConfigs(): Promise<PlatformConfigStatus[]> {
    const res = await fetch('/api/connected-accounts/configs');
    if (!res.ok) return [];
    const data = await res.json();
    return data.configs || [];
  },

  async getAuthUrl(platform: Platform, mode?: string, companyId?: string): Promise<string> {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    if (companyId) params.set('companyId', companyId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/auth/url/${encodeURIComponent(platform.toLowerCase())}${queryString}`);
    const data = await res.json();
    if (!res.ok || !data.url) {
      throw new Error(data.error || `Failed to generate auth URL for ${platform}`);
    }
    return data.url;
  },

  async disconnectAccount(id: string): Promise<boolean> {
    const res = await fetch(`/api/connected-accounts/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  async toggleAccount(id: string, isActive: boolean): Promise<boolean> {
    const res = await fetch(`/api/connected-accounts/${encodeURIComponent(id)}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive })
    });
    return res.ok;
  },

  async publishPost(postId: string, actorUsername: string, organizationId?: string): Promise<{ success: boolean; post?: PostRecord; error?: string; publishedUrl?: string }> {
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, actorUsername, organizationId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Direct publishing failed');
    }
    return data;
  },

  async fetchPublishingAttempts(postId: string): Promise<PublishingAttempt[]> {
    const res = await fetch(`/api/publishing/attempts/${encodeURIComponent(postId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.attempts || [];
  },

  // --- Help Assistant & Support Config ---
  async fetchSupportConfig(): Promise<{ whatsappConfigured: boolean; whatsappSupportNumber: string }> {
    try {
      const res = await fetch('/api/config/support');
      if (!res.ok) return { whatsappConfigured: false, whatsappSupportNumber: '' };
      const data = await res.json();
      return {
        whatsappConfigured: Boolean(data.whatsappConfigured),
        whatsappSupportNumber: data.whatsappSupportNumber || ''
      };
    } catch {
      return { whatsappConfigured: false, whatsappSupportNumber: '' };
    }
  },

  async askHelpQuestion(params: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    companyName?: string;
    companyCategory?: string;
    userRole?: string;
    userName?: string;
  }): Promise<{ success: boolean; answer: string; error?: string }> {
    const res = await fetch('/api/help/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'The help assistant is temporarily unavailable. Please try again.');
    }
    return data;
  },

  // --- Database Ownership & Backup ---
  async fetchDatabaseStats(): Promise<{
    success: boolean;
    stats?: {
      engine: string;
      databasePath: string;
      sizeBytes: number;
      sizeKb: string;
      tables: Record<string, number>;
      ownership: string;
      lastExportAvailable: string;
    };
    error?: string;
  }> {
    try {
      const res = await fetch('/api/database/stats');
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  getDatabaseExportUrl(): string {
    return '/api/database/export';
  },

  getDatabaseBackupUrl(): string {
    return '/api/database/backup';
  },

  // --- Enterprise Multi-Company SaaS & Auth ---

  async registerCompany(input: RegisterCompanyInput): Promise<{ company: Company; user: UserAccount; message: string }> {
    const res = await fetch('/api/auth/register-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Registration failed');
    }
    return data;
  },

  async login(input: LoginInput): Promise<{ company: Company; user: UserAccount }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Authentication failed');
    }
    return data;
  },

  async getMe(companyId?: string): Promise<{ company: Company }> {
    const res = await fetch(`/api/auth/me?companyId=${encodeURIComponent(companyId || 'org-nova-unlimited')}`);
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to load session');
    return data;
  },

  // --- CEO Workspace API ---

  async getCeoCompany(companyId: string): Promise<{ company: Company; prompt: CompanyAIPrompt | null }> {
    const res = await fetch(`/api/ceo/company?companyId=${encodeURIComponent(companyId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load company profile');
    return data;
  },

  async updateCeoCompany(companyId: string, updates: Partial<Company>): Promise<{ company: Company; promptStatus: string }> {
    const res = await fetch('/api/ceo/company', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, ...updates })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update company profile');
    return data;
  },

  async getCeoGuidelines(companyId: string): Promise<{ guidelines: CompanyGuidelinesBundle; guidelineVersion: number; prompt: CompanyAIPrompt | null }> {
    const res = await fetch(`/api/ceo/guidelines?companyId=${encodeURIComponent(companyId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load guidelines');
    return data;
  },

  async updateCeoGuidelines(companyId: string, guidelines: CompanyGuidelinesBundle): Promise<{ guidelines: CompanyGuidelinesBundle; guidelineVersion: number; promptStatus: string }> {
    const res = await fetch('/api/ceo/guidelines', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, guidelines })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save guidelines');
    return data;
  },

  async getCeoProfile(companyId: string): Promise<{ ceo: UserAccount; company: Company; stats: any }> {
    const res = await fetch(`/api/ceo/profile?companyId=${encodeURIComponent(companyId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load CEO profile');
    return data;
  },

  async updateCeoProfile(data: { companyId: string; name?: string; loginId?: string; newPassword?: string }): Promise<UserAccount> {
    const res = await fetch('/api/ceo/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to update CEO profile');
    return resData.user;
  },

  async changeCeoPassword(data: { companyId: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/ceo/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to change CEO password');
    return resData;
  },

  async getCeoTeam(companyId: string, includeCeo: boolean = false): Promise<UserAccount[]> {
    const res = await fetch(`/api/ceo/team?companyId=${encodeURIComponent(companyId)}&includeCeo=${includeCeo}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load team');
    return data.team || [];
  },

  async createTeamMember(data: { companyId: string; name: string; password: string; role: Role; department?: string; permissions?: string }): Promise<UserAccount> {
    const res = await fetch('/api/ceo/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to create team member');
    return resData.user;
  },

  async updateTeamMember(userId: string, data: {
    companyId: string;
    name?: string;
    role?: Role;
    status?: 'active' | 'suspended';
    department?: string;
    permissions?: string;
  }): Promise<UserAccount> {
    const res = await fetch(`/api/ceo/team/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to update team member');
    return resData.user;
  },

  async changeTeamMemberPassword(userId: string, data: { companyId: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/ceo/team/${encodeURIComponent(userId)}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to change password');
    return resData;
  },

  async deleteTeamMember(userId: string, companyId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/ceo/team/${encodeURIComponent(userId)}?companyId=${encodeURIComponent(companyId)}`, {
      method: 'DELETE'
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to delete team member');
    return resData;
  },

  async getCeoPrompts(companyId: string): Promise<CompanyAIPrompt | null> {
    const res = await fetch(`/api/ceo/prompts?companyId=${encodeURIComponent(companyId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load prompts');
    return data.prompt;
  },

  async regenerateCeoPrompts(companyId: string): Promise<CompanyAIPrompt> {
    const res = await fetch('/api/ceo/prompts/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to regenerate prompts');
    return data.prompt;
  },

  // --- CEO Connected Accounts & Platform Configurations ---
  async getCeoPlatformConfigs(companyId: string): Promise<CompanyPlatformConfig[]> {
    const res = await fetch(`/api/ceo/platform-configs?companyId=${encodeURIComponent(companyId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load platform configurations');
    return data.configs || [];
  },

  async saveCeoPlatformConfig(companyId: string, data: SaveCompanyPlatformConfigInput): Promise<{ success: boolean; config: CompanyPlatformConfig; message: string }> {
    const res = await fetch('/api/ceo/platform-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, ...data })
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to save platform configuration');
    return resData;
  },

  async deleteCeoPlatformConfig(companyId: string, platform: Platform): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/ceo/platform-configs/${encodeURIComponent(platform.toLowerCase())}?companyId=${encodeURIComponent(companyId)}`, {
      method: 'DELETE'
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to delete platform configuration');
    return resData;
  },

  async toggleCeoPlatformConfig(companyId: string, platform: Platform, isActive: boolean): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/ceo/platform-configs/${encodeURIComponent(platform.toLowerCase())}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, isActive })
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to toggle platform status');
    return resData;
  },

  async testCeoPlatformConfig(companyId: string, platform: Platform): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/ceo/platform-configs/${encodeURIComponent(platform.toLowerCase())}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId })
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Connection test failed');
    return resData;
  },

  // Team Messaging
  async getTeamRoster(companyId: string): Promise<TeamRosterGrouped> {
    const res = await fetch(`/api/messages/roster?companyId=${encodeURIComponent(companyId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch team roster');
    return data.roster;
  },

  async getTeamThread(companyId: string, userId: string, otherUserId: string): Promise<TeamMessage[]> {
    const res = await fetch(`/api/messages/thread?companyId=${encodeURIComponent(companyId)}&userId=${encodeURIComponent(userId)}&otherUserId=${encodeURIComponent(otherUserId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch messages');
    return data.messages || [];
  },

  async sendTeamMessage(data: { companyId: string; senderId: string; receiverId: string; content: string }): Promise<TeamMessage> {
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to send message');
    return resData.message;
  },

  async getRecentConversations(companyId: string, userId: string): Promise<ConversationSummary[]> {
    const res = await fetch(`/api/messages/conversations?companyId=${encodeURIComponent(companyId)}&userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch conversations');
    return data.conversations || [];
  },

  async getUnreadMessageCount(companyId: string, userId: string): Promise<number> {
    const res = await fetch(`/api/messages/unread-count?companyId=${encodeURIComponent(companyId)}&userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) return 0;
    return data.unreadCount || 0;
  },

  async markThreadRead(companyId: string, userId: string, otherUserId: string): Promise<void> {
    await fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, userId, otherUserId })
    });
  },

  // --- BrandLens Admin Platform Methods ---
  async fetchAdminOverview(): Promise<AdminPlatformOverview> {
    const res = await fetch('/api/admin/overview');
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch admin overview');
    return data;
  },

  async fetchAdminBrands(): Promise<AdminBrandOverview[]> {
    const res = await fetch('/api/admin/brands');
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch brands');
    return data.brands || [];
  },

  async createAdminBrand(input: {
    companyName: string;
    companyCategory: string;
    companyEmail: string;
    password?: string;
    description?: string;
    brandVoice?: string;
  }): Promise<{ company: Company; user: UserAccount }> {
    const res = await fetch('/api/admin/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create brand');
    return { company: data.company, user: data.user };
  },

  async updateAdminBrand(brandId: string, updates: Partial<Company>): Promise<Company> {
    const res = await fetch(`/api/admin/brands/${encodeURIComponent(brandId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update brand');
    return data.brand;
  },

  async deleteAdminBrand(brandId: string): Promise<boolean> {
    const res = await fetch(`/api/admin/brands/${encodeURIComponent(brandId)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete brand');
    return true;
  },

  async fetchAdminUsers(): Promise<AdminUserRecord[]> {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch users');
    return data.users || [];
  },

  async updateAdminUser(userId: string, updates: {
    name?: string;
    role?: Role;
    status?: 'active' | 'suspended';
    department?: string;
    permissions?: string;
    newPassword?: string;
  }): Promise<UserAccount> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update user');
    return data.user;
  },

  async deleteAdminUser(userId: string): Promise<boolean> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete user');
    return true;
  },

  async fetchAdminApiSettings(): Promise<{ settings: Record<string, AdminApiSettingItem>; stats: any }> {
    const res = await fetch('/api/admin/apis');
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch API settings');
    return { settings: data.settings, stats: data.stats };
  },

  async saveAdminApiSettings(updates: Record<string, string>): Promise<{ settings: Record<string, AdminApiSettingItem> }> {
    const res = await fetch('/api/admin/apis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save API settings');
    return { settings: data.settings };
  },

  async testAdminService(service: 'gemini' | 'freellm' | 'image_gen' | 'database'): Promise<{ success: boolean; message: string; latency?: number; text?: string; stats?: any }> {
    const res = await fetch('/api/admin/apis/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service })
    });
    return await res.json();
  },

  async vacuumDatabase(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/database/vacuum', {
      method: 'POST'
    });
    return await res.json();
  },

  async impersonateCompany(companyId: string): Promise<{ company: Company; user: UserAccount }> {
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to enter company workspace');
    return { company: data.company, user: data.user };
  }
};



