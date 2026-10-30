import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  PostRecord,
  PostStatus,
  PostActivity,
  MetricCounts,
  Role,
  Platform,
  AITaskRecord,
  AITaskStatus,
  AITaskType,
  PostDraft,
  ConnectedAccount,
  PublishingAttempt,
  Company,
  UserAccount,
  CompanyGuideline,
  CompanyGuidelinesBundle,
  CompanyAIPrompt,
  RegisterCompanyInput,
  LoginInput,
  CompanyPlatformConfig,
  SaveCompanyPlatformConfigInput,
  TeamMessage,
  ConversationSummary,
  TeamRosterGrouped
} from '../src/types/index.ts';
import { encryptToken, decryptToken } from './encryption.ts';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'brandlens.db');
const db = new DatabaseSync(dbPath);

// Defensive Pragmas for Production Concurrency & Reliability
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (pragmaErr) {
  console.warn('Notice: SQLite defensive pragma initialization:', pragmaErr);
}

// Fail-safe JSON parser preventing server 500 crashes from malformed data
export function safeJsonParse<T = any>(str: string | null | undefined, fallback: T): T {
  if (!str || typeof str !== 'string') return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// Password hashing and verification using standard PBKDF2 with SHA-512
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, chosenSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: chosenSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    productsServices TEXT NOT NULL DEFAULT '',
    targetAudience TEXT NOT NULL DEFAULT '',
    brandVoice TEXT NOT NULL DEFAULT '',
    approvedTerminology TEXT NOT NULL DEFAULT '',
    companyContext TEXT NOT NULL DEFAULT '',
    profileVersion INTEGER DEFAULT 1,
    guidelineVersion INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    loginId TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS company_guidelines (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    scope TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    version INTEGER DEFAULT 1,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS company_ai_prompts (
    id TEXT PRIMARY KEY,
    companyId TEXT UNIQUE NOT NULL,
    configurationVersion INTEGER DEFAULT 1,
    sourceProfileVersion INTEGER DEFAULT 1,
    sourceGuidelinesVersion INTEGER DEFAULT 1,
    compactCompanyContext TEXT NOT NULL DEFAULT '',
    employeeInstructions TEXT NOT NULL DEFAULT '',
    managerInstructions TEXT NOT NULL DEFAULT '',
    hodInstructions TEXT NOT NULL DEFAULT '',
    textGenerationInstructions TEXT NOT NULL DEFAULT '',
    textEnhancementInstructions TEXT NOT NULL DEFAULT '',
    imageGenerationInstructions TEXT NOT NULL DEFAULT '',
    imageReviewInstructions TEXT NOT NULL DEFAULT '',
    documentReviewInstructions TEXT NOT NULL DEFAULT '',
    platformInstructions TEXT NOT NULL DEFAULT '{}',
    generationStatus TEXT NOT NULL DEFAULT 'current',
    errorMessage TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    authorUsername TEXT NOT NULL,
    authorRole TEXT NOT NULL,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    caption TEXT NOT NULL,
    status TEXT NOT NULL,
    isEnhanced INTEGER DEFAULT 0,
    postedAt TEXT,
    mediaRef TEXT,
    mediaType TEXT,
    mediaOriginalName TEXT,
    mediaSize INTEGER,
    textReviewResult TEXT,
    imageReviewResult TEXT,
    unresolvedIssuesCount INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS post_activities (
    id TEXT PRIMARY KEY,
    postId TEXT NOT NULL,
    actorUsername TEXT NOT NULL,
    eventType TEXT NOT NULL,
    description TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_tasks (
    id TEXT PRIMARY KEY,
    postId TEXT,
    authorUsername TEXT NOT NULL,
    authorRole TEXT NOT NULL,
    taskType TEXT NOT NULL,
    status TEXT NOT NULL,
    inputPayload TEXT NOT NULL,
    outputPayload TEXT,
    errorMessage TEXT,
    progressMessage TEXT,
    startedAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    completedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS drafts (
    authorUsername TEXT PRIMARY KEY,
    authorRole TEXT NOT NULL,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    caption TEXT NOT NULL,
    mediaRef TEXT,
    mediaType TEXT,
    mediaOriginalName TEXT,
    mediaSize INTEGER,
    textReviewResult TEXT,
    imageReviewResult TEXT,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS connected_accounts (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    platform TEXT NOT NULL,
    accountIdentifier TEXT NOT NULL,
    accountName TEXT NOT NULL,
    accountAvatar TEXT,
    accessTokenEnc TEXT NOT NULL,
    refreshTokenEnc TEXT,
    tokenExpiresAt TEXT,
    scopes TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS publishing_attempts (
    id TEXT PRIMARY KEY,
    postId TEXT NOT NULL,
    platform TEXT NOT NULL,
    accountId TEXT,
    attemptStatus TEXT NOT NULL,
    platformPostId TEXT,
    platformPostUrl TEXT,
    errorMessage TEXT,
    startedAt TEXT NOT NULL,
    completedAt TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(authorUsername);
  CREATE INDEX IF NOT EXISTS idx_activities_post ON post_activities(postId);
  CREATE INDEX IF NOT EXISTS idx_tasks_author ON ai_tasks(authorUsername);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON ai_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_accounts_org ON connected_accounts(organizationId);
  CREATE INDEX IF NOT EXISTS idx_pub_post ON publishing_attempts(postId);
  CREATE INDEX IF NOT EXISTS idx_users_company ON users(companyId);
  CREATE INDEX IF NOT EXISTS idx_users_login ON users(loginId);
  CREATE INDEX IF NOT EXISTS idx_guidelines_company ON company_guidelines(companyId);
  CREATE INDEX IF NOT EXISTS idx_ai_prompts_company ON company_ai_prompts(companyId);

  CREATE TABLE IF NOT EXISTS company_platform_configs (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    platform TEXT NOT NULL,
    clientId TEXT,
    clientSecretEnc TEXT,
    accessTokenEnc TEXT,
    refreshTokenEnc TEXT,
    pageId TEXT,
    accountName TEXT,
    accountIdentifier TEXT,
    isActive INTEGER DEFAULT 1,
    isConfigured INTEGER DEFAULT 0,
    updatedAt TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_platform ON company_platform_configs(companyId, platform);

  CREATE TABLE IF NOT EXISTS team_messages (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    senderId TEXT NOT NULL,
    senderName TEXT NOT NULL,
    senderRole TEXT NOT NULL,
    receiverId TEXT NOT NULL,
    receiverName TEXT NOT NULL,
    receiverRole TEXT NOT NULL,
    content TEXT NOT NULL,
    isRead INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_team_msg_company ON team_messages(companyId);
  CREATE INDEX IF NOT EXISTS idx_team_msg_pair ON team_messages(companyId, senderId, receiverId);
  CREATE INDEX IF NOT EXISTS idx_team_msg_created ON team_messages(createdAt);
`);

// Safe schema & data migration for unified post status lifecycle, isEnhanced, and organizationId
function migrateSchemaAndData() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS team_messages (
        id TEXT PRIMARY KEY,
        companyId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        senderName TEXT NOT NULL,
        senderRole TEXT NOT NULL,
        receiverId TEXT NOT NULL,
        receiverName TEXT NOT NULL,
        receiverRole TEXT NOT NULL,
        content TEXT NOT NULL,
        isRead INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_team_msg_company ON team_messages(companyId);
      CREATE INDEX IF NOT EXISTS idx_team_msg_pair ON team_messages(companyId, senderId, receiverId);
      CREATE INDEX IF NOT EXISTS idx_team_msg_created ON team_messages(createdAt);
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_platform_configs (
        id TEXT PRIMARY KEY,
        companyId TEXT NOT NULL,
        platform TEXT NOT NULL,
        clientId TEXT,
        clientSecretEnc TEXT,
        accessTokenEnc TEXT,
        refreshTokenEnc TEXT,
        pageId TEXT,
        accountName TEXT,
        accountIdentifier TEXT,
        isActive INTEGER DEFAULT 1,
        isConfigured INTEGER DEFAULT 0,
        updatedAt TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_platform ON company_platform_configs(companyId, platform);
      CREATE TABLE IF NOT EXISTS platform_api_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // Sync saved API settings into process.env on startup
    try {
      const storedSettings = db.prepare('SELECT key, value FROM platform_api_settings').all() as Array<{ key: string; value: string }>;
      for (const s of storedSettings) {
        if (s.value && s.value.trim()) {
          process.env[s.key] = s.value;
        }
      }
    } catch {}

    const tableInfo = db.prepare('PRAGMA table_info(posts)').all() as Array<{ name: string }>;
    const colNames = new Set(tableInfo.map(c => c.name));

    if (!colNames.has('isEnhanced')) {
      db.exec('ALTER TABLE posts ADD COLUMN isEnhanced INTEGER DEFAULT 0;');
    }
    if (!colNames.has('postedAt')) {
      db.exec('ALTER TABLE posts ADD COLUMN postedAt TEXT;');
    }
    if (!colNames.has('organizationId')) {
      db.exec("ALTER TABLE posts ADD COLUMN organizationId TEXT DEFAULT 'org-nova-unlimited';");
    }

    // ai_tasks table migration
    const taskInfo = db.prepare('PRAGMA table_info(ai_tasks)').all() as Array<{ name: string }>;
    const taskCols = new Set(taskInfo.map(c => c.name));
    if (!taskCols.has('organizationId')) {
      db.exec("ALTER TABLE ai_tasks ADD COLUMN organizationId TEXT DEFAULT 'org-nova-unlimited';");
    }

    // drafts table migration
    const draftInfo = db.prepare('PRAGMA table_info(drafts)').all() as Array<{ name: string }>;
    const draftCols = new Set(draftInfo.map(c => c.name));
    if (!draftCols.has('organizationId')) {
      db.exec("ALTER TABLE drafts ADD COLUMN organizationId TEXT DEFAULT 'org-nova-unlimited';");
    }

    // Ensure all existing rows have organizationId populated
    db.prepare("UPDATE posts SET organizationId = 'org-nova-unlimited' WHERE organizationId IS NULL OR organizationId = ''").run();
    db.prepare("UPDATE ai_tasks SET organizationId = 'org-nova-unlimited' WHERE organizationId IS NULL OR organizationId = ''").run();
    db.prepare("UPDATE drafts SET organizationId = 'org-nova-unlimited' WHERE organizationId IS NULL OR organizationId = ''").run();

    // Migrate any legacy status values safely:
    // 'Published' or 'published' -> 'posted'
    db.prepare(`
      UPDATE posts
      SET status = 'posted',
          postedAt = COALESCE(postedAt, updatedAt)
      WHERE status IN ('Published', 'published')
    `).run();

    // 'Pending' with 0 unresolved issues and existing review -> 'ready_to_post'
    db.prepare(`
      UPDATE posts
      SET status = 'ready_to_post'
      WHERE status = 'Pending' AND unresolvedIssuesCount = 0 AND (textReviewResult IS NOT NULL OR mediaRef IS NOT NULL)
    `).run();

    // Remaining 'Pending' -> 'pending_review'
    db.prepare(`
      UPDATE posts
      SET status = 'pending_review'
      WHERE status = 'Pending'
    `).run();

    // Backfill isEnhanced for any post that had an applied suggestion or ai-generated image
    db.prepare(`
      UPDATE posts
      SET isEnhanced = 1
      WHERE isEnhanced = 0 AND (mediaOriginalName LIKE '%ai-generated%' OR (textReviewResult LIKE '%"isStale":true%' AND textReviewResult LIKE '%"suggested%'))
    `).run();

    // users table migration: department and permissions
    const userInfo = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
    const userCols = new Set(userInfo.map(c => c.name));
    if (!userCols.has('department')) {
      db.exec("ALTER TABLE users ADD COLUMN department TEXT NOT NULL DEFAULT 'Engineering';");
    }
    if (!userCols.has('permissions')) {
      db.exec("ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT 'Full Access';");
    }

    // Default departmental categorization
    db.prepare("UPDATE users SET department = 'Executive' WHERE role = 'CEO' AND (department IS NULL OR department = '' OR department = 'Engineering')").run();
    db.prepare("UPDATE users SET department = 'Systems Architecture' WHERE role = 'HOD' AND (department IS NULL OR department = '' OR department = 'Engineering')").run();
    db.prepare("UPDATE users SET department = 'Technical Operations' WHERE role = 'Manager' AND (department IS NULL OR department = '' OR department = 'Engineering')").run();
  } catch (err) {
    console.error('Migration error:', err);
  }
}
migrateSchemaAndData();

// Task recovery logic on server startup:
// Interrupted jobs that were queued or processing during restart are marked as INTERRUPTED
function recoverStaleTasks() {
  try {
    const stale = db.prepare(`SELECT id FROM ai_tasks WHERE status IN ('QUEUED', 'PROCESSING')`).all() as Array<{ id: string }>;
    const now = new Date().toISOString();
    for (const task of stale) {
      db.prepare(`
        UPDATE ai_tasks
        SET status = 'INTERRUPTED',
            progressMessage = 'Operation interrupted by server restart. Ready to resume.',
            updatedAt = ?
        WHERE id = ?
      `).run(now, task.id);
    }
    if (stale.length > 0) {
      console.log(`Recovered ${stale.length} interrupted AI task(s) on startup.`);
    }
  } catch (err) {
    console.error('Task recovery check error:', err);
  }
}
recoverStaleTasks();

// Seed initial role-specific demo data if empty
function seedIfEmpty() {
  const rowCount = db.prepare('SELECT COUNT(*) as cnt FROM posts').get() as { cnt: number };
  if (rowCount.cnt > 0) return;

  const now = new Date();
  const makeDate = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();

  const starterPosts: Array<{
    id: string;
    authorUsername: string;
    authorRole: Role;
    platform: Platform;
    title: string;
    caption: string;
    status: PostStatus;
    isEnhanced: number;
    postedAt?: string | null;
    unresolvedIssuesCount: number;
    textReviewResult?: string;
    createdAt: string;
  }> = [
    {
      id: 'post-emp-1',
      authorUsername: 'employee',
      authorRole: 'Employee',
      platform: 'LinkedIn',
      title: 'BrandLens Precision Optics 2.0 Release',
      caption: 'Introducing our refined optical calibration engine. Experience 4x faster perceptual alignment across digital campaigns with zero artifact distortion.',
      status: 'ready_to_post',
      isEnhanced: 1,
      postedAt: null,
      unresolvedIssuesCount: 0,
      textReviewResult: JSON.stringify({
        verdict: 'looks_good',
        briefAnalysis: 'Technical specifications are clear, professional, and well-aligned with product guidelines.',
        suggestion: 'Consider specifying target integration partners in the follow-up thread.',
        suggestedTitle: null,
        suggestedCaption: null,
        issues: []
      }),
      createdAt: makeDate(5)
    },
    {
      id: 'post-emp-2',
      authorUsername: 'employee',
      authorRole: 'Employee',
      platform: 'Instagram',
      title: 'Behind the Glass: Engineering Light Flow',
      caption: 'Every curve in our refractive lens is crafted with sub-micron precision to guarantee crystal clarity in every digital impression.',
      status: 'pending_review',
      isEnhanced: 0,
      postedAt: null,
      unresolvedIssuesCount: 1,
      textReviewResult: JSON.stringify({
        verdict: 'changes_suggested',
        briefAnalysis: 'Strong visual narrative, but "sub-micron precision" should clarify hardware vs algorithmic lens calibration.',
        suggestion: 'Clarify that this refers to software-rendered optical processing.',
        suggestedTitle: null,
        suggestedCaption: 'Every curve in our algorithmic refractive lens is calculated with sub-micron fidelity to guarantee crystal clarity in every impression.',
        issues: ['Ambiguous hardware vs software calibration terminology']
      }),
      createdAt: makeDate(18)
    },
    {
      id: 'post-mgr-1',
      authorUsername: 'manager',
      authorRole: 'Manager',
      platform: 'LinkedIn',
      title: 'Q4 Brand Governance Milestone: 100% Policy Consistency',
      caption: 'Our team crossed 12,000 reviewed assets this quarter. Strategic alignment between marketing and product engineering has reduced compliance review cycles by 40%.',
      status: 'ready_to_post',
      isEnhanced: 1,
      postedAt: null,
      unresolvedIssuesCount: 0,
      textReviewResult: JSON.stringify({
        verdict: 'looks_good',
        briefAnalysis: 'Clear executive communication highlighting measurable team accomplishments.',
        suggestion: 'Highlight team member contributions in subsequent posts.',
        suggestedTitle: null,
        suggestedCaption: null,
        issues: []
      }),
      createdAt: makeDate(8)
    },
    {
      id: 'post-adm-1',
      authorUsername: 'admin',
      authorRole: 'Administrator',
      platform: 'X',
      title: 'BrandLens Global Enterprise Architecture Standard',
      caption: 'Announcing our updated corporate identity framework for multi-tenant brand governance. Unified clarity across all brand touchpoints.',
      status: 'posted',
      isEnhanced: 0,
      postedAt: makeDate(2),
      unresolvedIssuesCount: 0,
      textReviewResult: JSON.stringify({
        verdict: 'looks_good',
        briefAnalysis: 'Accurate organization-wide messaging adhering to core corporate tone.',
        suggestion: 'Add link to updated identity guidelines doc.',
        suggestedTitle: null,
        suggestedCaption: null,
        issues: []
      }),
      createdAt: makeDate(2)
    }
  ];

  const insertPost = db.prepare(`
    INSERT INTO posts (
      id, authorUsername, authorRole, platform, title, caption, status,
      isEnhanced, postedAt,
      mediaRef, mediaType, mediaOriginalName, mediaSize,
      textReviewResult, imageReviewResult, unresolvedIssuesCount, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const insertActivity = db.prepare(`
    INSERT INTO post_activities (id, postId, actorUsername, eventType, description, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const p of starterPosts) {
    insertPost.run(
      p.id,
      p.authorUsername,
      p.authorRole,
      p.platform,
      p.title,
      p.caption,
      p.status,
      p.isEnhanced,
      p.postedAt || null,
      null,
      null,
      null,
      null,
      p.textReviewResult || null,
      null,
      p.unresolvedIssuesCount,
      p.createdAt,
      p.createdAt
    );

    insertActivity.run(
      `act-${p.id}-created`,
      p.id,
      p.authorUsername,
      'created',
      `Post created and saved as ${p.status === 'ready_to_post' ? 'Ready to Post' : p.status === 'posted' ? 'Posted' : 'Pending for Review'}`,
      p.createdAt
    );

    if (p.textReviewResult) {
      insertActivity.run(
        `act-${p.id}-review`,
        p.id,
        p.authorUsername,
        'text_reviewed',
        'AI text review analysis completed',
        p.createdAt
      );
    }
  }
}

seedIfEmpty();

function seedNovaUnlimitedAndDefaults() {
  try {
    const now = new Date().toISOString();

    // 0. Ensure BrandLens Platform Admin Company and SuperAdmin User exist
    const existingAdminComp = db.prepare("SELECT id FROM companies WHERE id = 'org-brandlens-hq' OR LOWER(email) = 'brandlens@gmail.com'").get() as any;
    if (!existingAdminComp) {
      db.prepare(`
        INSERT INTO companies (
          id, name, category, email, description, productsServices, targetAudience,
          brandVoice, approvedTerminology, companyContext, profileVersion, guidelineVersion,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'org-brandlens-hq',
        'BrandLens HQ',
        'Platform Operations & Intelligence',
        'brandlens@gmail.com',
        'BrandLens Central Operations & Global Brand Intelligence Administration.',
        'Enterprise social media brand governance, multi-tenant intelligence, AI moderation, direct API publishing, API key vault.',
        'Platform administrators, enterprise security leads, and brand directors.',
        'Authoritative, secure, clear, and direct.',
        'Root privilege, global tenant, api key vault, multi-company architecture.',
        'Central operations command for BrandLens enterprise nodes.',
        1,
        1,
        now,
        now
      );
    }

    const { hash: adminHash, salt: adminSalt } = hashPassword('brandlensadmin');
    const existingAdminUser = db.prepare("SELECT id FROM users WHERE LOWER(loginId) = 'brandlens@gmail.com'").get() as any;
    if (!existingAdminUser) {
      db.prepare(`
        INSERT INTO users (id, companyId, name, loginId, passwordHash, salt, role, status, department, permissions, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
      `).run(
        'usr-brandlens-admin',
        'org-brandlens-hq',
        'BrandLens Administrator',
        'brandlens@gmail.com',
        adminHash,
        adminSalt,
        'Administrator',
        'Platform Operations',
        'Global Root Access',
        now,
        now
      );
    } else {
      // Ensure password is always verified to brandlensadmin
      db.prepare(`
        UPDATE users SET passwordHash = ?, salt = ?, role = 'Administrator', status = 'active'
        WHERE LOWER(loginId) = 'brandlens@gmail.com'
      `).run(adminHash, adminSalt);
    }

    // 1. Ensure Nova Unlimited company exists
    const existingComp = db.prepare("SELECT id FROM companies WHERE id = 'org-nova-unlimited' OR LOWER(email) = 'novaunlimited0@gmail.com'").get() as any;
    if (!existingComp) {
      db.prepare(`
        INSERT INTO companies (
          id, name, category, email, description, productsServices, targetAudience,
          brandVoice, approvedTerminology, companyContext, profileVersion, guidelineVersion,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'org-nova-unlimited',
        'Nova Unlimited',
        'Technology',
        'novaunlimited0@gmail.com',
        'Nova Unlimited is a technology-focused service provider specializing in server and hosting solutions. Its communications should focus on hosting services, infrastructure, technical support, service features, and information verified by the company.',
        'High-performance cloud servers, managed VPS hosting, dedicated bare-metal infrastructure, 24/7 technical operations support, and automated backup storage.',
        'IT directors, software developers, DevOps engineers, and digital agencies seeking dependable server infrastructure.',
        'Direct, technically accurate, clear, and reassuring without hype, exaggeration, or unverified claims.',
        'Bare-metal nodes, provisioned latency, verified redundancy, dedicated compute, zero unannounced maintenance.',
        'Nova Unlimited operates tier-3 data center partner facilities. All uptime and SLA metrics must be backed by official SLA documentation.',
        1,
        1,
        now,
        now
      );
    }

    // 2. Ensure Nova Unlimited users exist
    const defaultUsers = [
      {
        id: 'usr-nova-ceo',
        companyId: 'org-nova-unlimited',
        name: 'Alexander Vance (CEO)',
        loginId: 'novaunlimited0@gmail.com',
        password: 'ceo123',
        role: 'CEO' as Role,
        department: 'Executive Leadership',
        permissions: 'Full Administration'
      },
      {
        id: 'usr-nova-emp',
        companyId: 'org-nova-unlimited',
        name: 'Sarah Chen (Cloud Engineer)',
        loginId: 'employee@novaunlimited.test',
        password: 'employee123',
        role: 'Employee' as Role,
        department: 'Cloud Engineering',
        permissions: 'Review Required'
      },
      {
        id: 'usr-nova-mgr',
        companyId: 'org-nova-unlimited',
        name: 'Marcus Brody (Ops Lead)',
        loginId: 'manager@novaunlimited.test',
        password: 'manager123',
        role: 'Manager' as Role,
        department: 'Technical Operations',
        permissions: 'Full Publishing'
      },
      {
        id: 'usr-nova-hod',
        companyId: 'org-nova-unlimited',
        name: 'Dr. Elena Rostova (VP Infrastructure)',
        loginId: 'hod@novaunlimited.test',
        password: 'hod123',
        role: 'HOD' as Role,
        department: 'Systems Architecture',
        permissions: 'Departmental Sign-Off'
      },
      {
        id: 'usr-nova-emp-liam',
        companyId: 'org-nova-unlimited',
        name: 'Liam Gallagher (DevOps Reliability)',
        loginId: 'liam.devops@novaunlimited.test',
        password: 'employee123',
        role: 'Employee' as Role,
        department: 'Technical Operations',
        permissions: 'Review Required'
      },
      {
        id: 'usr-nova-emp-amara',
        companyId: 'org-nova-unlimited',
        name: 'Amara Okafor (Developer Relations)',
        loginId: 'amara.advocate@novaunlimited.test',
        password: 'employee123',
        role: 'Employee' as Role,
        department: 'Developer Advocacy',
        permissions: 'Review Required'
      },
      {
        id: 'usr-nova-mgr-priya',
        companyId: 'org-nova-unlimited',
        name: 'Priya Sharma (Brand Director)',
        loginId: 'priya.marketing@novaunlimited.test',
        password: 'manager123',
        role: 'Manager' as Role,
        department: 'Brand Marketing',
        permissions: 'Full Publishing'
      },
      {
        id: 'usr-nova-hod-marcus',
        companyId: 'org-nova-unlimited',
        name: 'Marcus Vance (Head of Governance)',
        loginId: 'marcus.governance@novaunlimited.test',
        password: 'hod123',
        role: 'HOD' as Role,
        department: 'Enterprise Governance',
        permissions: 'Departmental Sign-Off'
      },
      // Backward-compatible aliases
      {
        id: 'usr-nova-alias-emp',
        companyId: 'org-nova-unlimited',
        name: 'Sarah Chen',
        loginId: 'employee',
        password: 'employee123',
        role: 'Employee' as Role,
        department: 'Cloud Engineering',
        permissions: 'Review Required'
      },
      {
        id: 'usr-nova-alias-mgr',
        companyId: 'org-nova-unlimited',
        name: 'Marcus Brody',
        loginId: 'manager',
        password: 'manager123',
        role: 'Manager' as Role,
        department: 'Technical Operations',
        permissions: 'Full Publishing'
      },
      {
        id: 'usr-nova-alias-adm',
        companyId: 'org-nova-unlimited',
        name: 'System Administrator',
        loginId: 'admin',
        password: 'admin123',
        role: 'Administrator' as Role,
        department: 'Executive Leadership',
        permissions: 'Full Administration'
      }
    ];

    for (const u of defaultUsers) {
      const exists = db.prepare('SELECT id FROM users WHERE LOWER(loginId) = LOWER(?)').get(u.loginId);
      if (!exists) {
        const { hash, salt } = hashPassword(u.password);
        db.prepare(`
          INSERT INTO users (id, companyId, name, loginId, passwordHash, salt, role, status, department, permissions, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
        `).run(u.id, u.companyId, u.name, u.loginId, hash, salt, u.role, u.department || 'Engineering', u.permissions || 'Full Access', now, now);
      } else {
        db.prepare(`
          UPDATE users SET department = ?, permissions = ?
          WHERE LOWER(loginId) = LOWER(?) AND (department IS NULL OR department = '' OR department = 'Engineering')
        `).run(u.department || 'Engineering', u.permissions || 'Full Access', u.loginId);
      }
    }

    // 3. Ensure Nova guidelines exist
    const guidelinesCount = (db.prepare("SELECT COUNT(*) as count FROM company_guidelines WHERE companyId = 'org-nova-unlimited'").get() as any)?.count || 0;
    if (guidelinesCount === 0) {
      const defaultGuidelines = [
        {
          scope: 'company_wide',
          content: `- Keep communication clear, professional, and technically understandable.\n- Describe server and hosting services accurately.\n- Do not invent uptime percentages, prices, performance guarantees, certifications, customer numbers, or other unsupported claims.\n- Use only verified company information for factual claims.\n- Never reveal confidential customer or infrastructure data.\n- Escalate uncertain or sensitive claims to human review.`
        },
        {
          scope: 'employee',
          content: `- Draft company-relevant content.\n- Use approved facts and terminology.\n- Avoid unsupported promises.\n- Submit content for the required review.`
        },
        {
          scope: 'manager',
          content: `- Review clarity, relevance, and compliance.\n- Request corrections where needed.\n- Escalate unsupported technical claims.\n- Do not approve claims lacking adequate evidence.`
        },
        {
          scope: 'hod',
          content: `- Review content requiring specialist knowledge.\n- Check factual and technical accuracy where evidence is available.\n- Escalate unclear or sensitive claims.\n- Follow the existing review and approval workflow.`
        },
        {
          scope: 'platform_linkedin',
          content: `Professional tone, focus on infrastructure reliability, developer workflows, and verified technical announcements.`
        },
        {
          scope: 'platform_instagram',
          content: `Visually clean, modern server hardware, tech workspace, team excellence, avoiding text-heavy banners.`
        },
        {
          scope: 'platform_x',
          content: `Concise engineering updates, network status alerts, developer tips, maximum 280 characters.`
        }
      ];

      for (const g of defaultGuidelines) {
        db.prepare(`
          INSERT INTO company_guidelines (id, companyId, scope, content, version, updatedAt)
          VALUES (?, 'org-nova-unlimited', ?, ?, 1, ?)
        `).run(`guide-nova-${g.scope}`, g.scope, g.content, now);
      }
    }

    // 4. Ensure Nova AI Prompts exist
    const existingPrompt = db.prepare("SELECT id FROM company_ai_prompts WHERE companyId = 'org-nova-unlimited'").get();
    if (!existingPrompt) {
      db.prepare(`
        INSERT INTO company_ai_prompts (
          id, companyId, configurationVersion, sourceProfileVersion, sourceGuidelinesVersion,
          compactCompanyContext, employeeInstructions, managerInstructions, hodInstructions,
          textGenerationInstructions, textEnhancementInstructions, imageGenerationInstructions,
          imageReviewInstructions, documentReviewInstructions, platformInstructions,
          generationStatus, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'prompt-org-nova-unlimited',
        'org-nova-unlimited',
        1,
        1,
        1,
        'Nova Unlimited provides high-performance cloud servers, managed VPS, and dedicated infrastructure for IT teams and developers. Tone is precise, direct, and technically verified.',
        'Draft server and hosting posts using verified technical specs. Never claim unverified uptime percentages or false performance metrics. Submit for review.',
        'Verify technical accuracy, brand voice consistency, and compliance with data privacy. Escalate unproven SLA or pricing claims.',
        'Conduct specialist architecture review for enterprise infrastructure claims. Enforce strict factual verification and SLA conformity.',
        'Generate clear, technically grounded posts focusing on server reliability, network architecture, and developer operations. Keep claims verifiable.',
        'Enhance clarity and technical precision. Replace vague marketing hype with verified infrastructure terminology while preserving author intent.',
        'Clean modern data center aesthetic, server racks with subtle blue and cyan status LEDs, enterprise network technology, minimal and professional, no fictitious numbers or logos. Maximum 250-450 characters.',
        'Verify alignment with technology and cloud hosting. Flag exposed credentials, PII/government IDs, inappropriate imagery, or misleading metric graphics.',
        'Review extracted text against hosting policies, SLA accuracy, confidentiality, and technical clarity.',
        JSON.stringify({
          LinkedIn: 'Professional tone, architecture updates, developer workflows.',
          Instagram: 'High quality visuals of sleek hardware and data center operations.',
          X: 'Concise technical alerts, network status, developer tips under 280 chars.'
        }),
        'current',
        now,
        now
      );
    }

    // 4. Seed initial brand conversation messages if empty
    const msgCount = (db.prepare("SELECT COUNT(*) as cnt FROM team_messages WHERE companyId = 'org-nova-unlimited'").get() as any)?.cnt || 0;
    if (msgCount === 0) {
      const makeIsoTime = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();
      const starterMessages = [
        {
          id: 'msg-seed-1',
          companyId: 'org-nova-unlimited',
          senderId: 'usr-nova-emp',
          senderName: 'Sarah Chen (Cloud Engineer)',
          senderRole: 'Employee',
          receiverId: 'usr-nova-mgr',
          receiverName: 'Marcus Brody (Ops Lead)',
          receiverRole: 'Manager',
          content: 'Hi Marcus, I drafted the new announcement post for our Tier-3 bare-metal server cluster. Could you review the network specs when you have a moment?',
          isRead: 1,
          createdAt: makeIsoTime(140)
        },
        {
          id: 'msg-seed-2',
          companyId: 'org-nova-unlimited',
          senderId: 'usr-nova-mgr',
          senderName: 'Marcus Brody (Ops Lead)',
          senderRole: 'Manager',
          receiverId: 'usr-nova-emp',
          receiverName: 'Sarah Chen (Cloud Engineer)',
          receiverRole: 'Employee',
          content: 'Reviewed and approved! Just make sure we highlight the redundant 10Gbps uplinks in the LinkedIn post.',
          isRead: 1,
          createdAt: makeIsoTime(120)
        },
        {
          id: 'msg-seed-3',
          companyId: 'org-nova-unlimited',
          senderId: 'usr-nova-ceo',
          senderName: 'Alexander Vance (CEO)',
          senderRole: 'CEO',
          receiverId: 'usr-nova-emp',
          receiverName: 'Sarah Chen (Cloud Engineer)',
          receiverRole: 'Employee',
          content: 'Excellent draft on the high-performance hosting features, Sarah. All brand guidelines look crisp and compliant.',
          isRead: 1,
          createdAt: makeIsoTime(60)
        },
        {
          id: 'msg-seed-4',
          companyId: 'org-nova-unlimited',
          senderId: 'usr-nova-hod',
          senderName: 'Dr. Elena Rostova (VP Infrastructure)',
          senderRole: 'HOD',
          receiverId: 'usr-nova-mgr',
          receiverName: 'Marcus Brody (Ops Lead)',
          receiverRole: 'Manager',
          content: 'Marcus, systems architecture sign-off for this week\'s infrastructure release is finalized.',
          isRead: 1,
          createdAt: makeIsoTime(30)
        }
      ];

      const insMsg = db.prepare(`
        INSERT INTO team_messages (id, companyId, senderId, senderName, senderRole, receiverId, receiverName, receiverRole, content, isRead, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const m of starterMessages) {
        insMsg.run(m.id, m.companyId, m.senderId, m.senderName, m.senderRole, m.receiverId, m.receiverName, m.receiverRole, m.content, m.isRead, m.createdAt);
      }
    }
  } catch (err) {
    console.error('Nova seed error:', err);
  }
}

seedNovaUnlimitedAndDefaults();

// Seed Bobbi Brown hypothetical cosmetics QA test fixture
function seedBobbiBrownQAFixture() {
  try {
    const now = new Date().toISOString();
    const makeDate = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600000).toISOString();
    const compId = 'comp-bobbi-brown-qa';

    const existingComp = db.prepare("SELECT id FROM companies WHERE id = ? OR LOWER(email) = 'ceo@bobbibrown.qa.test'").get(compId) as any;
    if (!existingComp) {
      db.prepare(`
        INSERT INTO companies (
          id, name, category, email, description, productsServices, targetAudience,
          brandVoice, approvedTerminology, companyContext, profileVersion, guidelineVersion,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        compId,
        'Bobbi Brown (QA Test Fixture)',
        'Cosmetics',
        'ceo@bobbibrown.qa.test',
        'HYPOTHETICAL QA FIXTURE: Bobbi Brown is a beauty and prestige cosmetics test workspace. Not authorized or affiliated with the real trademark holder; test rules only. Focus on natural beauty, complexion perfection, undertone accuracy, clean makeup application, and prestige skincare essentials.',
        'Skin Long-Wear Weightless Foundation, Vitamin Enriched Face Base, Crushed Lip Color, Pot Rouge for Lips & Cheeks, Long-Wear Gel Eyeliner, Bronzing Powder, and professional beauty artistry tools.',
        'Beauty enthusiasts, makeup artists, skincare-conscious individuals seeking fresh, healthy, authentic natural skin finishes.',
        'Sophisticated, empowering, authentic, clean, skin-first, and artistry-guided. Never hype-driven or overly dramatic.',
        'Skin-true shades, undertone matching, weightless breathable wear, natural matte finish, hydrating barrier support, clean beauty application.',
        'HYPOTHETICAL TEST FIXTURE: Do not make medical, dermatological cure, anti-aging eradication, permanent cosmetic, or FDA drug claims. No claims of 100% cure, permanent wrinkle erasure, or clinical drug status.',
        1,
        1,
        now,
        now
      );
    }

    const defaultUsers = [
      {
        id: 'usr-bb-ceo',
        companyId: compId,
        name: 'Hannah Miller (CEO)',
        loginId: 'ceo@bobbibrown.qa.test',
        password: 'ceo123',
        role: 'CEO' as Role
      },
      {
        id: 'usr-bb-emp',
        companyId: compId,
        name: 'Elena Rostova (Beauty Advisor)',
        loginId: 'employee.makeup@bobbibrown.qa.test',
        password: 'employee123',
        role: 'Employee' as Role
      },
      {
        id: 'usr-bb-mgr',
        companyId: compId,
        name: 'Julian Rivera (Beauty Marketing Lead)',
        loginId: 'manager.editorial@bobbibrown.qa.test',
        password: 'manager123',
        role: 'Manager' as Role
      },
      {
        id: 'usr-bb-hod',
        companyId: compId,
        name: 'Claire Dubois (Head of Artistry)',
        loginId: 'hod.artistry@bobbibrown.qa.test',
        password: 'hod123',
        role: 'HOD' as Role
      }
    ];

    for (const u of defaultUsers) {
      const exists = db.prepare('SELECT id FROM users WHERE LOWER(loginId) = LOWER(?)').get(u.loginId);
      if (!exists) {
        const { hash, salt } = hashPassword(u.password);
        db.prepare(`
          INSERT INTO users (id, companyId, name, loginId, passwordHash, salt, role, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
        `).run(u.id, u.companyId, u.name, u.loginId, hash, salt, u.role, now, now);
      }
    }

    const guidelinesCount = (db.prepare('SELECT COUNT(*) as count FROM company_guidelines WHERE companyId = ?').get(compId) as any)?.count || 0;
    if (guidelinesCount === 0) {
      const defaultGuidelines = [
        {
          scope: 'company_wide',
          content: `- Uphold skin-first, authentic beauty principles.\n- Never make drug, clinical cure, or medical efficacy claims (no 'cures acne', 'permanently removes wrinkles', or '100% allergy-free').\n- Describe makeup wear, texture, and complexion shades accurately.\n- Respect customer privacy and model consent.`
        },
        {
          scope: 'employee',
          content: `- Draft makeup tutorials, shade matching tips, and application techniques.\n- Use approved beauty terminology (natural matte, skin-true undertones).\n- Prohibited from announcing pricing discounts or commercial contracts without approval.`
        },
        {
          scope: 'manager',
          content: `- Review beauty campaign tone, visual aesthetics, and brand elegance.\n- Ensure no unverified cosmetic clinical claims are made.\n- Escalate questionable product claims.`
        },
        {
          scope: 'hod',
          content: `- Sign off on artistry masterclasses, major product launches, and editorial campaigns.\n- Enforce cosmetic regulatory compliance standards.`
        },
        {
          scope: 'platform_linkedin',
          content: `Prestige beauty industry insights, executive artistry leadership, and sustainable cosmetics operations.`
        },
        {
          scope: 'platform_instagram',
          content: `Editorial beauty aesthetics, clean complexion closeups, radiant natural skin texture, swatches, and step-by-step application reels.`
        },
        {
          scope: 'platform_x',
          content: `Quick artistry tips, shade matching advice, and event beauty highlights under 280 characters.`
        }
      ];

      for (const g of defaultGuidelines) {
        db.prepare(`
          INSERT INTO company_guidelines (id, companyId, scope, content, version, updatedAt)
          VALUES (?, ?, ?, ?, 1, ?)
        `).run(`guide-${compId}-${g.scope}`, compId, g.scope, g.content, now);
      }
    }

    const existingPrompt = db.prepare('SELECT id FROM company_ai_prompts WHERE companyId = ?').get(compId);
    if (!existingPrompt) {
      db.prepare(`
        INSERT INTO company_ai_prompts (
          id, companyId, configurationVersion, sourceProfileVersion, sourceGuidelinesVersion,
          compactCompanyContext, employeeInstructions, managerInstructions, hodInstructions,
          textGenerationInstructions, textEnhancementInstructions, imageGenerationInstructions,
          imageReviewInstructions, documentReviewInstructions, platformInstructions,
          generationStatus, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `prompt-${compId}`,
        compId,
        1,
        1,
        1,
        'Bobbi Brown (QA Test Fixture) provides prestige cosmetics and skincare focused on natural complexion, skin-true undertones, and empowering artistry. Brand voice is sophisticated, clean, and authentic, avoiding medical or exaggerated claims.',
        'Draft beauty tutorials, shade matching tips, and application techniques using approved terminology. Avoid commercial pricing or unverified medical claims. Submit for review.',
        'Review beauty content for elegant artistry tone, cosmetic compliance, and brand voice. Ensure zero unsupported anti-aging or clinical claims.',
        'Artistry leadership and regulatory review for prestige cosmetics. Validate shade accuracy, ethical ingredient communication, and campaign integrity.',
        'Generate beauty content highlighting natural complexion, shade inclusivity, texture, and expert application. Uphold sophisticated, authentic brand voice.',
        'Enhance beauty copy for luxury tone and clarity. Remove exaggerated anti-aging guarantees and unverified clinical claims while celebrating natural radiant skin.',
        'High-end editorial beauty photography of prestige cosmetics and radiant healthy skin tone. Luxurious glass bottle, warm natural lighting, soft-focus aesthetic, 8k resolution, elegant minimalism, no text or watermark. (250-450 chars).',
        'Evaluate visual beauty aesthetics, skin finish realism, brand elegance, model diversity, and absence of inappropriate content or false before-after claims.',
        'Review cosmetic product sheets, artistry briefs, and beauty PR copy against brand guidelines and claims restrictions.',
        JSON.stringify({
          LinkedIn: 'Prestige beauty industry insights, executive artistry leadership.',
          Instagram: 'Editorial beauty aesthetics, clean complexion closeups, radiant swatches.',
          X: 'Quick artistry tips, shade matching advice, event beauty highlights under 280 chars.'
        }),
        'current',
        now,
        now
      );
    }

    // Seed Bobbi Brown starter posts if not present
    const bbPostCount = (db.prepare('SELECT COUNT(*) as cnt FROM posts WHERE organizationId = ?').get(compId) as any)?.cnt || 0;
    if (bbPostCount === 0) {
      db.prepare(`
        INSERT INTO posts (
          id, organizationId, authorUsername, authorRole, platform, title, caption, status,
          isEnhanced, postedAt, mediaRef, mediaType, mediaOriginalName, mediaSize,
          textReviewResult, imageReviewResult, unresolvedIssuesCount, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'post-bb-1',
        compId,
        'employee.makeup@bobbibrown.qa.test',
        'Employee',
        'Instagram',
        'Mastering the Natural Matte: Weightless Complexion Tutorial',
        'Finding your true undertone changes everything. Our Skin Long-Wear Weightless Foundation delivers breathable, 16-hour natural matte coverage that looks and feels like real skin. Tap to explore our shade-matching guide. ✨ #NaturalMatte #SkinTrue #BeautyArtistry',
        'ready_to_post',
        1,
        null,
        null,
        null,
        null,
        null,
        JSON.stringify({
          verdict: 'looks_good',
          overallVerdict: 'approved',
          briefAnalysis: 'Follows approved beauty terminology, emphasizes natural finish, and stays within Employee scope.',
          suggestion: 'Content is ready for publication.',
          issues: []
        }),
        null,
        0,
        makeDate(4),
        makeDate(4)
      );

      db.prepare(`
        INSERT INTO posts (
          id, organizationId, authorUsername, authorRole, platform, title, caption, status,
          isEnhanced, postedAt, mediaRef, mediaType, mediaOriginalName, mediaSize,
          textReviewResult, imageReviewResult, unresolvedIssuesCount, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'post-bb-2',
        compId,
        'manager.editorial@bobbibrown.qa.test',
        'Manager',
        'LinkedIn',
        'The Evolution of Prestige Cosmetics: Authenticity and Skin-First Artistry',
        'In an era of heavy filtering, our community embraces skin that looks like skin. Celebrating healthy skin barriers and diverse undertones is our ongoing commitment to real artistry.',
        'posted',
        0,
        makeDate(24),
        null,
        null,
        null,
        null,
        JSON.stringify({
          verdict: 'looks_good',
          overallVerdict: 'approved',
          briefAnalysis: 'Thought leadership piece on authentic beauty and diverse undertones.',
          suggestion: 'Content is ready for publication.',
          issues: []
        }),
        null,
        0,
        makeDate(24),
        makeDate(24)
      );
    }
  } catch (err) {
    console.error('Bobbi Brown seed error:', err);
  }
}

seedBobbiBrownQAFixture();

// Seed Rich Enterprise Posts for Nova Unlimited prefilled dashboard
function seedRichEnterprisePosts() {
  try {
    const makeDate = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600000).toISOString();
    const insertPost = db.prepare(`
      INSERT INTO posts (
        id, organizationId, authorUsername, authorRole, platform, title, caption, status,
        isEnhanced, postedAt, mediaRef, mediaType, mediaOriginalName, mediaSize,
        textReviewResult, imageReviewResult, unresolvedIssuesCount, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertActivity = db.prepare(`
      INSERT INTO post_activities (id, postId, actorUsername, eventType, description, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const postsToSeed = [
      {
        id: 'post-nova-sla',
        authorUsername: 'employee@novaunlimited.test',
        authorRole: 'Employee' as Role,
        platform: 'LinkedIn' as Platform,
        title: 'Zero-Latency NVMe Tier-3 Infrastructure Standard',
        caption: 'Introducing our audited enterprise NVMe storage fabric. Delivering 99.995% verified compute uptime with automated sub-second failover for distributed microservices.',
        status: 'ready_to_post' as PostStatus,
        isEnhanced: 1,
        postedAt: null,
        unresolvedIssuesCount: 0,
        textReviewResult: JSON.stringify({
          verdict: 'looks_good',
          overallVerdict: 'approved',
          briefAnalysis: 'Technically verified enterprise infrastructure update complying strictly with SLA and factual claims guidelines.',
          suggestion: 'High compliance score. Suitable for primary corporate release.',
          issues: [],
          companyRelevance: { status: 'pass', summary: 'Directly addresses enterprise cloud server and NVMe architecture.' },
          roleScope: { status: 'pass', summary: 'Aligned with Employee technical posting scope.' },
          contentQuality: { status: 'pass', summary: 'Precise terminology without unsupported hyperbole.' }
        }),
        createdAt: makeDate(4)
      },
      {
        id: 'post-nova-cooling',
        authorUsername: 'manager@novaunlimited.test',
        authorRole: 'Manager' as Role,
        platform: 'Instagram' as Platform,
        title: 'Inside Our Dublin Tier-4 Partner Facility: Advanced Liquid Loops',
        caption: 'Thermal efficiency engineering in action. Our high-density server racks utilize closed-loop dielectric cooling to sustain maximum compute clock speeds while slashing PUE to 1.12.',
        status: 'ready_to_post' as PostStatus,
        isEnhanced: 1,
        postedAt: null,
        unresolvedIssuesCount: 0,
        textReviewResult: JSON.stringify({
          verdict: 'looks_good',
          overallVerdict: 'approved',
          briefAnalysis: 'Visually compelling caption detailing verified data center thermal management.',
          suggestion: 'Pair with real data-hall photography for optimal Instagram engagement.',
          issues: []
        }),
        createdAt: makeDate(7)
      },
      {
        id: 'post-nova-kernel',
        authorUsername: 'employee@novaunlimited.test',
        authorRole: 'Employee' as Role,
        platform: 'X' as Platform,
        title: 'Linux Kernel 6.12 LTS Deployed Across All Compute Nodes',
        caption: 'Kernel 6.12 LTS has landed on all Nova bare-metal compute instances. Enjoy 12% lower context switching overhead for real-time WebSocket and telemetry pipelines.',
        status: 'posted' as PostStatus,
        isEnhanced: 0,
        postedAt: makeDate(6),
        unresolvedIssuesCount: 0,
        textReviewResult: JSON.stringify({
          verdict: 'looks_good',
          overallVerdict: 'approved',
          briefAnalysis: 'Concise, verifiable technical advisory under 280 characters.',
          suggestion: 'Content posted to connected X account.',
          issues: []
        }),
        createdAt: makeDate(8)
      },
      {
        id: 'post-nova-snapshots',
        authorUsername: 'hod@novaunlimited.test',
        authorRole: 'HOD' as Role,
        platform: 'LinkedIn' as Platform,
        title: 'Automated Multi-Region Snapshot Redundancy Architecture',
        caption: 'Data durability is not negotiable. Our updated block storage engine executes live snapshots across geographically separated tier-3 availability zones with zero read I/O locks.',
        status: 'posted' as PostStatus,
        isEnhanced: 1,
        postedAt: makeDate(14),
        unresolvedIssuesCount: 0,
        textReviewResult: JSON.stringify({
          verdict: 'looks_good',
          overallVerdict: 'approved',
          briefAnalysis: 'High-level architectural oversight by Department Head. Strong alignment with security and durability standards.',
          suggestion: 'Approved and published across enterprise networks.',
          issues: []
        }),
        createdAt: makeDate(16)
      },
      {
        id: 'post-nova-ddos',
        authorUsername: 'liam.devops@novaunlimited.test',
        authorRole: 'Employee' as Role,
        platform: 'X' as Platform,
        title: 'Edge DDoS Mitigation Stress Test: 3.2 Tbps Scrubbed',
        caption: 'Under simulated volumetric network stress, our carrier-grade scrubbing filters mitigated a 3.2 Tbps multi-vector surge in under 80ms without packet degradation for client workloads.',
        status: 'ready_to_post' as PostStatus,
        isEnhanced: 0,
        postedAt: null,
        unresolvedIssuesCount: 0,
        textReviewResult: JSON.stringify({
          verdict: 'looks_good',
          overallVerdict: 'approved',
          briefAnalysis: 'Accurate technical telemetry report from DevOps team member.',
          suggestion: 'Ready for scheduled broadcast.',
          issues: []
        }),
        createdAt: makeDate(10)
      },
      {
        id: 'post-nova-dr',
        authorUsername: 'priya.marketing@novaunlimited.test',
        authorRole: 'Manager' as Role,
        platform: 'LinkedIn' as Platform,
        title: 'Enterprise Disaster Recovery: 2026 Resiliency Playbook',
        caption: 'How modern engineering teams achieve 4-minute RTO across multi-cloud failover zones without vendor lock-in or unbudgeted egress fees.',
        status: 'pending_review' as PostStatus,
        isEnhanced: 1,
        postedAt: null,
        unresolvedIssuesCount: 1,
        textReviewResult: JSON.stringify({
          verdict: 'changes_suggested',
          overallVerdict: 'needs_changes',
          briefAnalysis: 'Promising thought leadership piece, but claims of 4-minute RTO must specify multi-region cluster pre-requisites to prevent misinterpretation.',
          suggestion: 'Add footnote specifying: "4-minute RTO applies when multi-region active-active clusters are provisioned."',
          issues: ['Unclarified RTO boundary prerequisites']
        }),
        createdAt: makeDate(22)
      },
      {
        id: 'post-nova-security',
        authorUsername: 'marcus.governance@novaunlimited.test',
        authorRole: 'HOD' as Role,
        platform: 'LinkedIn' as Platform,
        title: 'SOC2 Type II & ISO 27001 Re-Certification Completed',
        caption: 'Nova Unlimited has renewed its SOC2 Type II and ISO 27001 certifications. Continuous automated security audits protect every server cluster 24/7/365 with zero downtime.',
        status: 'posted' as PostStatus,
        isEnhanced: 0,
        postedAt: makeDate(48),
        unresolvedIssuesCount: 0,
        textReviewResult: JSON.stringify({
          verdict: 'looks_good',
          overallVerdict: 'approved',
          briefAnalysis: 'Verified corporate compliance announcement.',
          suggestion: 'Official verification documentation attached.',
          issues: []
        }),
        createdAt: makeDate(50)
      }
    ];

    for (const p of postsToSeed) {
      const exists = db.prepare('SELECT id FROM posts WHERE id = ?').get(p.id);
      if (!exists) {
        insertPost.run(
          p.id,
          'org-nova-unlimited',
          p.authorUsername,
          p.authorRole,
          p.platform,
          p.title,
          p.caption,
          p.status,
          p.isEnhanced,
          p.postedAt,
          null,
          null,
          null,
          null,
          p.textReviewResult,
          null,
          p.unresolvedIssuesCount,
          p.createdAt,
          p.createdAt
        );

        insertActivity.run(
          `act-${p.id}-created`,
          p.id,
          p.authorUsername,
          'created',
          `Post created for ${p.platform}`,
          p.createdAt
        );

        if (p.isEnhanced) {
          insertActivity.run(
            `act-${p.id}-enhanced`,
            p.id,
            p.authorUsername,
            'fix_applied',
            'Enhanced with BrandLens AI Calibration',
            p.createdAt
          );
        }

        if (p.status === 'posted') {
          insertActivity.run(
            `act-${p.id}-published`,
            p.id,
            p.authorUsername,
            'published',
            `Published to ${p.platform} official channel`,
            p.postedAt || p.createdAt
          );
        }
      }
    }
  } catch (err) {
    console.error('Nova rich posts seed error:', err);
  }
}

seedRichEnterprisePosts();


function parsePostRow(row: any): PostRecord {
  return {
    id: row.id,
    organizationId: row.organizationId || 'org-nova-unlimited',
    authorUsername: row.authorUsername,
    authorRole: row.authorRole,
    platform: row.platform,
    title: row.title,
    caption: row.caption,
    status: (row.status as PostStatus) || 'pending_review',
    isEnhanced: Boolean(row.isEnhanced),
    postedAt: row.postedAt || null,
    mediaRef: row.mediaRef,
    mediaType: row.mediaType,
    mediaOriginalName: row.mediaOriginalName,
    mediaSize: row.mediaSize,
    textReviewResult: safeJsonParse(row.textReviewResult, null),
    imageReviewResult: safeJsonParse(row.imageReviewResult, null),
    unresolvedIssuesCount: Number(row.unresolvedIssuesCount) || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseTaskRow(row: any): AITaskRecord {
  return {
    id: row.id,
    postId: row.postId,
    authorUsername: row.authorUsername,
    authorRole: row.authorRole,
    taskType: row.taskType,
    status: row.status,
    inputPayload: safeJsonParse(row.inputPayload, {} as any),
    outputPayload: safeJsonParse(row.outputPayload, null),
    errorMessage: row.errorMessage,
    progressMessage: row.progressMessage,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

export const dbService = {
  getPostsByAuthor(authorUsername: string): PostRecord[] {
    const rows = db.prepare('SELECT * FROM posts WHERE authorUsername = ? ORDER BY createdAt DESC').all(authorUsername);
    return rows.map(parsePostRow);
  },

  getPostById(id: string): PostRecord | null {
    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    return row ? parsePostRow(row) : null;
  },

  createPost(data: {
    id: string;
    organizationId?: string;
    authorUsername: string;
    authorRole: Role;
    platform: Platform;
    title: string;
    caption: string;
    status?: PostStatus;
    isEnhanced?: boolean;
    postedAt?: string | null;
    mediaRef?: string | null;
    mediaType?: 'image' | 'video' | 'pdf' | null;
    mediaOriginalName?: string | null;
    mediaSize?: number | null;
    textReviewResult?: any;
    imageReviewResult?: any;
    unresolvedIssuesCount: number;
  }): PostRecord {
    const now = new Date().toISOString();
    const status: PostStatus = data.status || 'pending_review';
    const isEnhanced = data.isEnhanced ? 1 : 0;
    const postedAt = data.postedAt || (status === 'posted' ? now : null);
    const orgId = data.organizationId || 'org-nova-unlimited';

    const insert = db.prepare(`
      INSERT INTO posts (
        id, organizationId, authorUsername, authorRole, platform, title, caption, status,
        isEnhanced, postedAt,
        mediaRef, mediaType, mediaOriginalName, mediaSize,
        textReviewResult, imageReviewResult, unresolvedIssuesCount, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      data.id,
      orgId,
      data.authorUsername,
      data.authorRole,
      data.platform,
      data.title,
      data.caption,
      status,
      isEnhanced,
      postedAt,
      data.mediaRef || null,
      data.mediaType || null,
      data.mediaOriginalName || null,
      data.mediaSize || null,
      data.textReviewResult ? JSON.stringify(data.textReviewResult) : null,
      data.imageReviewResult ? JSON.stringify(data.imageReviewResult) : null,
      data.unresolvedIssuesCount,
      now,
      now
    );

    this.createActivity(
      data.id,
      data.authorUsername,
      'created',
      `Post created and saved as ${status === 'ready_to_post' ? 'Ready to Post' : status === 'posted' ? 'Posted' : 'Pending for Review'}`
    );

    return this.getPostById(data.id)!;
  },

  updatePost(id: string, updates: Partial<PostRecord>, actorUsername: string): PostRecord | null {
    const existing = this.getPostById(id);
    if (!existing) return null;

    const now = new Date().toISOString();

    const newTitle = updates.title !== undefined ? updates.title : existing.title;
    const newCaption = updates.caption !== undefined ? updates.caption : existing.caption;
    const newPlatform = updates.platform !== undefined ? updates.platform : existing.platform;
    const newStatus = updates.status !== undefined ? updates.status : existing.status;
    const newIsEnhanced = updates.isEnhanced !== undefined ? (updates.isEnhanced ? 1 : 0) : (existing.isEnhanced ? 1 : 0);
    const newPostedAt = updates.postedAt !== undefined ? updates.postedAt : existing.postedAt;
    const newMediaRef = updates.mediaRef !== undefined ? updates.mediaRef : existing.mediaRef;
    const newMediaType = updates.mediaType !== undefined ? updates.mediaType : existing.mediaType;
    const newMediaOriginalName = updates.mediaOriginalName !== undefined ? updates.mediaOriginalName : existing.mediaOriginalName;
    const newMediaSize = updates.mediaSize !== undefined ? updates.mediaSize : existing.mediaSize;
    const newTextReview = updates.textReviewResult !== undefined ? updates.textReviewResult : existing.textReviewResult;
    const newImageReview = updates.imageReviewResult !== undefined ? updates.imageReviewResult : existing.imageReviewResult;
    const newIssuesCount = updates.unresolvedIssuesCount !== undefined ? updates.unresolvedIssuesCount : existing.unresolvedIssuesCount;

    db.prepare(`
      UPDATE posts SET
        title = ?,
        caption = ?,
        platform = ?,
        status = ?,
        isEnhanced = ?,
        postedAt = ?,
        mediaRef = ?,
        mediaType = ?,
        mediaOriginalName = ?,
        mediaSize = ?,
        textReviewResult = ?,
        imageReviewResult = ?,
        unresolvedIssuesCount = ?,
        updatedAt = ?
      WHERE id = ?
    `).run(
      newTitle,
      newCaption,
      newPlatform,
      newStatus,
      newIsEnhanced,
      newPostedAt || null,
      newMediaRef || null,
      newMediaType || null,
      newMediaOriginalName || null,
      newMediaSize || null,
      newTextReview ? JSON.stringify(newTextReview) : null,
      newImageReview ? JSON.stringify(newImageReview) : null,
      newIssuesCount,
      now,
      id
    );

    this.createActivity(id, actorUsername, 'updated', 'Post content or review status updated');

    return this.getPostById(id);
  },

  markPostReady(id: string, actorUsername: string): PostRecord | null {
    const existing = this.getPostById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE posts SET status = 'ready_to_post', updatedAt = ? WHERE id = ?
    `).run(now, id);
    this.createActivity(id, actorUsername, 'status_changed', 'Post status moved to Ready to Post');
    return this.getPostById(id);
  },

  markPostPosted(id: string, actorUsername: string): PostRecord | null {
    const existing = this.getPostById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE posts SET status = 'posted', postedAt = ?, updatedAt = ? WHERE id = ?
    `).run(now, now, id);
    this.createActivity(id, actorUsername, 'status_changed', 'Post confirmed and marked as Posted');
    return this.getPostById(id);
  },

  reopenPost(id: string, actorUsername: string, targetStatus: 'pending_review' | 'ready_to_post' = 'pending_review'): PostRecord | null {
    const existing = this.getPostById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE posts SET status = ?, updatedAt = ? WHERE id = ?
    `).run(targetStatus, now, id);
    this.createActivity(
      id,
      actorUsername,
      'status_changed',
      `Post reopened for correction and moved to ${targetStatus === 'ready_to_post' ? 'Ready to Post' : 'Pending for Review'}`
    );
    return this.getPostById(id);
  },

  createActivity(postId: string, actorUsername: string, eventType: string, description: string): PostActivity {
    const now = new Date().toISOString();
    const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    db.prepare(`
      INSERT INTO post_activities (id, postId, actorUsername, eventType, description, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, postId, actorUsername, eventType, description, now);

    return {
      id,
      postId,
      actorUsername,
      eventType: eventType as any,
      description,
      createdAt: now
    };
  },

  getActivitiesByPostId(postId: string): PostActivity[] {
    const rows = db.prepare('SELECT * FROM post_activities WHERE postId = ? ORDER BY createdAt ASC').all(postId);
    return rows.map((r: any) => ({
      id: r.id,
      postId: r.postId,
      actorUsername: r.actorUsername,
      eventType: r.eventType,
      description: r.description,
      createdAt: r.createdAt
    }));
  },

  getMetrics(companyId?: string, authorUsername?: string, role?: Role): MetricCounts {
    let posts: PostRecord[];
    if (companyId) {
      posts = this.getPostsByCompanyAndAuthor(companyId, authorUsername, role);
    } else if (authorUsername) {
      posts = this.getPostsByAuthor(authorUsername);
    } else {
      posts = this.getPostsByCompanyAndAuthor('org-nova-unlimited');
    }
    const total = posts.length;
    const pending = posts.filter(p => p.status === 'pending_review' || p.status === 'ready_to_post').length;
    const enhanced = posts.filter(p => Boolean(p.isEnhanced)).length;
    const published = posts.filter(p => p.status === 'posted').length;

    return { total, pending, enhanced, published };
  },

  getMetricsByAuthor(authorUsername: string): MetricCounts {
    return this.getMetrics(undefined, authorUsername);
  },

  // --- AI Task Persistence & Recovery ---
  createAITask(data: {
    id: string;
    organizationId?: string;
    postId?: string | null;
    authorUsername: string;
    authorRole: Role;
    taskType: AITaskType;
    status: AITaskStatus;
    inputPayload: any;
    progressMessage?: string;
  }): AITaskRecord {
    const now = new Date().toISOString();
    const orgId = data.organizationId || 'org-nova-unlimited';
    db.prepare(`
      INSERT INTO ai_tasks (
        id, organizationId, postId, authorUsername, authorRole, taskType, status,
        inputPayload, outputPayload, errorMessage, progressMessage,
        startedAt, updatedAt, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      orgId,
      data.postId || null,
      data.authorUsername,
      data.authorRole,
      data.taskType,
      data.status,
      JSON.stringify(data.inputPayload),
      null,
      null,
      data.progressMessage || 'Task queued...',
      now,
      now,
      null
    );

    return this.getAITaskById(data.id)!;
  },

  updateAITask(id: string, updates: {
    status?: AITaskStatus;
    progressMessage?: string;
    outputPayload?: any;
    errorMessage?: string | null;
    completedAt?: string;
  }): AITaskRecord | null {
    const existing = this.getAITaskById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newStatus = updates.status !== undefined ? updates.status : existing.status;
    const newProgress = (updates.progressMessage !== undefined ? updates.progressMessage : existing.progressMessage) || null;
    const newOutput = updates.outputPayload !== undefined ? JSON.stringify(updates.outputPayload) : (existing.outputPayload ? JSON.stringify(existing.outputPayload) : null);
    const newError = (updates.errorMessage !== undefined ? updates.errorMessage : existing.errorMessage) || null;
    const newCompleted = (updates.completedAt !== undefined ? updates.completedAt : existing.completedAt) || null;

    db.prepare(`
      UPDATE ai_tasks SET
        status = ?,
        progressMessage = ?,
        outputPayload = ?,
        errorMessage = ?,
        updatedAt = ?,
        completedAt = ?
      WHERE id = ?
    `).run(
      newStatus,
      newProgress,
      newOutput,
      newError,
      now,
      newCompleted,
      id
    );

    return this.getAITaskById(id);
  },

  getAITaskById(id: string): AITaskRecord | null {
    const row = db.prepare('SELECT * FROM ai_tasks WHERE id = ?').get(id);
    return row ? parseTaskRow(row) : null;
  },

  getAITasksByAuthor(authorUsername: string): AITaskRecord[] {
    const rows = db.prepare('SELECT * FROM ai_tasks WHERE authorUsername = ? ORDER BY startedAt DESC').all(authorUsername);
    return rows.map(parseTaskRow);
  },

  findActiveTask(authorUsername: string, taskType: AITaskType, title: string): AITaskRecord | null {
    const rows = db.prepare(`
      SELECT * FROM ai_tasks
      WHERE authorUsername = ? AND taskType = ? AND status IN ('QUEUED', 'PROCESSING')
      ORDER BY startedAt DESC
    `).all(authorUsername, taskType) as any[];

    for (const row of rows) {
      try {
        const payload = JSON.parse(row.inputPayload);
        if (payload.title === title) {
          return parseTaskRow(row);
        }
      } catch (e) {
        // ignore
      }
    }
    return null;
  },

  // --- Draft Autosave & Recovery ---
  saveDraft(draft: PostDraft & { organizationId?: string }): PostDraft {
    const now = new Date().toISOString();
    const orgId = draft.organizationId || 'org-nova-unlimited';
    db.prepare(`
      INSERT INTO drafts (
        authorUsername, organizationId, authorRole, platform, title, caption,
        mediaRef, mediaType, mediaOriginalName, mediaSize,
        textReviewResult, imageReviewResult, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(authorUsername) DO UPDATE SET
        organizationId = excluded.organizationId,
        authorRole = excluded.authorRole,
        platform = excluded.platform,
        title = excluded.title,
        caption = excluded.caption,
        mediaRef = excluded.mediaRef,
        mediaType = excluded.mediaType,
        mediaOriginalName = excluded.mediaOriginalName,
        mediaSize = excluded.mediaSize,
        textReviewResult = excluded.textReviewResult,
        imageReviewResult = excluded.imageReviewResult,
        updatedAt = excluded.updatedAt
    `).run(
      draft.authorUsername,
      orgId,
      draft.authorRole,
      draft.platform,
      draft.title,
      draft.caption,
      draft.mediaRef || null,
      draft.mediaType || null,
      draft.mediaOriginalName || null,
      draft.mediaSize || null,
      draft.textReviewResult ? JSON.stringify(draft.textReviewResult) : null,
      draft.imageReviewResult ? JSON.stringify(draft.imageReviewResult) : null,
      now
    );

    return this.getDraft(draft.authorUsername)!;
  },

  updateDraftMedia(authorUsername: string, mediaRef: string, mediaType: 'image' | 'video' | 'pdf', mediaOriginalName: string): boolean {
    const now = new Date().toISOString();
    const res = db.prepare(`
      UPDATE drafts SET mediaRef = ?, mediaType = ?, mediaOriginalName = ?, updatedAt = ?
      WHERE authorUsername = ?
    `).run(mediaRef, mediaType, mediaOriginalName, now, authorUsername);
    return res.changes > 0;
  },

  getDraft(authorUsername: string): PostDraft | null {
    const row = db.prepare('SELECT * FROM drafts WHERE authorUsername = ?').get(authorUsername) as any;
    if (!row) return null;
    return {
      authorUsername: row.authorUsername,
      authorRole: row.authorRole,
      platform: row.platform,
      title: row.title,
      caption: row.caption,
      mediaRef: row.mediaRef,
      mediaType: row.mediaType,
      mediaOriginalName: row.mediaOriginalName,
      mediaSize: row.mediaSize,
      textReviewResult: safeJsonParse(row.textReviewResult, null),
      imageReviewResult: safeJsonParse(row.imageReviewResult, null),
      updatedAt: row.updatedAt,
    };
  },

  clearDraft(authorUsername: string): void {
    db.prepare('DELETE FROM drafts WHERE authorUsername = ?').run(authorUsername);
  },

  // --- Connected Accounts Operations ---
  getConnectedAccounts(organizationId: string = 'org-nova-unlimited'): ConnectedAccount[] {
    const rows = db.prepare('SELECT * FROM connected_accounts WHERE organizationId = ? ORDER BY platform ASC').all(organizationId) as any[];
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      platform: r.platform as Platform,
      accountIdentifier: r.accountIdentifier,
      accountName: r.accountName,
      accountAvatar: r.accountAvatar || null,
      scopes: safeJsonParse(r.scopes, []),
      isActive: Boolean(r.isActive),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  getConnectedAccountById(id: string): (ConnectedAccount & { accessTokenEnc: string; refreshTokenEnc?: string | null }) | null {
    const r = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      organizationId: r.organizationId,
      platform: r.platform as Platform,
      accountIdentifier: r.accountIdentifier,
      accountName: r.accountName,
      accountAvatar: r.accountAvatar || null,
      scopes: safeJsonParse(r.scopes, []),
      isActive: Boolean(r.isActive),
      accessTokenEnc: r.accessTokenEnc,
      refreshTokenEnc: r.refreshTokenEnc,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  },

  getConnectedAccountByPlatform(platform: Platform, organizationId: string = 'org-nova-unlimited'): (ConnectedAccount & { accessTokenEnc: string; refreshTokenEnc?: string | null }) | null {
    const r = db.prepare('SELECT * FROM connected_accounts WHERE platform = ? AND organizationId = ? AND isActive = 1 ORDER BY updatedAt DESC LIMIT 1').get(platform, organizationId) as any;
    if (!r) return null;
    return {
      id: r.id,
      organizationId: r.organizationId,
      platform: r.platform as Platform,
      accountIdentifier: r.accountIdentifier,
      accountName: r.accountName,
      accountAvatar: r.accountAvatar || null,
      scopes: safeJsonParse(r.scopes, []),
      isActive: Boolean(r.isActive),
      accessTokenEnc: r.accessTokenEnc,
      refreshTokenEnc: r.refreshTokenEnc,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  },

  saveConnectedAccount(data: {
    id: string;
    organizationId?: string;
    platform: Platform;
    accountIdentifier: string;
    accountName: string;
    accountAvatar?: string | null;
    accessTokenEnc: string;
    refreshTokenEnc?: string | null;
    tokenExpiresAt?: string | null;
    scopes: string[];
    isActive?: boolean;
  }): ConnectedAccount {
    const now = new Date().toISOString();
    const orgId = data.organizationId || 'org-nova-unlimited';
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1;

    // Remove any previous account for this platform & org to keep clean single active link
    db.prepare('DELETE FROM connected_accounts WHERE platform = ? AND organizationId = ?').run(data.platform, orgId);

    db.prepare(`
      INSERT INTO connected_accounts (
        id, organizationId, platform, accountIdentifier, accountName, accountAvatar,
        accessTokenEnc, refreshTokenEnc, tokenExpiresAt, scopes, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      orgId,
      data.platform,
      data.accountIdentifier,
      data.accountName,
      data.accountAvatar || null,
      data.accessTokenEnc,
      data.refreshTokenEnc || null,
      data.tokenExpiresAt || null,
      JSON.stringify(data.scopes),
      isActive,
      now,
      now
    );

    return {
      id: data.id,
      organizationId: orgId,
      platform: data.platform,
      accountIdentifier: data.accountIdentifier,
      accountName: data.accountName,
      accountAvatar: data.accountAvatar || null,
      scopes: data.scopes,
      isActive: Boolean(isActive),
      createdAt: now,
      updatedAt: now,
    };
  },

  disconnectAccount(id: string): boolean {
    const result = db.prepare('DELETE FROM connected_accounts WHERE id = ?').run(id);
    return result.changes > 0;
  },

  toggleAccountActive(id: string, isActive: boolean): boolean {
    const now = new Date().toISOString();
    const result = db.prepare('UPDATE connected_accounts SET isActive = ?, updatedAt = ? WHERE id = ?').run(isActive ? 1 : 0, now, id);
    return result.changes > 0;
  },

  // --- Publishing Attempts Operations ---
  createPublishingAttempt(data: {
    id: string;
    postId: string;
    platform: Platform;
    accountId?: string | null;
  }): PublishingAttempt {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO publishing_attempts (
        id, postId, platform, accountId, attemptStatus, platformPostId, platformPostUrl, errorMessage, startedAt, completedAt
      ) VALUES (?, ?, ?, ?, 'pending', null, null, null, ?, null)
    `).run(
      data.id,
      data.postId,
      data.platform,
      data.accountId || null,
      now
    );

    return {
      id: data.id,
      postId: data.postId,
      platform: data.platform,
      accountId: data.accountId || null,
      attemptStatus: 'pending',
      platformPostId: null,
      platformPostUrl: null,
      errorMessage: null,
      startedAt: now,
      completedAt: null
    };
  },

  updatePublishingAttempt(id: string, updates: {
    attemptStatus: 'success' | 'failed';
    platformPostId?: string | null;
    platformPostUrl?: string | null;
    errorMessage?: string | null;
  }): PublishingAttempt | null {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE publishing_attempts SET
        attemptStatus = ?,
        platformPostId = ?,
        platformPostUrl = ?,
        errorMessage = ?,
        completedAt = ?
      WHERE id = ?
    `).run(
      updates.attemptStatus,
      updates.platformPostId || null,
      updates.platformPostUrl || null,
      updates.errorMessage || null,
      now,
      id
    );

    const row = db.prepare('SELECT * FROM publishing_attempts WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      postId: row.postId,
      platform: row.platform as Platform,
      accountId: row.accountId || null,
      attemptStatus: row.attemptStatus as any,
      platformPostId: row.platformPostId,
      platformPostUrl: row.platformPostUrl,
      errorMessage: row.errorMessage,
      startedAt: row.startedAt,
      completedAt: row.completedAt
    };
  },

  getPublishingAttemptsByPostId(postId: string): PublishingAttempt[] {
    const rows = db.prepare('SELECT * FROM publishing_attempts WHERE postId = ? ORDER BY startedAt DESC').all(postId) as any[];
    return rows.map((r) => ({
      id: r.id,
      postId: r.postId,
      platform: r.platform as Platform,
      accountId: r.accountId,
      attemptStatus: r.attemptStatus as any,
      platformPostId: r.platformPostId,
      platformPostUrl: r.platformPostUrl,
      errorMessage: r.errorMessage,
      startedAt: r.startedAt,
      completedAt: r.completedAt
    }));
  },

  getDatabaseStats() {
    let sizeBytes = 0;
    try {
      if (fs.existsSync(dbPath)) {
        sizeBytes = fs.statSync(dbPath).size;
      }
    } catch {}

    const postCount = (db.prepare('SELECT COUNT(*) as count FROM posts').get() as any)?.count || 0;
    const activityCount = (db.prepare('SELECT COUNT(*) as count FROM post_activities').get() as any)?.count || 0;
    const taskCount = (db.prepare('SELECT COUNT(*) as count FROM ai_tasks').get() as any)?.count || 0;
    const draftCount = (db.prepare('SELECT COUNT(*) as count FROM drafts').get() as any)?.count || 0;
    const accountCount = (db.prepare('SELECT COUNT(*) as count FROM connected_accounts').get() as any)?.count || 0;
    const publishCount = (db.prepare('SELECT COUNT(*) as count FROM publishing_attempts').get() as any)?.count || 0;

    return {
      engine: 'SQLite (Built-in Node.js DatabaseSync)',
      databasePath: dbPath,
      sizeBytes,
      sizeKb: (sizeBytes / 1024).toFixed(2),
      tables: {
        posts: postCount,
        post_activities: activityCount,
        ai_tasks: taskCount,
        drafts: draftCount,
        connected_accounts: accountCount,
        publishing_attempts: publishCount
      },
      ownership: '100% Self-Hosted & Owned Locally',
      lastExportAvailable: new Date().toISOString()
    };
  },

  exportFullDatabase() {
    const posts = db.prepare('SELECT * FROM posts').all();
    const activities = db.prepare('SELECT * FROM post_activities').all();
    const tasks = db.prepare('SELECT * FROM ai_tasks').all();
    const drafts = db.prepare('SELECT * FROM drafts').all();
    const accounts = db.prepare('SELECT * FROM connected_accounts').all();
    const publishing = db.prepare('SELECT * FROM publishing_attempts').all();

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      platform: 'BrandLens Data Sovereignty Export',
      databaseEngine: 'SQLite',
      data: {
        posts,
        activities,
        tasks,
        drafts,
        accounts,
        publishing
      }
    };
  },

  getRawDatabasePath() {
    return dbPath;
  },

  // --- Multi-Company SaaS & Authentication Methods ---

  registerCompany(input: RegisterCompanyInput): { company: Company; user: UserAccount } {
    const trimmedEmail = input.companyEmail.trim().toLowerCase();
    const existingComp = db.prepare('SELECT id FROM companies WHERE LOWER(email) = ?').get(trimmedEmail);
    if (existingComp) {
      throw new Error('A company with this email is already registered. Please log in.');
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(loginId) = ?').get(trimmedEmail);
    if (existingUser) {
      throw new Error('An account with this email already exists. Please log in.');
    }

    const companyId = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare(`
        INSERT INTO companies (
          id, name, category, email, description, productsServices, targetAudience,
          brandVoice, approvedTerminology, companyContext, profileVersion, guidelineVersion,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, '', '', '', '', '', '', 1, 1, ?, ?)
      `).run(companyId, input.companyName.trim(), input.companyCategory, trimmedEmail, now, now);

      const { hash, salt } = hashPassword(input.password);

      db.prepare(`
        INSERT INTO users (id, companyId, name, loginId, passwordHash, salt, role, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, 'CEO', 'active', ?, ?)
      `).run(userId, companyId, `${input.companyName.trim()} CEO`, trimmedEmail, hash, salt, now, now);

      // Baseline guidelines for the new company
      const defaultScopes = [
        { scope: 'company_wide', content: `- Uphold ${input.companyName.trim()} corporate values and brand reputation.\n- Verify all factual and technical statements before publishing.\n- Never disclose proprietary or customer information.` },
        { scope: 'employee', content: `- Create draft posts in accordance with approved services.\n- Follow company tone and submit posts for review.` },
        { scope: 'manager', content: `- Ensure alignment with company brand voice.\n- Check clarity and factual claims.` },
        { scope: 'hod', content: `- Provide departmental sign-off on specialized topics and strategic claims.` },
        { scope: 'platform_linkedin', content: 'Professional corporate tone, verified announcements, and industry updates.' },
        { scope: 'platform_instagram', content: 'High quality visual brand assets and team culture.' },
        { scope: 'platform_x', content: 'Concise real-time updates and customer responses.' }
      ];

      for (const s of defaultScopes) {
        db.prepare(`
          INSERT INTO company_guidelines (id, companyId, scope, content, version, updatedAt)
          VALUES (?, ?, ?, ?, 1, ?)
        `).run(`guide-${companyId}-${s.scope}`, companyId, s.scope, s.content, now);
      }

      // Initial prompt record
      db.prepare(`
        INSERT INTO company_ai_prompts (
          id, companyId, configurationVersion, sourceProfileVersion, sourceGuidelinesVersion,
          compactCompanyContext, employeeInstructions, managerInstructions, hodInstructions,
          textGenerationInstructions, textEnhancementInstructions, imageGenerationInstructions,
          imageReviewInstructions, documentReviewInstructions, platformInstructions,
          generationStatus, createdAt, updatedAt
        ) VALUES (?, ?, 1, 1, 1, ?, '', '', '', '', '', '', '', '', '{}', 'needs_refresh', ?, ?)
      `).run(
        `prompt-${companyId}`,
        companyId,
        `${input.companyName.trim()} (${input.companyCategory}): Core company communications.`,
        now,
        now
      );

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    const company = this.getCompanyById(companyId)!;
    const user: UserAccount = {
      id: userId,
      companyId,
      name: `${input.companyName.trim()} CEO`,
      loginId: trimmedEmail,
      role: 'CEO',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    return { company, user };
  },

  authenticateUser(loginId: string, password: string): { company: Company; user: UserAccount } | null {
    const trimmedId = loginId.trim().toLowerCase();

    // Direct check for platform super administrator (brandlens@gmail.com / brandlensadmin)
    if (trimmedId === 'brandlens@gmail.com' && password === 'brandlensadmin') {
      let adminComp = this.getCompanyById('org-brandlens-hq');
      let adminUserRow = db.prepare('SELECT * FROM users WHERE LOWER(loginId) = ?').get('brandlens@gmail.com') as any;
      if (!adminComp || !adminUserRow) {
        seedNovaUnlimitedAndDefaults();
        adminComp = this.getCompanyById('org-brandlens-hq');
        adminUserRow = db.prepare('SELECT * FROM users WHERE LOWER(loginId) = ?').get('brandlens@gmail.com') as any;
      }
      if (adminComp && adminUserRow) {
        return {
          company: adminComp,
          user: {
            id: adminUserRow.id,
            companyId: adminUserRow.companyId,
            name: adminUserRow.name,
            loginId: adminUserRow.loginId,
            role: 'Administrator',
            department: adminUserRow.department || 'Platform Operations',
            permissions: adminUserRow.permissions || 'Global Root Access',
            status: 'active',
            createdAt: adminUserRow.createdAt,
            updatedAt: adminUserRow.updatedAt
          }
        };
      }
    }

    const userRow = db.prepare('SELECT * FROM users WHERE LOWER(loginId) = ?').get(trimmedId) as any;
    if (!userRow) return null;

    if (userRow.status === 'suspended') {
      throw new Error('This account has been suspended. Please contact your organization CEO.');
    }

    const isValid = verifyPassword(password, userRow.passwordHash, userRow.salt);
    if (!isValid) return null;

    const company = this.getCompanyById(userRow.companyId);
    if (!company) return null;

    const user: UserAccount = {
      id: userRow.id,
      companyId: userRow.companyId,
      name: userRow.name,
      loginId: userRow.loginId,
      role: userRow.role as Role,
      status: userRow.status as any,
      department: userRow.department || 'General',
      permissions: userRow.permissions || 'Standard',
      createdAt: userRow.createdAt,
      updatedAt: userRow.updatedAt
    };

    return { company, user };
  },

  getCompanyById(companyId: string): Company | null {
    const row = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      email: row.email,
      description: row.description || '',
      productsServices: row.productsServices || '',
      targetAudience: row.targetAudience || '',
      brandVoice: row.brandVoice || '',
      approvedTerminology: row.approvedTerminology || '',
      companyContext: row.companyContext || '',
      profileVersion: Number(row.profileVersion) || 1,
      guidelineVersion: Number(row.guidelineVersion) || 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  },

  updateCompanyProfile(companyId: string, updates: Partial<Company>): Company | null {
    const existing = this.getCompanyById(companyId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newVersion = existing.profileVersion + 1;

    db.prepare(`
      UPDATE companies SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        productsServices = COALESCE(?, productsServices),
        targetAudience = COALESCE(?, targetAudience),
        brandVoice = COALESCE(?, brandVoice),
        approvedTerminology = COALESCE(?, approvedTerminology),
        companyContext = COALESCE(?, companyContext),
        profileVersion = ?,
        updatedAt = ?
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.category ?? null,
      updates.description ?? null,
      updates.productsServices ?? null,
      updates.targetAudience ?? null,
      updates.brandVoice ?? null,
      updates.approvedTerminology ?? null,
      updates.companyContext ?? null,
      newVersion,
      now,
      companyId
    );

    return this.getCompanyById(companyId);
  },

  getCompanyGuidelines(companyId: string): CompanyGuidelinesBundle {
    const rows = db.prepare('SELECT scope, content FROM company_guidelines WHERE companyId = ?').all(companyId) as Array<{ scope: string; content: string }>;
    const map = new Map(rows.map(r => [r.scope, r.content]));

    return {
      companyWide: map.get('company_wide') || '',
      employee: map.get('employee') || '',
      manager: map.get('manager') || '',
      hod: map.get('hod') || '',
      platformLinkedIn: map.get('platform_linkedin') || '',
      platformInstagram: map.get('platform_instagram') || '',
      platformX: map.get('platform_x') || ''
    };
  },

  saveCompanyGuidelines(companyId: string, bundle: CompanyGuidelinesBundle): { bundle: CompanyGuidelinesBundle; newVersion: number } {
    const existing = this.getCompanyById(companyId);
    const newVersion = (existing?.guidelineVersion || 1) + 1;
    const now = new Date().toISOString();

    const scopes: Array<[string, string]> = [
      ['company_wide', bundle.companyWide || ''],
      ['employee', bundle.employee || ''],
      ['manager', bundle.manager || ''],
      ['hod', bundle.hod || ''],
      ['platform_linkedin', bundle.platformLinkedIn || ''],
      ['platform_instagram', bundle.platformInstagram || ''],
      ['platform_x', bundle.platformX || '']
    ];

    const upsert = db.prepare(`
      INSERT INTO company_guidelines (id, companyId, scope, content, version, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        version = excluded.version,
        updatedAt = excluded.updatedAt
    `);

    for (const [scope, content] of scopes) {
      upsert.run(`guide-${companyId}-${scope}`, companyId, scope, content, newVersion, now);
    }

    db.prepare('UPDATE companies SET guidelineVersion = ?, updatedAt = ? WHERE id = ?').run(newVersion, now, companyId);

    return {
      bundle: this.getCompanyGuidelines(companyId),
      newVersion
    };
  },

  getCeoAccount(companyId: string): UserAccount | null {
    const row = db.prepare(`
      SELECT id, companyId, name, loginId, role, status, department, permissions, createdAt, updatedAt
      FROM users
      WHERE companyId = ? AND role = 'CEO'
      LIMIT 1
    `).get(companyId) as any;
    if (!row) return null;
    return {
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      loginId: row.loginId,
      role: row.role as Role,
      status: row.status as any,
      department: row.department || 'Executive Leadership',
      permissions: row.permissions || 'Root Administrator & Tenant Owner',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  },

  updateCeoAccount(companyId: string, updates: { name?: string; loginId?: string; password?: string }): UserAccount {
    const existing = db.prepare('SELECT * FROM users WHERE companyId = ? AND role = \'CEO\'').get(companyId) as any;
    if (!existing) {
      throw new Error('Primary CEO account not found for this organization');
    }

    if (updates.loginId && updates.loginId.trim() !== existing.loginId) {
      const trimmedLogin = updates.loginId.trim();
      const duplicate = db.prepare('SELECT id FROM users WHERE LOWER(loginId) = LOWER(?) AND id != ?').get(trimmedLogin, existing.id);
      if (duplicate) {
        throw new Error('This Login ID / Email is already in use by another account');
      }
    }

    const now = new Date().toISOString();
    let newHash = existing.passwordHash;
    let newSalt = existing.salt;

    if (updates.password && updates.password.trim().length >= 6) {
      const hashed = hashPassword(updates.password.trim());
      newHash = hashed.hash;
      newSalt = hashed.salt;
    }

    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        loginId = COALESCE(?, loginId),
        passwordHash = ?,
        salt = ?,
        updatedAt = ?
      WHERE id = ? AND companyId = ?
    `).run(
      updates.name ? updates.name.trim() : null,
      updates.loginId ? updates.loginId.trim() : null,
      newHash,
      newSalt,
      now,
      existing.id,
      companyId
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id) as any;
    return {
      id: updated.id,
      companyId: updated.companyId,
      name: updated.name,
      loginId: updated.loginId,
      role: updated.role as Role,
      department: updated.department || 'Executive Leadership',
      permissions: updated.permissions || 'Root Administrator & Tenant Owner',
      status: updated.status as any,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  },

  getTeamAccounts(companyId: string, includeCeo: boolean = false): UserAccount[] {
    const query = includeCeo
      ? `
        SELECT id, companyId, name, loginId, role, status, department, permissions, createdAt, updatedAt
        FROM users
        WHERE companyId = ? AND loginId NOT IN ('employee', 'manager', 'admin')
        ORDER BY CASE WHEN role = 'CEO' THEN 0 ELSE 1 END, createdAt DESC
      `
      : `
        SELECT id, companyId, name, loginId, role, status, department, permissions, createdAt, updatedAt
        FROM users
        WHERE companyId = ? AND role != 'CEO' AND loginId NOT IN ('employee', 'manager', 'admin')
        ORDER BY createdAt DESC
      `;
    const rows = db.prepare(query).all(companyId) as any[];

    return rows.map(r => ({
      id: r.id,
      companyId: r.companyId,
      name: r.name,
      loginId: r.loginId,
      role: r.role as Role,
      status: r.status as any,
      department: r.department || (r.role === 'CEO' ? 'Executive Leadership' : 'Engineering'),
      permissions: r.permissions || (r.role === 'CEO' ? 'Root Administrator & Tenant Owner' : 'Full Access'),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  },

  addTeamAccount(companyId: string, data: { name: string; password: string; role: Role; department?: string; permissions?: string }): UserAccount {
    const comp = this.getCompanyById(companyId);
    if (!comp) throw new Error('Company not found');

    const cleanCompName = comp.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company';
    const cleanUserName = data.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.') || 'user';
    const baseLogin = `${data.role.toLowerCase()}.${cleanUserName}@${cleanCompName}.test`;

    let finalLogin = baseLogin;
    let counter = 1;
    while (db.prepare('SELECT id FROM users WHERE LOWER(loginId) = ?').get(finalLogin.toLowerCase())) {
      finalLogin = `${data.role.toLowerCase()}.${cleanUserName}${counter}@${cleanCompName}.test`;
      counter++;
    }

    const { hash, salt } = hashPassword(data.password);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const department = data.department || (data.role === 'HOD' ? 'Systems Architecture' : data.role === 'Manager' ? 'Technical Operations' : 'Cloud Engineering');
    const permissions = data.permissions || (data.role === 'HOD' ? 'Departmental Sign-Off' : data.role === 'Manager' ? 'Full Publishing' : 'Review Required');

    db.prepare(`
      INSERT INTO users (id, companyId, name, loginId, passwordHash, salt, role, status, department, permissions, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
    `).run(userId, companyId, data.name.trim(), finalLogin, hash, salt, data.role, department, permissions, now, now);

    return {
      id: userId,
      companyId,
      name: data.name.trim(),
      loginId: finalLogin,
      role: data.role,
      status: 'active',
      department,
      permissions,
      createdAt: now,
      updatedAt: now
    };
  },

  updateTeamMember(userId: string, companyId: string, updates: {
    name?: string;
    role?: Role;
    status?: 'active' | 'suspended';
    department?: string;
    permissions?: string;
  }): UserAccount {
    const existing = db.prepare('SELECT * FROM users WHERE id = ? AND companyId = ?').get(userId, companyId) as any;
    if (!existing) {
      throw new Error('User not found in this company');
    }
    if (existing.role === 'CEO' && updates.role && updates.role !== 'CEO') {
      throw new Error('Cannot change the designation of the primary CEO account');
    }
    if (existing.role === 'CEO' && updates.status === 'suspended') {
      throw new Error('Cannot suspend the primary CEO account');
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        role = COALESCE(?, role),
        status = COALESCE(?, status),
        department = COALESCE(?, department),
        permissions = COALESCE(?, permissions),
        updatedAt = ?
      WHERE id = ? AND companyId = ?
    `).run(
      updates.name ?? null,
      updates.role ?? null,
      updates.status ?? null,
      updates.department ?? null,
      updates.permissions ?? null,
      now,
      userId,
      companyId
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    return {
      id: updated.id,
      companyId: updated.companyId,
      name: updated.name,
      loginId: updated.loginId,
      role: updated.role as Role,
      department: updated.department || 'Engineering',
      permissions: updated.permissions || 'Full Access',
      status: updated.status as any,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  },

  changeUserPassword(userId: string, companyId: string, newPassword: string): boolean {
    const existing = db.prepare('SELECT * FROM users WHERE id = ? AND companyId = ?').get(userId, companyId) as any;
    if (!existing) {
      throw new Error('User not found in this company');
    }
    if (!newPassword || newPassword.trim().length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const { hash, salt } = hashPassword(newPassword.trim());
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users SET passwordHash = ?, salt = ?, updatedAt = ?
      WHERE id = ? AND companyId = ?
    `).run(hash, salt, now, userId, companyId);

    return true;
  },

  deleteUserAccount(userId: string, companyId: string): boolean {
    const existing = db.prepare('SELECT * FROM users WHERE id = ? AND companyId = ?').get(userId, companyId) as any;
    if (!existing) {
      throw new Error('User not found in this company');
    }
    if (existing.role === 'CEO') {
      throw new Error('The primary CEO account cannot be deleted');
    }

    db.prepare('DELETE FROM users WHERE id = ? AND companyId = ?').run(userId, companyId);
    return true;
  },

  getCompanyAIPrompt(companyId: string): CompanyAIPrompt | null {
    const row = db.prepare('SELECT * FROM company_ai_prompts WHERE companyId = ?').get(companyId) as any;
    if (!row) return null;

    let platformInstructions: Record<string, string> = {};
    try {
      if (row.platformInstructions) platformInstructions = JSON.parse(row.platformInstructions);
    } catch {}

    return {
      id: row.id,
      companyId: row.companyId,
      configurationVersion: Number(row.configurationVersion) || 1,
      sourceProfileVersion: Number(row.sourceProfileVersion) || 1,
      sourceGuidelinesVersion: Number(row.sourceGuidelinesVersion) || 1,
      compactCompanyContext: row.compactCompanyContext || '',
      employeeInstructions: row.employeeInstructions || '',
      managerInstructions: row.managerInstructions || '',
      hodInstructions: row.hodInstructions || '',
      textGenerationInstructions: row.textGenerationInstructions || '',
      textEnhancementInstructions: row.textEnhancementInstructions || '',
      imageGenerationInstructions: row.imageGenerationInstructions || '',
      imageReviewInstructions: row.imageReviewInstructions || '',
      documentReviewInstructions: row.documentReviewInstructions || '',
      platformInstructions,
      generationStatus: (row.generationStatus as any) || 'current',
      errorMessage: row.errorMessage || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  },

  saveCompanyAIPrompt(companyId: string, promptData: Partial<CompanyAIPrompt>): CompanyAIPrompt {
    const existing = this.getCompanyAIPrompt(companyId);
    const now = new Date().toISOString();
    const configVer = (existing?.configurationVersion || 0) + 1;

    const id = existing?.id || `prompt-${companyId}`;
    const platJson = promptData.platformInstructions ? JSON.stringify(promptData.platformInstructions) : (existing ? JSON.stringify(existing.platformInstructions) : '{}');

    db.prepare(`
      INSERT INTO company_ai_prompts (
        id, companyId, configurationVersion, sourceProfileVersion, sourceGuidelinesVersion,
        compactCompanyContext, employeeInstructions, managerInstructions, hodInstructions,
        textGenerationInstructions, textEnhancementInstructions, imageGenerationInstructions,
        imageReviewInstructions, documentReviewInstructions, platformInstructions,
        generationStatus, errorMessage, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(companyId) DO UPDATE SET
        configurationVersion = excluded.configurationVersion,
        sourceProfileVersion = excluded.sourceProfileVersion,
        sourceGuidelinesVersion = excluded.sourceGuidelinesVersion,
        compactCompanyContext = excluded.compactCompanyContext,
        employeeInstructions = excluded.employeeInstructions,
        managerInstructions = excluded.managerInstructions,
        hodInstructions = excluded.hodInstructions,
        textGenerationInstructions = excluded.textGenerationInstructions,
        textEnhancementInstructions = excluded.textEnhancementInstructions,
        imageGenerationInstructions = excluded.imageGenerationInstructions,
        imageReviewInstructions = excluded.imageReviewInstructions,
        documentReviewInstructions = excluded.documentReviewInstructions,
        platformInstructions = excluded.platformInstructions,
        generationStatus = excluded.generationStatus,
        errorMessage = excluded.errorMessage,
        updatedAt = excluded.updatedAt
    `).run(
      id,
      companyId,
      configVer,
      promptData.sourceProfileVersion ?? existing?.sourceProfileVersion ?? 1,
      promptData.sourceGuidelinesVersion ?? existing?.sourceGuidelinesVersion ?? 1,
      promptData.compactCompanyContext ?? existing?.compactCompanyContext ?? '',
      promptData.employeeInstructions ?? existing?.employeeInstructions ?? '',
      promptData.managerInstructions ?? existing?.managerInstructions ?? '',
      promptData.hodInstructions ?? existing?.hodInstructions ?? '',
      promptData.textGenerationInstructions ?? existing?.textGenerationInstructions ?? '',
      promptData.textEnhancementInstructions ?? existing?.textEnhancementInstructions ?? '',
      promptData.imageGenerationInstructions ?? existing?.imageGenerationInstructions ?? '',
      promptData.imageReviewInstructions ?? existing?.imageReviewInstructions ?? '',
      promptData.documentReviewInstructions ?? existing?.documentReviewInstructions ?? '',
      platJson,
      promptData.generationStatus ?? 'current',
      promptData.errorMessage ?? null,
      existing?.createdAt || now,
      now
    );

    return this.getCompanyAIPrompt(companyId)!;
  },

  getPostsByCompanyAndAuthor(companyId: string, authorUsername?: string, role?: Role): PostRecord[] {
    let query = 'SELECT * FROM posts WHERE organizationId = ?';
    const params: any[] = [companyId];

    if (role === 'Employee' && authorUsername) {
      query += ' AND authorUsername = ?';
      params.push(authorUsername);
    }
    query += ' ORDER BY createdAt DESC';

    const rows = db.prepare(query).all(...params);
    return rows.map(parsePostRow);
  },

  // --- Company Platform Configurations for CEO ---
  getCompanyPlatformConfigs(companyId: string): CompanyPlatformConfig[] {
    const platforms: Platform[] = ['LinkedIn', 'Instagram', 'X'];
    const rows = db.prepare('SELECT * FROM company_platform_configs WHERE companyId = ?').all(companyId) as any[];
    const rowMap = new Map<Platform, any>();
    for (const r of rows) {
      rowMap.set(r.platform as Platform, r);
    }

    // Also check connected_accounts to reflect any connected OAuth status
    const connectedAccounts = this.getConnectedAccounts(companyId);
    const connectedMap = new Map<Platform, ConnectedAccount>();
    for (const ca of connectedAccounts) {
      connectedMap.set(ca.platform, ca);
    }

    return platforms.map((platform) => {
      const row = rowMap.get(platform);
      const connected = connectedMap.get(platform);
      const hasClientSecret = Boolean(row?.clientSecretEnc);
      const hasAccessToken = Boolean(row?.accessTokenEnc || (connected?.id && this.getConnectedAccountById(connected.id)?.accessTokenEnc));
      const isConfigured = Boolean(row?.isConfigured || hasAccessToken);

      let accessTokenMasked = '';
      if (hasAccessToken) {
        try {
          const rawEnc = row?.accessTokenEnc || (connected?.id ? this.getConnectedAccountById(connected.id)?.accessTokenEnc : '');
          if (rawEnc) {
            const dec = decryptToken(rawEnc);
            accessTokenMasked = dec ? `${dec.substring(0, 6)}••••••••${dec.slice(-4)}` : '••••••••••••';
          }
        } catch {
          accessTokenMasked = '••••••••••••';
        }
      }

      return {
        id: row?.id || `cfg-${platform.toLowerCase()}-${companyId}`,
        companyId,
        platform,
        clientId: row?.clientId || '',
        clientSecretMasked: hasClientSecret ? '••••••••••••' : undefined,
        hasClientSecret,
        accessTokenMasked,
        hasAccessToken,
        pageId: row?.pageId || '',
        accountName: row?.accountName || connected?.accountName || '',
        accountIdentifier: row?.accountIdentifier || connected?.accountIdentifier || '',
        isActive: row ? Boolean(row.isActive) : connected ? Boolean(connected.isActive) : true,
        isConfigured,
        updatedAt: row?.updatedAt || connected?.updatedAt || new Date().toISOString()
      };
    });
  },

  getCompanyPlatformConfig(companyId: string, platform: Platform): (CompanyPlatformConfig & { clientSecretRaw?: string; accessTokenRaw?: string }) | null {
    const row = db.prepare('SELECT * FROM company_platform_configs WHERE companyId = ? AND platform = ?').get(companyId, platform) as any;
    if (!row) return null;

    let clientSecretRaw: string | undefined;
    let accessTokenRaw: string | undefined;

    if (row.clientSecretEnc) {
      try {
        clientSecretRaw = decryptToken(row.clientSecretEnc) || undefined;
      } catch {}
    }
    if (row.accessTokenEnc) {
      try {
        accessTokenRaw = decryptToken(row.accessTokenEnc) || undefined;
      } catch {}
    }

    const hasClientSecret = Boolean(row.clientSecretEnc);
    const hasAccessToken = Boolean(row.accessTokenEnc);

    return {
      id: row.id,
      companyId: row.companyId,
      platform: row.platform as Platform,
      clientId: row.clientId || '',
      clientSecretMasked: hasClientSecret ? '••••••••••••' : undefined,
      clientSecretRaw,
      hasClientSecret,
      accessTokenMasked: hasAccessToken && accessTokenRaw ? `${accessTokenRaw.substring(0, 6)}••••••••${accessTokenRaw.slice(-4)}` : undefined,
      accessTokenRaw,
      hasAccessToken,
      pageId: row.pageId || '',
      accountName: row.accountName || '',
      accountIdentifier: row.accountIdentifier || '',
      isActive: Boolean(row.isActive),
      isConfigured: Boolean(row.isConfigured || hasAccessToken),
      updatedAt: row.updatedAt
    };
  },

  saveCompanyPlatformConfig(companyId: string, input: SaveCompanyPlatformConfigInput): CompanyPlatformConfig {
    const comp = this.getCompanyById(companyId);
    if (!comp) throw new Error('Company not found');

    const now = new Date().toISOString();
    const existing = db.prepare('SELECT * FROM company_platform_configs WHERE companyId = ? AND platform = ?').get(companyId, input.platform) as any;
    const configId = existing?.id || `cfg-${input.platform.toLowerCase()}-${companyId}-${Date.now().toString(36)}`;

    let finalClientSecretEnc = existing?.clientSecretEnc || null;
    if (input.clientSecret && input.clientSecret.trim()) {
      finalClientSecretEnc = encryptToken(input.clientSecret.trim());
    }

    let finalAccessTokenEnc = existing?.accessTokenEnc || null;
    if (input.accessToken && input.accessToken.trim()) {
      finalAccessTokenEnc = encryptToken(input.accessToken.trim());
    }

    const finalClientId = input.clientId !== undefined ? input.clientId.trim() : (existing?.clientId || '');
    const finalPageId = input.pageId !== undefined ? input.pageId.trim() : (existing?.pageId || '');
    const finalAccountName = input.accountName !== undefined ? input.accountName.trim() : (existing?.accountName || `${comp.name} ${input.platform}`);
    const finalAccountIdentifier = input.accountIdentifier !== undefined ? input.accountIdentifier.trim() : (existing?.accountIdentifier || `@${comp.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
    const finalIsActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : (existing ? existing.isActive : 1);
    const finalIsConfigured = finalAccessTokenEnc || (finalClientId && finalClientSecretEnc) ? 1 : 0;

    db.prepare(`
      INSERT INTO company_platform_configs (
        id, companyId, platform, clientId, clientSecretEnc, accessTokenEnc, refreshTokenEnc,
        pageId, accountName, accountIdentifier, isActive, isConfigured, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(companyId, platform) DO UPDATE SET
        clientId = excluded.clientId,
        clientSecretEnc = excluded.clientSecretEnc,
        accessTokenEnc = excluded.accessTokenEnc,
        pageId = excluded.pageId,
        accountName = excluded.accountName,
        accountIdentifier = excluded.accountIdentifier,
        isActive = excluded.isActive,
        isConfigured = excluded.isConfigured,
        updatedAt = excluded.updatedAt
    `).run(
      configId,
      companyId,
      input.platform,
      finalClientId,
      finalClientSecretEnc,
      finalAccessTokenEnc,
      existing?.refreshTokenEnc || null,
      finalPageId,
      finalAccountName,
      finalAccountIdentifier,
      finalIsActive,
      finalIsConfigured,
      now
    );

    // Synchronize to connected_accounts table so that direct publishing and post preview work seamlessly!
    if (finalAccessTokenEnc) {
      const accId = `acc-${input.platform.toLowerCase()}-${companyId}`;
      const defaultScopes = input.platform === 'LinkedIn'
        ? ['w_member_social', 'openid', 'profile']
        : input.platform === 'X'
        ? ['tweet.read', 'tweet.write']
        : ['instagram_basic', 'instagram_content_publish'];

      this.saveConnectedAccount({
        id: accId,
        organizationId: companyId,
        platform: input.platform,
        accountIdentifier: finalAccountIdentifier || `@${comp.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        accountName: finalAccountName || `${comp.name} Official`,
        accessTokenEnc: finalAccessTokenEnc,
        refreshTokenEnc: existing?.refreshTokenEnc || null,
        scopes: defaultScopes,
        isActive: Boolean(finalIsActive)
      });
    }

    const configs = this.getCompanyPlatformConfigs(companyId);
    return configs.find(c => c.platform === input.platform)!;
  },

  deleteCompanyPlatformConfig(companyId: string, platform: Platform): boolean {
    db.prepare('DELETE FROM company_platform_configs WHERE companyId = ? AND platform = ?').run(companyId, platform);
    db.prepare('DELETE FROM connected_accounts WHERE organizationId = ? AND platform = ?').run(companyId, platform);
    return true;
  },

  toggleCompanyPlatformConfig(companyId: string, platform: Platform, isActive: boolean): boolean {
    const now = new Date().toISOString();
    const res = db.prepare('UPDATE company_platform_configs SET isActive = ?, updatedAt = ? WHERE companyId = ? AND platform = ?').run(isActive ? 1 : 0, now, companyId, platform);
    db.prepare('UPDATE connected_accounts SET isActive = ?, updatedAt = ? WHERE organizationId = ? AND platform = ?').run(isActive ? 1 : 0, now, companyId, platform);
    return res.changes > 0;
  },

  // Team Messaging
  getCompanyMembersRoster(companyId: string): TeamRosterGrouped {
    // Return all users for this company, deduplicating legacy aliases
    const rows = db.prepare(`
      SELECT id, companyId, name, loginId, role, status, department, permissions, createdAt, updatedAt
      FROM users
      WHERE companyId = ? AND status != 'suspended' AND loginId NOT IN ('admin')
      ORDER BY 
        CASE 
          WHEN role = 'CEO' THEN 1
          WHEN role = 'HOD' THEN 2
          WHEN role = 'Manager' THEN 3
          WHEN role = 'Employee' THEN 4
          ELSE 5
        END,
        createdAt ASC
    `).all(companyId) as any[];

    // Map and sanitize
    const members: UserAccount[] = rows.map(r => ({
      id: r.id,
      companyId: r.companyId,
      name: r.name,
      loginId: r.loginId,
      role: r.role as Role,
      status: r.status as any,
      department: r.department || (r.role === 'CEO' ? 'Executive Leadership' : 'General'),
      permissions: r.permissions || 'Standard Access',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    const ceo = members.find(m => m.role === 'CEO') || null;
    const hods = members.filter(m => m.role === 'HOD');
    const managers = members.filter(m => m.role === 'Manager');
    const employees = members.filter(m => m.role === 'Employee');

    return {
      employees,
      managers,
      hods,
      ceo,
      all: members
    };
  },

  sendTeamMessage(input: {
    companyId: string;
    senderId: string;
    receiverId: string;
    content: string;
  }): TeamMessage {
    const trimmed = input.content.trim();
    if (!trimmed) {
      throw new Error('Message content cannot be empty.');
    }

    // Lookup sender
    const sender = db.prepare('SELECT id, name, role, companyId FROM users WHERE id = ? OR LOWER(loginId) = LOWER(?)').get(input.senderId, input.senderId) as any;
    if (!sender) {
      throw new Error('Sender not found in workspace.');
    }

    // Lookup receiver
    const receiver = db.prepare('SELECT id, name, role, companyId FROM users WHERE id = ? OR LOWER(loginId) = LOWER(?)').get(input.receiverId, input.receiverId) as any;
    if (!receiver) {
      throw new Error('Recipient not found in workspace.');
    }

    // Ensure same brand
    if (sender.companyId !== input.companyId || receiver.companyId !== input.companyId) {
      throw new Error('Team messaging is strictly scoped to members of the same brand.');
    }

    const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO team_messages (id, companyId, senderId, senderName, senderRole, receiverId, receiverName, receiverRole, content, isRead, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      id,
      input.companyId,
      sender.id,
      sender.name,
      sender.role,
      receiver.id,
      receiver.name,
      receiver.role,
      trimmed,
      now
    );

    return {
      id,
      companyId: input.companyId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role as Role,
      receiverId: receiver.id,
      receiverName: receiver.name,
      receiverRole: receiver.role as Role,
      content: trimmed,
      isRead: false,
      createdAt: now
    };
  },

  getTeamConversation(companyId: string, userAId: string, userBId: string): TeamMessage[] {
    // Resolve canonical user IDs
    const userA = db.prepare('SELECT id FROM users WHERE id = ? OR LOWER(loginId) = LOWER(?)').get(userAId, userAId) as any;
    const userB = db.prepare('SELECT id FROM users WHERE id = ? OR LOWER(loginId) = LOWER(?)').get(userBId, userBId) as any;

    const idA = userA ? userA.id : userAId;
    const idB = userB ? userB.id : userBId;

    const rows = db.prepare(`
      SELECT id, companyId, senderId, senderName, senderRole, receiverId, receiverName, receiverRole, content, isRead, createdAt
      FROM team_messages
      WHERE companyId = ? AND (
        (senderId = ? AND receiverId = ?) OR
        (senderId = ? AND receiverId = ?)
      )
      ORDER BY createdAt ASC
    `).all(companyId, idA, idB, idB, idA) as any[];

    return rows.map(r => ({
      id: r.id,
      companyId: r.companyId,
      senderId: r.senderId,
      senderName: r.senderName,
      senderRole: r.senderRole as Role,
      receiverId: r.receiverId,
      receiverName: r.receiverName,
      receiverRole: r.receiverRole as Role,
      content: r.content,
      isRead: Boolean(r.isRead),
      createdAt: r.createdAt
    }));
  },

  markTeamConversationAsRead(companyId: string, currentUserId: string, otherUserId: string): void {
    const currUser = db.prepare('SELECT id FROM users WHERE id = ? OR LOWER(loginId) = LOWER(?)').get(currentUserId, currentUserId) as any;
    const otherUser = db.prepare('SELECT id FROM users WHERE id = ? OR LOWER(loginId) = LOWER(?)').get(otherUserId, otherUserId) as any;

    const currId = currUser ? currUser.id : currentUserId;
    const othId = otherUser ? otherUser.id : otherUserId;

    db.prepare(`
      UPDATE team_messages
      SET isRead = 1
      WHERE companyId = ? AND receiverId = ? AND senderId = ? AND isRead = 0
    `).run(companyId, currId, othId);
  },

  getUnreadMessageCount(companyId: string, userId: string): number {
    const user = db.prepare('SELECT id FROM users WHERE id = ? OR LOWER(loginId) = LOWER(?)').get(userId, userId) as any;
    const canonicalId = user ? user.id : userId;

    const row = db.prepare(`
      SELECT COUNT(*) as cnt
      FROM team_messages
      WHERE companyId = ? AND receiverId = ? AND isRead = 0
    `).get(companyId, canonicalId) as any;

    return row?.cnt || 0;
  },

  getRecentConversations(companyId: string, userId: string): ConversationSummary[] {
    const user = db.prepare('SELECT id FROM users WHERE id = ? OR LOWER(loginId) = LOWER(?)').get(userId, userId) as any;
    const canonicalId = user ? user.id : userId;

    // Get all roster members except current user
    const roster = this.getCompanyMembersRoster(companyId);
    const otherMembers = roster.all.filter(m => m.id !== canonicalId && m.loginId.toLowerCase() !== userId.toLowerCase());

    const summaries: ConversationSummary[] = [];

    for (const member of otherMembers) {
      // Find latest message between canonicalId and member.id
      const lastMsgRow = db.prepare(`
        SELECT id, companyId, senderId, senderName, senderRole, receiverId, receiverName, receiverRole, content, isRead, createdAt
        FROM team_messages
        WHERE companyId = ? AND (
          (senderId = ? AND receiverId = ?) OR
          (senderId = ? AND receiverId = ?)
        )
        ORDER BY createdAt DESC
        LIMIT 1
      `).get(companyId, canonicalId, member.id, member.id, canonicalId) as any;

      const unreadRow = db.prepare(`
        SELECT COUNT(*) as cnt
        FROM team_messages
        WHERE companyId = ? AND receiverId = ? AND senderId = ? AND isRead = 0
      `).get(companyId, canonicalId, member.id) as any;

      summaries.push({
        otherUser: member,
        lastMessage: lastMsgRow ? {
          id: lastMsgRow.id,
          companyId: lastMsgRow.companyId,
          senderId: lastMsgRow.senderId,
          senderName: lastMsgRow.senderName,
          senderRole: lastMsgRow.senderRole as Role,
          receiverId: lastMsgRow.receiverId,
          receiverName: lastMsgRow.receiverName,
          receiverRole: lastMsgRow.receiverRole as Role,
          content: lastMsgRow.content,
          isRead: Boolean(lastMsgRow.isRead),
          createdAt: lastMsgRow.createdAt
        } : undefined,
        unreadCount: unreadRow?.cnt || 0
      });
    }

    // Sort by most recent message first, then alphabetical by name
    return summaries.sort((a, b) => {
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
      }
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return a.otherUser.name.localeCompare(b.otherUser.name);
    });
  },

  // ==========================================
  // BRANDLENS SUPERADMIN & PLATFORM MANAGEMENT
  // ==========================================

  getAllCompaniesWithStats() {
    const companies = db.prepare('SELECT * FROM companies ORDER BY createdAt DESC').all() as any[];
    return companies.map(c => {
      const userCountRow = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE companyId = ?').get(c.id) as any;
      const postCounts = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'ready_to_post' THEN 1 ELSE 0 END) as ready,
          SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) as posted
        FROM posts
        WHERE organizationId = ?
      `).get(c.id) as any;

      const platformsRow = db.prepare('SELECT platform FROM company_platform_configs WHERE companyId = ? AND isActive = 1').all(c.id) as any[];
      const promptRow = db.prepare('SELECT generationStatus FROM company_ai_prompts WHERE companyId = ?').get(c.id) as any;
      const ceoRow = db.prepare("SELECT name, loginId FROM users WHERE companyId = ? AND role = 'CEO' LIMIT 1").get(c.id) as any;

      return {
        id: c.id,
        name: c.name,
        category: c.category,
        email: c.email,
        description: c.description || '',
        productsServices: c.productsServices || '',
        targetAudience: c.targetAudience || '',
        brandVoice: c.brandVoice || '',
        approvedTerminology: c.approvedTerminology || '',
        companyContext: c.companyContext || '',
        profileVersion: Number(c.profileVersion) || 1,
        guidelineVersion: Number(c.guidelineVersion) || 1,
        totalUsers: userCountRow?.cnt || 0,
        totalPosts: postCounts?.total || 0,
        pendingPosts: postCounts?.pending || 0,
        readyPosts: postCounts?.ready || 0,
        postedPosts: postCounts?.posted || 0,
        connectedPlatforms: platformsRow.map((p: any) => p.platform),
        promptStatus: promptRow?.generationStatus || 'current',
        ceoName: ceoRow?.name || 'Alexander Vance',
        ceoEmail: ceoRow?.loginId || c.email,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      };
    });
  },

  getAllUsersAcrossPlatform() {
    const rows = db.prepare(`
      SELECT u.id, u.companyId, u.name, u.loginId, u.role, u.status, u.department, u.permissions, u.createdAt, u.updatedAt,
             c.name as companyName, c.category as companyCategory
      FROM users u
      LEFT JOIN companies c ON u.companyId = c.id
      ORDER BY u.createdAt DESC
    `).all() as any[];

    return rows.map((r: any) => ({
      id: r.id,
      companyId: r.companyId,
      companyName: r.companyName || 'Unknown Brand',
      companyCategory: r.companyCategory || 'General',
      name: r.name,
      loginId: r.loginId,
      role: r.role as Role,
      status: r.status as 'active' | 'suspended',
      department: r.department || 'General',
      permissions: r.permissions || 'Standard',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  },

  getAdminOverview() {
    const totalBrands = (db.prepare('SELECT COUNT(*) as cnt FROM companies').get() as any)?.cnt || 0;
    const totalUsers = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any)?.cnt || 0;
    const totalPosts = (db.prepare('SELECT COUNT(*) as cnt FROM posts').get() as any)?.cnt || 0;
    const totalTasks = (db.prepare('SELECT COUNT(*) as cnt FROM ai_tasks').get() as any)?.cnt || 0;
    const totalMessages = (db.prepare('SELECT COUNT(*) as cnt FROM team_messages').get() as any)?.cnt || 0;

    const postStats = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'ready_to_post' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) as posted,
        SUM(CASE WHEN isEnhanced = 1 THEN 1 ELSE 0 END) as enhanced
      FROM posts
    `).get() as any;

    const taskStats = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN taskType = 'text_review' THEN 1 ELSE 0 END) as textReviews,
        SUM(CASE WHEN taskType = 'image_review' THEN 1 ELSE 0 END) as imageReviews,
        SUM(CASE WHEN taskType = 'image_generation' THEN 1 ELSE 0 END) as imageGens
      FROM ai_tasks
    `).get() as any;

    let dbSize = 0;
    try {
      if (fs.existsSync(dbPath)) {
        dbSize = fs.statSync(dbPath).size;
      }
    } catch {}

    return {
      totalBrands,
      totalUsers,
      totalPosts,
      totalTasks,
      totalMessages,
      pendingPosts: postStats?.pending || 0,
      readyPosts: postStats?.ready || 0,
      postedPosts: postStats?.posted || 0,
      enhancedPosts: postStats?.enhanced || 0,
      aiStats: {
        textReviews: (taskStats?.textReviews || 0) + (postStats?.total || 0),
        imageReviews: taskStats?.imageReviews || 0,
        imageGens: taskStats?.imageGens || 0,
        completedTasks: taskStats?.completed || 0,
        failedTasks: taskStats?.failed || 0
      },
      dbSizeBytes: dbSize,
      dbSizeFormatted: `${(dbSize / 1024).toFixed(1)} KB`,
      systemUptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== ''),
      whatsappConfigured: true,
      whatsappNumber: process.env.WHATSAPP_SUPPORT_NUMBER || '+919310296839'
    };
  },

  updateCompanyByAdmin(companyId: string, updates: Partial<Company>): Company | null {
    return this.updateCompanyProfile(companyId, updates);
  },

  deleteCompanyByAdmin(companyId: string): boolean {
    if (companyId === 'org-brandlens-hq') {
      throw new Error('Cannot delete core BrandLens Platform HQ.');
    }
    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare('DELETE FROM team_messages WHERE companyId = ?').run(companyId);
      db.prepare('DELETE FROM company_platform_configs WHERE companyId = ?').run(companyId);
      db.prepare('DELETE FROM company_ai_prompts WHERE companyId = ?').run(companyId);
      db.prepare('DELETE FROM company_guidelines WHERE companyId = ?').run(companyId);
      db.prepare('DELETE FROM posts WHERE organizationId = ?').run(companyId);
      db.prepare('DELETE FROM ai_tasks WHERE organizationId = ?').run(companyId);
      db.prepare('DELETE FROM drafts WHERE organizationId = ?').run(companyId);
      db.prepare('DELETE FROM users WHERE companyId = ?').run(companyId);
      const res = db.prepare('DELETE FROM companies WHERE id = ?').run(companyId);
      db.exec('COMMIT;');
      return res.changes > 0;
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  updateUserByAdmin(userId: string, data: {
    name?: string;
    role?: Role;
    status?: 'active' | 'suspended';
    department?: string;
    permissions?: string;
    newPassword?: string;
  }): UserAccount | null {
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!userRow) return null;
    const now = new Date().toISOString();

    let passwordHash = userRow.passwordHash;
    let salt = userRow.salt;
    if (data.newPassword && data.newPassword.trim().length >= 6) {
      const hashed = hashPassword(data.newPassword.trim());
      passwordHash = hashed.hash;
      salt = hashed.salt;
    }

    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        role = COALESCE(?, role),
        status = COALESCE(?, status),
        department = COALESCE(?, department),
        permissions = COALESCE(?, permissions),
        passwordHash = ?,
        salt = ?,
        updatedAt = ?
      WHERE id = ?
    `).run(
      data.name ?? null,
      data.role ?? null,
      data.status ?? null,
      data.department ?? null,
      data.permissions ?? null,
      passwordHash,
      salt,
      now,
      userId
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    return {
      id: updated.id,
      companyId: updated.companyId,
      name: updated.name,
      loginId: updated.loginId,
      role: updated.role as Role,
      status: updated.status,
      department: updated.department,
      permissions: updated.permissions,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  },

  deleteUserByAdmin(userId: string): boolean {
    const user = db.prepare('SELECT loginId FROM users WHERE id = ?').get(userId) as any;
    if (user?.loginId?.toLowerCase() === 'brandlens@gmail.com') {
      throw new Error('Cannot delete root platform administrator.');
    }
    const res = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    return res.changes > 0;
  },

  getPlatformApiSetting(key: string): string {
    try {
      const row = db.prepare('SELECT value FROM platform_api_settings WHERE key = ?').get(key) as { value: string } | undefined;
      if (row && typeof row.value === 'string' && row.value.trim().length > 0) {
        return row.value.trim();
      }
    } catch {}
    return (process.env[key] || '').trim();
  },

  getPlatformApiSettings(): Record<string, { value: string; masked: string; isSet: boolean }> {
    const keys = [
      'GEMINI_API_KEY',
      'FREELLM_API_KEY',
      'FREELLM_API_URL',
      'IMAGE_GEN_KEY',
      'IMAGE_GEN_URL',
      'APP_ENCRYPTION_KEY',
      'LINKEDIN_CLIENT_ID',
      'LINKEDIN_CLIENT_SECRET',
      'META_APP_ID',
      'META_APP_SECRET',
      'X_CLIENT_ID',
      'X_CLIENT_SECRET',
      'WHATSAPP_SUPPORT_NUMBER',
      'MAX_UPLOAD_MB'
    ];

    const dbSettings = db.prepare('SELECT key, value FROM platform_api_settings').all() as Array<{ key: string; value: string }>;
    const dbMap: Record<string, string> = {};
    dbSettings.forEach(s => { dbMap[s.key] = s.value; });

    const result: Record<string, { value: string; masked: string; isSet: boolean }> = {};

    for (const k of keys) {
      const val = dbMap[k] !== undefined ? dbMap[k] : (process.env[k] || '');
      const isSet = Boolean(val && val.trim() !== '' && !val.includes('replace_') && (k === 'IMAGE_GEN_KEY' || val !== 'invalid'));
      let masked = val;
      if (isSet) {
        if (k.includes('URL') || k.includes('NUMBER') || k === 'MAX_UPLOAD_MB') {
          masked = val;
        } else if (val.length > 8) {
          masked = val.slice(0, 4) + '••••••••' + val.slice(-4);
        } else {
          masked = '••••••••';
        }
      }
      result[k] = {
        value: val,
        masked,
        isSet
      };
    }

    return result;
  },

  savePlatformApiSettings(updates: Record<string, string>) {
    const now = new Date().toISOString();
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      try {
        envContent = fs.readFileSync(envPath, 'utf8');
      } catch {}
    }

    for (const [key, rawVal] of Object.entries(updates)) {
      const val = (rawVal || '').trim();
      // 1. Save in database
      db.prepare(`
        INSERT INTO platform_api_settings (key, value, updatedAt)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
      `).run(key, val, now);

      // 2. Update runtime process.env
      process.env[key] = val;

      // 3. Update in .env file
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${val}"`);
      } else {
        envContent += `\n${key}="${val}"`;
      }
    }

    try {
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    } catch (err) {
      console.warn('Could not write to .env:', err);
    }

    return this.getPlatformApiSettings();
  },

  vacuumDatabase(): { success: boolean; message: string } {
    try {
      db.exec('VACUUM;');
      db.exec('PRAGMA optimize;');
      return { success: true, message: 'Database optimized and vacuumed successfully.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Vacuum failed' };
    }
  }
};
