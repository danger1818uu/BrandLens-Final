export type Role = 'CEO' | 'Employee' | 'Manager' | 'HOD' | 'Administrator';

export type Platform = 'Instagram' | 'LinkedIn' | 'X';

export type PostStatus = 'pending_review' | 'ready_to_post' | 'posted';

export type AIReviewVerdict = 'looks_good' | 'changes_suggested' | 'needs_attention';

export type GovernanceDimensionStatus = 'pass' | 'warning' | 'fail' | 'unclear' | 'needs_verification';

export type IssueSeverity = 'blocking' | 'warning' | 'suggestion';

export type IssueCode =
  | 'OFF_TOPIC'
  | 'ROLE_SCOPE_MISMATCH'
  | 'UNSUPPORTED_CLAIM'
  | 'POTENTIALLY_MISLEADING'
  | 'PLATFORM_MISMATCH'
  | 'BRAND_GUIDELINE_VIOLATION'
  | 'MISSING_CONTEXT'
  | 'APPROVAL_REQUIRED';

export interface GovernanceIssue {
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
  evidence?: string;
  suggestedFix?: string;
}

export interface GovernanceDimensionResult {
  dimension?: 'company_relevance' | 'role_scope' | 'content_quality' | 'platform_suitability' | 'brand_integrity';
  label?: string;
  status: GovernanceDimensionStatus;
  summary: string;
  issues?: GovernanceIssue[];
}

export type OverallVerdict = 'approved' | 'needs_changes' | 'blocked' | 'needs_review' | 'needs_clarification';

export type AITaskType = 'text_review' | 'image_review' | 'image_generation';

export type AITaskStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'NEEDS_REVIEW'
  | 'READY_FOR_POST'
  | 'PENDING_WORK'
  | 'INTERRUPTED'
  | 'FAILED'
  | 'COMPLETED';

export interface TextReviewResult {
  verdict: AIReviewVerdict;
  overallVerdict: OverallVerdict;
  briefAnalysis: string;
  summary?: string;
  suggestion: string;
  suggestedTitle: string | null;
  suggestedCaption: string | null;
  issues: string[];
  isStale?: boolean;

  // Organization-aware governance dimensions (Section 5 Schema)
  organizationId?: string;
  organizationName?: string;
  companyRelevance?: {
    status: GovernanceDimensionStatus;
    summary: string;
  };
  roleScope?: {
    status: GovernanceDimensionStatus;
    summary: string;
  };
  contentQuality?: {
    status: GovernanceDimensionStatus;
    summary: string;
  };
  dimensions?: {
    companyRelevance: GovernanceDimensionResult;
    roleScope: GovernanceDimensionResult;
    contentQuality?: GovernanceDimensionResult;
    platformSuitability: GovernanceDimensionResult;
    brandIntegrity: GovernanceDimensionResult;
  };
  structuredIssues?: GovernanceIssue[];
}

export interface ImageReviewResult {
  verdict: AIReviewVerdict;
  briefAnalysis: string;
  suggestion: string;
  issues: string[];
  isStale?: boolean;

  organizationId?: string;
  relevanceStatus?: GovernanceDimensionStatus;
  structuredIssues?: GovernanceIssue[];
  isPublicSafe?: boolean;
  safetyRating?: 'safe' | 'caution' | 'unsafe';
  explanation?: string;
  suggestions?: string[];
  altTextSuggestion?: string;
  brandRelevance?: string;
  resolutionQuality?: string;
}

export interface PostRecord {
  id: string;
  organizationId?: string;
  authorUsername: string;
  authorRole: Role;
  platform: Platform;
  title: string;
  caption: string;
  status: PostStatus;
  isEnhanced?: boolean;
  postedAt?: string | null;
  mediaRef?: string | null;
  mediaType?: 'image' | 'video' | 'pdf' | null;
  mediaOriginalName?: string | null;
  mediaSize?: number | null;
  textReviewResult?: TextReviewResult | null;
  imageReviewResult?: ImageReviewResult | null;
  unresolvedIssuesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostActivity {
  id: string;
  postId: string;
  actorUsername: string;
  eventType: 'created' | 'text_reviewed' | 'image_reviewed' | 'image_generated' | 'updated' | 'status_changed' | 'published' | 'publish_failed' | 'fix_applied';
  description: string;
  createdAt: string;
}

export interface MetricCounts {
  total: number;
  pending: number;
  enhanced: number;
  published: number;
}

export interface AITaskRecord {
  id: string;
  organizationId?: string;
  postId?: string | null;
  authorUsername: string;
  authorRole: Role;
  taskType: AITaskType;
  status: AITaskStatus;
  inputPayload: {
    title: string;
    caption: string;
    platform: Platform;
    mediaRef?: string | null;
  };
  outputPayload?: {
    textReview?: TextReviewResult | null;
    imageReview?: ImageReviewResult | null;
    generatedPrompt?: string | null;
    mediaRef?: string | null;
    mediaType?: 'image' | 'video' | 'pdf' | null;
  } | null;
  errorMessage?: string | null;
  progressMessage?: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface PostDraft {
  authorUsername: string;
  organizationId?: string;
  authorRole: Role;
  platform: Platform;
  title: string;
  caption: string;
  mediaRef?: string | null;
  mediaType?: 'image' | 'video' | 'pdf' | null;
  mediaOriginalName?: string | null;
  mediaSize?: number | null;
  textReviewResult?: TextReviewResult | null;
  imageReviewResult?: ImageReviewResult | null;
  updatedAt: string;
}

// --- Simplified AI Review Types ---
export type SimplifiedVerdict = 'ready_to_post' | 'needs_fix' | 'needs_review';
export type SimplifiedCheckStatus = 'pass' | 'check' | 'action_needed';

export interface SimplifiedCheck {
  id: 'company_relevance' | 'role_permissions' | 'content_quality';
  label: string;
  description: string;
  status: SimplifiedCheckStatus;
  statusLabel: string;
  summary: string;
}

export interface ResolvedIssue {
  id: string;
  title: string;
  originalMessage: string;
  fixApplied: string;
  resolvedAt: string;
}

// --- Social Platform Accounts & Direct Publishing ---
export interface ConnectedAccount {
  id: string;
  organizationId: string;
  platform: Platform;
  accountIdentifier: string; // e.g. @nova_unlimited
  accountName: string;
  accountAvatar?: string | null;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isConfigured?: boolean; // whether server env vars for this platform exist
}

export interface PublishingAttempt {
  id: string;
  postId: string;
  platform: Platform;
  accountId?: string | null;
  attemptStatus: 'pending' | 'success' | 'failed';
  platformPostId?: string | null;
  platformPostUrl?: string | null;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface PlatformConfigStatus {
  platform: Platform;
  isConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  redirectUri: string;
  appDomain?: string;
  siteUrl?: string;
  requiredScopes: string[];
  instructions: string[];
}

export interface CompanyPlatformConfig {
  id: string;
  companyId: string;
  platform: Platform;
  clientId: string;
  clientSecretMasked?: string;
  hasClientSecret: boolean;
  accessTokenMasked?: string;
  hasAccessToken: boolean;
  pageId?: string;
  accountName?: string;
  accountIdentifier?: string;
  isActive: boolean;
  isConfigured: boolean;
  updatedAt: string;
  redirectUri?: string;
  appDomain?: string;
  siteUrl?: string;
  requiredScopes?: string[];
  instructions?: string[];
}

export interface SaveCompanyPlatformConfigInput {
  platform: Platform;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  pageId?: string;
  accountName?: string;
  accountIdentifier?: string;
  isActive?: boolean;
}

// --- Multi-Company SaaS & Enterprise Workspace Types ---
export type CompanyCategory =
  | 'Technology'
  | 'Cosmetics'
  | 'Education'
  | 'Services'
  | 'Art and Design'
  | 'Healthcare'
  | 'Finance'
  | 'E-commerce'
  | 'Media and Entertainment'
  | 'Manufacturing'
  | 'Consulting'
  | 'Other';

export interface Company {
  id: string;
  name: string;
  category: CompanyCategory | string;
  email: string; // Registered CEO login email
  description: string;
  productsServices: string;
  targetAudience: string;
  brandVoice: string;
  approvedTerminology: string;
  companyContext: string;
  profileVersion: number;
  guidelineVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  companyId: string;
  name: string;
  loginId: string; // Unique login email/handle
  username?: string;
  role: Role;
  department?: string;
  permissions?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface CompanyGuideline {
  id: string;
  companyId: string;
  scope: 'company_wide' | 'employee' | 'manager' | 'hod' | 'post_type' | 'platform';
  content: string;
  version: number;
  updatedAt: string;
}

export interface CompanyGuidelinesBundle {
  companyWide: string;
  employee: string;
  manager: string;
  hod: string;
  platformLinkedIn?: string;
  platformInstagram?: string;
  platformX?: string;
}

export interface CompanyAIPrompt {
  id: string;
  companyId: string;
  configurationVersion: number;
  sourceProfileVersion: number;
  sourceGuidelinesVersion: number;
  compactCompanyContext: string;
  employeeInstructions: string;
  managerInstructions: string;
  hodInstructions: string;
  textGenerationInstructions: string;
  textEnhancementInstructions: string;
  imageGenerationInstructions: string;
  imageReviewInstructions: string;
  documentReviewInstructions: string;
  platformInstructions: Record<string, string>;
  generationStatus: 'current' | 'needs_refresh' | 'generating' | 'failed';
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: UserAccount;
  company: Company;
  token?: string;
}

export interface RegisterCompanyInput {
  companyName: string;
  companyCategory: string;
  companyEmail: string;
  password: string;
}

export interface LoginInput {
  loginId: string;
  password: string;
  role?: Role;
}

export interface TeamMessage {
  id: string;
  companyId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  receiverId: string;
  receiverName: string;
  receiverRole: Role;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  otherUser: UserAccount;
  lastMessage?: TeamMessage;
  unreadCount: number;
}

export interface TeamRosterGrouped {
  employees: UserAccount[];
  managers: UserAccount[];
  hods: UserAccount[];
  ceo: UserAccount | null;
  all: UserAccount[];
}

export interface AdminBrandOverview {
  id: string;
  name: string;
  category: string;
  email: string;
  description: string;
  productsServices: string;
  targetAudience: string;
  brandVoice: string;
  approvedTerminology: string;
  companyContext: string;
  profileVersion: number;
  guidelineVersion: number;
  totalUsers: number;
  totalPosts: number;
  pendingPosts: number;
  readyPosts: number;
  postedPosts: number;
  connectedPlatforms: string[];
  promptStatus: string;
  ceoName: string;
  ceoEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserRecord {
  id: string;
  companyId: string;
  companyName: string;
  companyCategory: string;
  name: string;
  loginId: string;
  role: Role;
  status: 'active' | 'suspended';
  department: string;
  permissions: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlatformOverview {
  totalBrands: number;
  totalUsers: number;
  totalPosts: number;
  totalTasks: number;
  totalMessages: number;
  pendingPosts: number;
  readyPosts: number;
  postedPosts: number;
  enhancedPosts: number;
  aiStats: {
    textReviews: number;
    imageReviews: number;
    imageGens: number;
    completedTasks: number;
    failedTasks: number;
  };
  dbSizeBytes: number;
  dbSizeFormatted: string;
  systemUptime: number;
  nodeVersion: string;
  geminiConfigured: boolean;
  whatsappConfigured: boolean;
  whatsappNumber: string;
}

export interface AdminApiSettingItem {
  value: string;
  masked: string;
  isSet: boolean;
}


