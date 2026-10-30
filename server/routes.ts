import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { dbService } from './db.ts';
import { aiService, backgroundTaskManager } from './ai.ts';
import type { AITaskType, Role, Platform } from '../src/types/index.ts';
import { getOrganizationConfig, getAllOrganizations } from './config/organizations.ts';
import { getPlatformConfig, buildOAuthUrl, exchangeOAuthCode, publishPostDirect, getAppBaseUrl } from './social/index.ts';
import { decryptToken } from './encryption.ts';

// HTML Entity escape helper preventing reflected XSS
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const apiRouter = express.Router();

// --- Organization Routes ---
apiRouter.get('/organizations', (_req: Request, res: Response): void => {
  res.json({ success: true, organizations: getAllOrganizations() });
});

apiRouter.get('/organizations/:id', (req: Request, res: Response): void => {
  const org = getOrganizationConfig(req.params.id);
  res.json({ success: true, organization: org });
});

// --- Enterprise Multi-Company SaaS & Auth Routes ---

apiRouter.post('/auth/register-company', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName, companyCategory, companyEmail, password } = req.body;
    if (!companyName || !companyCategory || !companyEmail || !password) {
      res.status(400).json({ success: false, error: 'All fields are required: Company Name, Category, Email, and Password.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail.trim())) {
      res.status(400).json({ success: false, error: 'Please enter a valid company email address.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
      return;
    }

    const { company, user } = dbService.registerCompany({
      companyName,
      companyCategory,
      companyEmail,
      password
    });

    // Generate initial prompt instructions for the new company
    try {
      const bundle = dbService.getCompanyGuidelines(company.id);
      const promptData = await aiService.generateCompactPrompts(company, bundle);
      dbService.saveCompanyAIPrompt(company.id, promptData);
    } catch (err) {
      console.warn('Initial prompt generation warning for new company:', err);
    }

    res.status(201).json({
      success: true,
      message: 'Company registered successfully. You can now log in.',
      company,
      user
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Registration failed.' });
  }
});

apiRouter.post('/auth/login', (req: Request, res: Response): void => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      res.status(400).json({ success: false, error: 'Login ID and Password are required.' });
      return;
    }

    const authResult = dbService.authenticateUser(loginId, password);
    if (!authResult) {
      res.status(401).json({ success: false, error: 'Invalid login credentials. Please check your username and password.' });
      return;
    }

    res.json({
      success: true,
      company: authResult.company,
      user: authResult.user
    });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message || 'Authentication failed.' });
  }
});

apiRouter.get('/auth/me', (req: Request, res: Response): void => {
  const companyId = req.query.companyId as string || 'org-nova-unlimited';
  const comp = dbService.getCompanyById(companyId);
  res.json({ success: true, company: comp });
});

// --- CEO Workspace Routes ---

apiRouter.get('/ceo/company', (req: Request, res: Response): void => {
  const companyId = req.query.companyId as string;
  if (!companyId) {
    res.status(400).json({ success: false, error: 'companyId is required.' });
    return;
  }
  const company = dbService.getCompanyById(companyId);
  if (!company) {
    res.status(404).json({ success: false, error: 'Company not found.' });
    return;
  }
  const prompt = dbService.getCompanyAIPrompt(companyId);
  res.json({ success: true, company, prompt });
});

apiRouter.put('/ceo/company', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, ...updates } = req.body;
    if (!companyId) {
      res.status(400).json({ success: false, error: 'companyId is required.' });
      return;
    }

    const updated = dbService.updateCompanyProfile(companyId, updates);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Company not found.' });
      return;
    }

    // Trigger AI compact prompt regeneration
    let promptStatus = 'needs_refresh';
    try {
      const bundle = dbService.getCompanyGuidelines(companyId);
      const promptData = await aiService.generateCompactPrompts(updated, bundle);
      const savedPrompt = dbService.saveCompanyAIPrompt(companyId, {
        ...promptData,
        sourceProfileVersion: updated.profileVersion,
        sourceGuidelinesVersion: updated.guidelineVersion
      });
      promptStatus = savedPrompt.generationStatus;
    } catch (err: any) {
      console.warn('Prompt generation on company update failed:', err);
      dbService.saveCompanyAIPrompt(companyId, {
        generationStatus: 'needs_refresh',
        errorMessage: err.message
      });
    }

    res.json({
      success: true,
      message: 'Company profile updated and AI instruction set refreshed.',
      company: updated,
      promptStatus
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update company.' });
  }
});

apiRouter.get('/ceo/guidelines', (req: Request, res: Response): void => {
  const companyId = req.query.companyId as string;
  if (!companyId) {
    res.status(400).json({ success: false, error: 'companyId is required.' });
    return;
  }
  const company = dbService.getCompanyById(companyId);
  if (!company) {
    res.status(404).json({ success: false, error: 'Company not found.' });
    return;
  }
  const guidelines = dbService.getCompanyGuidelines(companyId);
  const prompt = dbService.getCompanyAIPrompt(companyId);
  res.json({ success: true, guidelines, guidelineVersion: company.guidelineVersion, prompt });
});

apiRouter.put('/ceo/guidelines', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, guidelines } = req.body;
    if (!companyId || !guidelines) {
      res.status(400).json({ success: false, error: 'companyId and guidelines bundle are required.' });
      return;
    }

    const comp = dbService.getCompanyById(companyId);
    if (!comp) {
      res.status(404).json({ success: false, error: 'Company not found.' });
      return;
    }

    const result = dbService.saveCompanyGuidelines(companyId, guidelines);
    const updatedCompany = dbService.getCompanyById(companyId)!;

    // Trigger AI compact prompt regeneration
    let promptStatus = 'needs_refresh';
    try {
      const promptData = await aiService.generateCompactPrompts(updatedCompany, result.bundle);
      const savedPrompt = dbService.saveCompanyAIPrompt(companyId, {
        ...promptData,
        sourceProfileVersion: updatedCompany.profileVersion,
        sourceGuidelinesVersion: result.newVersion
      });
      promptStatus = savedPrompt.generationStatus;
    } catch (err: any) {
      console.warn('Prompt generation on guidelines update failed:', err);
      dbService.saveCompanyAIPrompt(companyId, {
        generationStatus: 'needs_refresh',
        errorMessage: err.message
      });
    }

    res.json({
      success: true,
      message: 'Guidelines saved and AI instruction set refreshed.',
      guidelines: result.bundle,
      guidelineVersion: result.newVersion,
      promptStatus
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to save guidelines.' });
  }
});

apiRouter.get('/ceo/profile', (req: Request, res: Response): void => {
  try {
    const companyId = (req.query.companyId as string) || 'org-nova-unlimited';
    const ceo = dbService.getCeoAccount(companyId);
    if (!ceo) {
      res.status(404).json({ success: false, error: 'CEO account not found for this organization.' });
      return;
    }
    const company = dbService.getCompanyById(companyId);
    const team = dbService.getTeamAccounts(companyId, false);
    const stats = {
      totalUsers: team.length + 1,
      employees: team.filter(t => t.role === 'Employee').length,
      managers: team.filter(t => t.role === 'Manager').length,
      hods: team.filter(t => t.role === 'HOD').length,
      guidelineVersion: company?.guidelineVersion || 1,
      profileVersion: company?.profileVersion || 1
    };
    res.json({ success: true, ceo, company, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to retrieve CEO profile.' });
  }
});

apiRouter.put('/ceo/profile', (req: Request, res: Response): void => {
  try {
    const { companyId, name, loginId, newPassword } = req.body;
    if (!companyId) {
      res.status(400).json({ success: false, error: 'companyId is required.' });
      return;
    }
    const updated = dbService.updateCeoAccount(companyId, {
      name,
      loginId,
      password: newPassword
    });
    res.json({
      success: true,
      message: 'CEO executive profile updated successfully.',
      user: updated
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update CEO profile.' });
  }
});

apiRouter.post('/ceo/profile/password', (req: Request, res: Response): void => {
  try {
    const { companyId, currentPassword, newPassword } = req.body;
    if (!companyId || !newPassword) {
      res.status(400).json({ success: false, error: 'companyId and newPassword are required.' });
      return;
    }
    if (newPassword.trim().length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
      return;
    }
    const ceo = dbService.getCeoAccount(companyId);
    if (!ceo) {
      res.status(404).json({ success: false, error: 'CEO account not found.' });
      return;
    }

    if (currentPassword) {
      const auth = dbService.authenticateUser(ceo.loginId, currentPassword);
      if (!auth) {
        res.status(401).json({ success: false, error: 'Current password verification failed.' });
        return;
      }
    }

    dbService.changeUserPassword(ceo.id, companyId, newPassword.trim());
    res.json({
      success: true,
      message: 'CEO master password updated successfully.'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to change CEO password.' });
  }
});

apiRouter.get('/ceo/team', (req: Request, res: Response): void => {
  const companyId = req.query.companyId as string;
  if (!companyId) {
    res.status(400).json({ success: false, error: 'companyId is required.' });
    return;
  }
  const includeCeo = req.query.includeCeo === 'true';
  const team = dbService.getTeamAccounts(companyId, includeCeo);
  const ceo = dbService.getCeoAccount(companyId);
  res.json({ success: true, team, ceo });
});

apiRouter.post('/ceo/team', (req: Request, res: Response): void => {
  try {
    const { companyId, name, password, role } = req.body;
    if (!companyId || !name || !password || !role) {
      res.status(400).json({ success: false, error: 'Missing required team fields: companyId, name, password, and role.' });
      return;
    }

    if (!['Employee', 'Manager', 'HOD'].includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid designation. Allowed: Employee, Manager, HOD.' });
      return;
    }

    const { department, permissions } = req.body;
    const newMember = dbService.addTeamAccount(companyId, { name, password, role, department, permissions });
    res.status(201).json({
      success: true,
      message: `Account created for ${name} with Login ID: ${newMember.loginId}`,
      user: newMember
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to add team account.' });
  }
});

apiRouter.put('/ceo/team/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { companyId, name, role, status, department, permissions } = req.body;
    if (!companyId) {
      res.status(400).json({ success: false, error: 'companyId is required.' });
      return;
    }
    const updated = dbService.updateTeamMember(id, companyId, {
      name,
      role,
      status,
      department,
      permissions
    });
    res.json({
      success: true,
      message: `Account for ${updated.name} updated successfully.`,
      user: updated
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update team member.' });
  }
});

apiRouter.post('/ceo/team/:id/password', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { companyId, newPassword } = req.body;
    if (!companyId || !newPassword) {
      res.status(400).json({ success: false, error: 'companyId and newPassword are required.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      return;
    }
    dbService.changeUserPassword(id, companyId, newPassword);
    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to change password.' });
  }
});

apiRouter.delete('/ceo/team/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const companyId = (req.query.companyId as string) || req.body?.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, error: 'companyId is required.' });
      return;
    }
    dbService.deleteUserAccount(id, companyId);
    res.json({
      success: true,
      message: 'Account deleted successfully.'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to delete account.' });
  }
});

apiRouter.get('/ceo/prompts', (req: Request, res: Response): void => {
  const companyId = req.query.companyId as string;
  if (!companyId) {
    res.status(400).json({ success: false, error: 'companyId is required.' });
    return;
  }
  const prompt = dbService.getCompanyAIPrompt(companyId);
  res.json({ success: true, prompt });
});

apiRouter.post('/ceo/prompts/regenerate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.body;
    if (!companyId) {
      res.status(400).json({ success: false, error: 'companyId is required.' });
      return;
    }

    const company = dbService.getCompanyById(companyId);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found.' });
      return;
    }

    const bundle = dbService.getCompanyGuidelines(companyId);
    const promptData = await aiService.generateCompactPrompts(company, bundle);
    const saved = dbService.saveCompanyAIPrompt(companyId, {
      ...promptData,
      sourceProfileVersion: company.profileVersion,
      sourceGuidelinesVersion: company.guidelineVersion
    });

    res.json({ success: true, prompt: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to regenerate prompt.' });
  }
});

// --- CEO Connected Accounts & Platform Configurations ---
apiRouter.get('/ceo/platform-configs', (req: Request, res: Response): void => {
  const companyId = req.query.companyId as string;
  if (!companyId) {
    res.status(400).json({ success: false, error: 'companyId is required.' });
    return;
  }

  try {
    const configs = dbService.getCompanyPlatformConfigs(companyId);
    const enrichedConfigs = configs.map((cfg) => {
      const platformInfo = getPlatformConfig(cfg.platform, req);
      return {
        ...cfg,
        redirectUri: platformInfo.redirectUri,
        appDomain: platformInfo.appDomain,
        siteUrl: platformInfo.siteUrl,
        instructions: platformInfo.instructions,
        requiredScopes: platformInfo.requiredScopes
      };
    });

    res.json({ success: true, configs: enrichedConfigs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to load company platform configurations.' });
  }
});

apiRouter.post('/ceo/platform-configs', (req: Request, res: Response): void => {
  const { companyId, platform, clientId, clientSecret, accessToken, pageId, accountName, accountIdentifier, isActive } = req.body;
  if (!companyId || !platform) {
    res.status(400).json({ success: false, error: 'companyId and platform are required.' });
    return;
  }

  if (!['LinkedIn', 'Instagram', 'X'].includes(platform)) {
    res.status(400).json({ success: false, error: 'Invalid platform. Allowed: LinkedIn, Instagram, X.' });
    return;
  }

  try {
    const updated = dbService.saveCompanyPlatformConfig(companyId, {
      platform,
      clientId,
      clientSecret,
      accessToken,
      pageId,
      accountName,
      accountIdentifier,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.json({
      success: true,
      config: updated,
      message: `${platform} credentials and publishing channel updated successfully! Your team can now post directly.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to save platform configuration.' });
  }
});

apiRouter.delete('/ceo/platform-configs/:platform', (req: Request, res: Response): void => {
  const rawPlat = req.params.platform.toLowerCase();
  let platform: Platform | null = null;
  if (rawPlat === 'linkedin') platform = 'LinkedIn';
  else if (rawPlat === 'instagram') platform = 'Instagram';
  else if (rawPlat === 'x' || rawPlat === 'twitter') platform = 'X';

  const companyId = (req.query.companyId || req.body?.companyId) as string;
  if (!platform || !companyId) {
    res.status(400).json({ success: false, error: 'Invalid platform or missing companyId.' });
    return;
  }

  try {
    dbService.deleteCompanyPlatformConfig(companyId, platform);
    res.json({ success: true, message: `${platform} configuration and credentials removed.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete platform configuration.' });
  }
});

apiRouter.post('/ceo/platform-configs/:platform/toggle', (req: Request, res: Response): void => {
  const rawPlat = req.params.platform.toLowerCase();
  let platform: Platform | null = null;
  if (rawPlat === 'linkedin') platform = 'LinkedIn';
  else if (rawPlat === 'instagram') platform = 'Instagram';
  else if (rawPlat === 'x' || rawPlat === 'twitter') platform = 'X';

  const { companyId, isActive } = req.body;
  if (!platform || !companyId) {
    res.status(400).json({ success: false, error: 'Invalid platform or missing companyId.' });
    return;
  }

  try {
    dbService.toggleCompanyPlatformConfig(companyId, platform, Boolean(isActive));
    res.json({ success: true, message: `${platform} publishing is now ${isActive ? 'active' : 'paused'}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to toggle platform status.' });
  }
});

apiRouter.post('/ceo/platform-configs/:platform/test', async (req: Request, res: Response): Promise<void> => {
  const rawPlat = req.params.platform.toLowerCase();
  let platform: Platform | null = null;
  if (rawPlat === 'linkedin') platform = 'LinkedIn';
  else if (rawPlat === 'instagram') platform = 'Instagram';
  else if (rawPlat === 'x' || rawPlat === 'twitter') platform = 'X';

  const { companyId } = req.body;
  if (!platform || !companyId) {
    res.status(400).json({ success: false, error: 'Invalid platform or missing companyId.' });
    return;
  }

  try {
    const config = dbService.getCompanyPlatformConfig(companyId, platform);
    if (!config || !config.accessTokenRaw) {
      res.status(400).json({ success: false, error: `No access token configured for ${platform}. Please enter and save an access token first.` });
      return;
    }

    const token = config.accessTokenRaw;

    if (platform === 'LinkedIn') {
      const testRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!testRes.ok) {
        const errText = await testRes.text();
        res.status(400).json({ success: false, error: `LinkedIn verification returned status ${testRes.status}. Token may be expired or lack permissions: ${errText.substring(0, 100)}` });
        return;
      }
      const data = await testRes.json();
      res.json({ success: true, message: `Successfully verified LinkedIn token for ${data.name || 'User'}!` });
      return;
    }

    if (platform === 'X') {
      const testRes = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!testRes.ok) {
        const errText = await testRes.text();
        res.status(400).json({ success: false, error: `X verification returned status ${testRes.status}: ${errText.substring(0, 100)}` });
        return;
      }
      const data = await testRes.json();
      res.json({ success: true, message: `Successfully verified X account @${data?.data?.username || 'user'}!` });
      return;
    }

    if (platform === 'Instagram') {
      const testRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
      if (!testRes.ok) {
        const errText = await testRes.text();
        res.status(400).json({ success: false, error: `Meta Graph API returned status ${testRes.status}: ${errText.substring(0, 100)}` });
        return;
      }
      const data = await testRes.json();
      res.json({ success: true, message: `Successfully verified Meta token for ${data.name || data.id}!` });
      return;
    }

    res.json({ success: true, message: `Token format verified for ${platform}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Connection test failed.' });
  }
});

// ----------------------------------------------------
// Team Messaging Endpoints (Brand Scoped)
// ----------------------------------------------------

apiRouter.get('/messages/roster', (req: Request, res: Response): void => {
  const companyId = req.query.companyId as string;
  if (!companyId) {
    res.status(400).json({ success: false, error: 'companyId is required.' });
    return;
  }
  try {
    const roster = dbService.getCompanyMembersRoster(companyId);
    res.json({ success: true, roster });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch team roster.' });
  }
});

apiRouter.get('/messages/thread', (req: Request, res: Response): void => {
  const companyId = req.query.companyId as string;
  const userId = req.query.userId as string;
  const otherUserId = req.query.otherUserId as string;

  if (!companyId || !userId || !otherUserId) {
    res.status(400).json({ success: false, error: 'companyId, userId, and otherUserId are required.' });
    return;
  }

  try {
    const messages = dbService.getTeamConversation(companyId, userId, otherUserId);
    // Automatically mark messages received by userId as read
    dbService.markTeamConversationAsRead(companyId, userId, otherUserId);
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to retrieve message thread.' });
  }
});

apiRouter.post('/messages/send', (req: Request, res: Response): void => {
  const { companyId, senderId, receiverId, content } = req.body;
  if (!companyId || !senderId || !receiverId || !content?.trim()) {
    res.status(400).json({ success: false, error: 'companyId, senderId, receiverId, and content are required.' });
    return;
  }

  try {
    const message = dbService.sendTeamMessage({
      companyId,
      senderId,
      receiverId,
      content: content.trim()
    });
    res.json({ success: true, message });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to send message.' });
  }
});

apiRouter.get('/messages/conversations', (req: Request, res: Response): void => {
  const companyId = req.query.companyId as string;
  const userId = req.query.userId as string;

  if (!companyId || !userId) {
    res.status(400).json({ success: false, error: 'companyId and userId are required.' });
    return;
  }

  try {
    const conversations = dbService.getRecentConversations(companyId, userId);
    res.json({ success: true, conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch conversations.' });
  }
});

apiRouter.get('/messages/unread-count', (req: Request, res: Response): void => {
  const companyId = req.query.companyId as string;
  const userId = req.query.userId as string;

  if (!companyId || !userId) {
    res.status(400).json({ success: false, error: 'companyId and userId are required.' });
    return;
  }

  try {
    const unreadCount = dbService.getUnreadMessageCount(companyId, userId);
    res.json({ success: true, unreadCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch unread count.' });
  }
});

apiRouter.post('/messages/mark-read', (req: Request, res: Response): void => {
  const { companyId, userId, otherUserId } = req.body;
  if (!companyId || !userId || !otherUserId) {
    res.status(400).json({ success: false, error: 'companyId, userId, and otherUserId are required.' });
    return;
  }

  try {
    dbService.markTeamConversationAsRead(companyId, userId, otherUserId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to mark messages as read.' });
  }
});

const maxUploadMb = parseInt(process.env.MAX_UPLOAD_MB || '25', 10);
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxUploadMb * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowedMime = [
      'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
      'video/mp4', 'video/quicktime', 'video/webm',
      'application/pdf'
    ];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported. Supported: images, videos, and PDFs.`));
    }
  }
});

const docUpload = multer({
  storage,
  limits: {
    fileSize: maxUploadMb * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf', '.json'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid document type (${ext || 'unknown'}). Allowed: ${allowed.join(', ')}`));
    }
  }
});

// --- Upload Route ---
apiRouter.post('/uploads', upload.single('media'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No media file provided.' });
    return;
  }

  const mediaRef = `/uploads/${req.file.filename}`;
  let mediaType: 'image' | 'video' | 'pdf' = 'image';
  if (req.file.mimetype.startsWith('video/')) mediaType = 'video';
  else if (req.file.mimetype === 'application/pdf') mediaType = 'pdf';

  res.json({
    success: true,
    mediaRef,
    mediaType,
    mediaOriginalName: req.file.originalname,
    mediaSize: req.file.size
  });
});

// --- Persistent AI Tasks Routes (Non-blocking background jobs) ---
apiRouter.post('/tasks', (req: Request, res: Response): void => {
  const {
    taskType,
    postId,
    authorUsername,
    authorRole,
    platform,
    title,
    caption,
    mediaRef,
    organizationId
  } = req.body;

  if (!taskType || !authorUsername || !authorRole || !platform || !title) {
    res.status(400).json({ success: false, error: 'Missing required task fields.' });
    return;
  }

  // Idempotency: check if an identical task is already active (QUEUED or PROCESSING)
  const existingActive = dbService.findActiveTask(authorUsername, taskType as AITaskType, title);
  if (existingActive) {
    // Return existing task without spawning duplicate
    res.json({ success: true, task: existingActive, duplicatePrevented: true });
    return;
  }

  const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const task = dbService.createAITask({
    id: taskId,
    organizationId: organizationId || 'org-nova-unlimited',
    postId: postId || null,
    authorUsername,
    authorRole: authorRole as Role,
    taskType: taskType as AITaskType,
    status: 'QUEUED',
    inputPayload: {
      title,
      caption: caption || '',
      platform: platform as Platform,
      mediaRef: mediaRef || null
    },
    progressMessage: 'Task queued in background processor...'
  });

  // Start asynchronous background execution
  backgroundTaskManager.executeTask(task);

  res.status(202).json({ success: true, task });
});

apiRouter.get('/tasks', (req: Request, res: Response): void => {
  const authorUsername = (req.query.authorUsername as string) || '';
  if (!authorUsername) {
    res.status(400).json({ success: false, error: 'authorUsername query parameter is required.' });
    return;
  }

  const tasks = dbService.getAITasksByAuthor(authorUsername);
  res.json({ success: true, tasks });
});

apiRouter.get('/tasks/:id', (req: Request, res: Response): void => {
  const task = dbService.getAITaskById(req.params.id);
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found.' });
    return;
  }
  res.json({ success: true, task });
});

apiRouter.post('/tasks/:id/retry', (req: Request, res: Response): void => {
  const task = dbService.getAITaskById(req.params.id);
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found.' });
    return;
  }

  const updated = dbService.updateAITask(task.id, {
    status: 'QUEUED',
    errorMessage: null,
    progressMessage: 'Restarting task operation...'
  });

  if (updated) {
    backgroundTaskManager.executeTask(updated);
  }

  res.json({ success: true, task: updated });
});

// --- Autosave & Draft Routes ---
apiRouter.get('/drafts', (req: Request, res: Response): void => {
  const authorUsername = (req.query.authorUsername as string) || '';
  if (!authorUsername) {
    res.status(400).json({ success: false, error: 'authorUsername query parameter is required.' });
    return;
  }
  const draft = dbService.getDraft(authorUsername);
  res.json({ success: true, draft });
});

apiRouter.put('/drafts', (req: Request, res: Response): void => {
  const {
    authorUsername,
    authorRole,
    platform,
    title,
    caption,
    mediaRef,
    mediaType,
    mediaOriginalName,
    mediaSize,
    textReviewResult,
    imageReviewResult
  } = req.body;

  if (!authorUsername || !authorRole) {
    res.status(400).json({ success: false, error: 'authorUsername and authorRole are required.' });
    return;
  }

  const saved = dbService.saveDraft({
    authorUsername,
    authorRole,
    platform: platform || 'LinkedIn',
    title: title || '',
    caption: caption || '',
    mediaRef: mediaRef || null,
    mediaType: mediaType || null,
    mediaOriginalName: mediaOriginalName || null,
    mediaSize: mediaSize || null,
    textReviewResult: textReviewResult || null,
    imageReviewResult: imageReviewResult || null,
    updatedAt: new Date().toISOString()
  });

  res.json({ success: true, draft: saved });
});

apiRouter.delete('/drafts', (req: Request, res: Response): void => {
  const authorUsername = (req.query.authorUsername as string) || '';
  if (authorUsername) {
    dbService.clearDraft(authorUsername);
  }
  res.json({ success: true });
});

// --- Direct AI Routes (Synchronous fallback) ---
apiRouter.post('/ai/check-text', async (req: Request, res: Response): Promise<void> => {
  const { title, caption, platform, role, organizationId, orgId, simulate } = req.body;
  if (!title || !caption || !platform || !role) {
    res.status(400).json({ success: false, error: 'Missing required parameters: title, caption, platform, or role.' });
    return;
  }

  const result = await aiService.checkText({
    title,
    caption,
    platform,
    role,
    orgId: orgId || organizationId || 'org-nova-unlimited',
    simulate
  });
  res.json(result);
});

apiRouter.post('/ai/check-image', async (req: Request, res: Response): Promise<void> => {
  const { mediaRef, title, caption, platform, role, organizationId, orgId } = req.body;
  if (!mediaRef) {
    res.status(400).json({ success: false, error: 'Missing required mediaRef parameter for image analysis.' });
    return;
  }

  const result = await aiService.checkImage({
    mediaRef,
    title: title || 'BrandLens Visual Asset',
    caption: caption || 'Visual inspection for public posting',
    platform: (platform as Platform) || 'LinkedIn',
    role: (role as Role) || 'Employee',
    orgId: orgId || organizationId || 'org-nova-unlimited'
  });
  res.json(result);
});

apiRouter.post('/ai/generate-image', async (req: Request, res: Response): Promise<void> => {
  const { prompt, title, caption, platform, role, organizationId, orgId } = req.body;
  if (!prompt && (!title || !caption)) {
    res.status(400).json({ success: false, error: 'Either prompt or title and caption are required for image generation.' });
    return;
  }

  const result = await aiService.generateImage({
    prompt,
    title: title || 'Enterprise Cloud Infrastructure',
    caption: caption || 'High performance server infrastructure',
    platform: (platform as Platform) || 'LinkedIn',
    role: (role as Role) || 'Employee',
    orgId: orgId || organizationId || 'org-nova-unlimited'
  });
  res.json(result);
});

// --- Text Enhancer Route ---
apiRouter.post('/ai/enhance-text', async (req: Request, res: Response): Promise<void> => {
  const { text, role, platform, tone, organizationId, orgId } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ success: false, error: 'Text content is required for enhancement.' });
    return;
  }

  const result = await aiService.enhanceText({
    text: text.trim(),
    role: (role as Role) || 'Employee',
    platform: (platform as Platform) || 'LinkedIn',
    tone: tone || 'Authoritative, clear, and professional',
    orgId: orgId || organizationId || 'org-nova-unlimited'
  });
  res.json(result);
});

// --- Document Review & Text Extraction Route ---
apiRouter.post('/ai/extract-document', docUpload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No document file was uploaded.' });
    return;
  }

  const filePath = req.file.path;
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const buffer = fs.readFileSync(filePath);
    let extractedText = '';

    if (ext === '.pdf') {
      try {
        const pdfModule: any = await import('pdf-parse');
        const pdfFn = pdfModule.default || pdfModule;
        if (typeof pdfFn === 'function') {
          const pdfData = await pdfFn(buffer);
          extractedText = pdfData?.text || '';
        } else if (pdfModule.PDFParse) {
          const parser: any = new pdfModule.PDFParse(buffer);
          if (typeof parser.load === 'function') await parser.load();
          const pdfData = typeof parser.getText === 'function' ? await parser.getText() : null;
          extractedText = pdfData?.text || '';
        }
      } catch (pdfErr) {
        // Stream text fallback
        extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } else if (ext === '.docx' || ext === '.doc') {
      try {
        // @ts-ignore
        const mammothModule = await import('mammoth');
        const mammoth = mammothModule.default || mammothModule;
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedText = docxResult?.value || '';
      } catch (docErr) {
        extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } else {
      // Plain text, markdown, json, etc.
      extractedText = buffer.toString('utf-8');
    }

    const cleanText = (extractedText || '').trim();
    const words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
    const chars = cleanText.length;

    res.json({
      success: true,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: ext.replace('.', '').toUpperCase() || 'DOCUMENT',
      text: cleanText || 'No readable text content could be extracted from this document.',
      wordCount: words,
      charCount: chars
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to extract text from document.' });
  } finally {
    // Prevent disk accumulation: remove temp uploaded document after extraction
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      console.warn('Notice: Temp document cleanup warning:', cleanupErr);
    }
  }
});

// --- Posts CRUD Routes ---
apiRouter.get('/posts', (req: Request, res: Response): void => {
  const authorUsername = (req.query.authorUsername as string) || '';
  const companyId = ((req.query.companyId || req.query.organizationId) as string) || '';
  const role = (req.query.role as Role) || undefined;

  let posts: any[] = [];
  if (companyId) {
    posts = dbService.getPostsByCompanyAndAuthor(companyId, authorUsername, role);
  } else if (authorUsername) {
    posts = dbService.getPostsByAuthor(authorUsername);
  } else {
    posts = dbService.getPostsByCompanyAndAuthor('org-nova-unlimited');
  }

  res.json({ success: true, posts });
});

apiRouter.post('/posts', (req: Request, res: Response): void => {
  const {
    authorUsername,
    authorRole,
    platform,
    title,
    caption,
    mediaRef,
    mediaType,
    mediaOriginalName,
    mediaSize,
    textReviewResult,
    imageReviewResult,
    unresolvedIssuesCount,
    status,
    isEnhanced,
    organizationId
  } = req.body;

  if (!authorUsername || !authorRole || !platform || !title || !caption) {
    res.status(400).json({ success: false, error: 'Missing required post fields: title, caption, platform, and author.' });
    return;
  }

  const id = `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const post = dbService.createPost({
    id,
    organizationId: organizationId || 'org-nova-unlimited',
    authorUsername,
    authorRole,
    platform,
    title,
    caption,
    status: status || 'pending_review',
    isEnhanced: Boolean(isEnhanced),
    mediaRef: mediaRef || null,
    mediaType: mediaType || null,
    mediaOriginalName: mediaOriginalName || null,
    mediaSize: mediaSize || null,
    textReviewResult: textReviewResult || null,
    imageReviewResult: imageReviewResult || null,
    unresolvedIssuesCount: Number(unresolvedIssuesCount) || 0
  });

  // Clear autosaved draft on successful post creation
  dbService.clearDraft(authorUsername);

  res.status(201).json({ success: true, post });
});

apiRouter.get('/posts/:id', (req: Request, res: Response): void => {
  const post = dbService.getPostById(req.params.id);
  if (!post) {
    res.status(404).json({ success: false, error: 'Post not found.' });
    return;
  }
  res.json({ success: true, post });
});

apiRouter.put('/posts/:id', (req: Request, res: Response): void => {
  const actorUsername = req.body.actorUsername || 'system';
  const updated = dbService.updatePost(req.params.id, req.body, actorUsername);
  if (!updated) {
    res.status(404).json({ success: false, error: 'Post not found.' });
    return;
  }
  res.json({ success: true, post: updated });
});

// Dedicated Status Lifecycle Transitions
apiRouter.post('/posts/:id/mark-ready', (req: Request, res: Response): void => {
  const actorUsername = req.body.actorUsername || 'system';
  const updated = dbService.markPostReady(req.params.id, actorUsername);
  if (!updated) {
    res.status(404).json({ success: false, error: 'Post not found.' });
    return;
  }
  res.json({ success: true, post: updated });
});

apiRouter.post('/posts/:id/mark-posted', (req: Request, res: Response): void => {
  const actorUsername = req.body.actorUsername || 'system';
  const updated = dbService.markPostPosted(req.params.id, actorUsername);
  if (!updated) {
    res.status(404).json({ success: false, error: 'Post not found.' });
    return;
  }
  res.json({ success: true, post: updated });
});

apiRouter.post('/posts/:id/reopen', (req: Request, res: Response): void => {
  const actorUsername = req.body.actorUsername || 'system';
  const targetStatus = req.body.targetStatus || 'pending_review';
  const updated = dbService.reopenPost(req.params.id, actorUsername, targetStatus);
  if (!updated) {
    res.status(404).json({ success: false, error: 'Post not found.' });
    return;
  }
  res.json({ success: true, post: updated });
});

apiRouter.get('/posts/:id/activity', (req: Request, res: Response): void => {
  const activities = dbService.getActivitiesByPostId(req.params.id);
  res.json({ success: true, activities });
});

apiRouter.get('/metrics', (req: Request, res: Response): void => {
  const authorUsername = (req.query.authorUsername as string) || '';
  const companyId = ((req.query.companyId || req.query.organizationId) as string) || '';
  const role = (req.query.role as Role) || undefined;
  const metrics = dbService.getMetrics(companyId, authorUsername, role);
  res.json({ success: true, metrics });
});

// --- Connected Accounts & OAuth Routes ---
apiRouter.get('/connected-accounts', (req: Request, res: Response): void => {
  const orgId = (req.query.orgId as string) || 'org-nova-unlimited';
  const accounts = dbService.getConnectedAccounts(orgId);

  // Augment with isConfigured check
  const augmented = accounts.map((acc) => {
    const cfg = getPlatformConfig(acc.platform, req);
    return {
      ...acc,
      isConfigured: cfg.isConfigured
    };
  });

  res.json({ success: true, accounts: augmented });
});

apiRouter.get('/connected-accounts/configs', (req: Request, res: Response): void => {
  const platforms: Platform[] = ['LinkedIn', 'Instagram', 'X'];
  const configs = platforms.map((p) => getPlatformConfig(p, req));
  res.json({ success: true, configs });
});

apiRouter.get('/auth/url/:platform', (req: Request, res: Response): void => {
  const rawPlat = req.params.platform.toLowerCase();
  let plat: Platform | null = null;
  if (rawPlat === 'linkedin') plat = 'LinkedIn';
  else if (rawPlat === 'instagram') plat = 'Instagram';
  else if (rawPlat === 'x' || rawPlat === 'twitter') plat = 'X';

  if (!plat) {
    res.status(400).json({ success: false, error: 'Invalid platform.' });
    return;
  }

  const companyId = (req.query.companyId || req.query.orgId || 'org-nova-unlimited') as string;
  const result = buildOAuthUrl(plat, req, companyId);
  if (result.error) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  res.json({ success: true, url: result.url });
});

// OAuth Callback (lightweight HTML snippet that postMessages to opener and closes)
apiRouter.get(['/auth/callback/:platform', '/auth/callback/:platform/'], async (req: Request, res: Response): Promise<void> => {
  const rawPlat = req.params.platform.toLowerCase();
  let plat: Platform | null = null;
  if (rawPlat === 'linkedin') plat = 'LinkedIn';
  else if (rawPlat === 'instagram') plat = 'Instagram';
  else if (rawPlat === 'x' || rawPlat === 'twitter') plat = 'X';

  const code = (req.query.code as string) || '';
  const error = (req.query.error_description || req.query.error || '') as string;

  if (error || !code || !plat) {
    const safeError = escapeHtml(String(error || 'Missing authorization code from provider.'));
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connection Failed</title></head>
        <body style="font-family: sans-serif; background: #0c0d14; color: #ffb6bd; padding: 2rem; text-align: center;">
          <h2>Connection Unsuccessful</h2>
          <p>${safeError}</p>
          <script>
            setTimeout(() => { if (window.opener) window.close(); }, 3000);
          </script>
        </body>
      </html>
    `);
    return;
  }

  let organizationId = 'org-nova-unlimited';
  const stateRaw = (req.query.state as string) || '';
  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf-8'));
      if (parsed.organizationId) organizationId = parsed.organizationId;
      else if (parsed.companyId) organizationId = parsed.companyId;
    } catch {}
  }

  const exchangeResult = await exchangeOAuthCode(plat, code, req, organizationId);

  if (exchangeResult.success) {
    if (exchangeResult.account) {
      try {
        const decToken = decryptToken(exchangeResult.account.accessTokenEnc);
        dbService.saveCompanyPlatformConfig(organizationId, {
          platform: plat,
          accessToken: decToken || undefined,
          accountIdentifier: exchangeResult.account.accountIdentifier,
          accountName: exchangeResult.account.accountName,
          isActive: true
        });
      } catch (err) {
        console.warn('Could not sync OAuth token to company platform configs:', err);
      }
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Account Connected</title></head>
        <body style="font-family: sans-serif; background: #0c0d14; color: #a4e6cf; padding: 2rem; text-align: center;">
          <h2 style="color: #fff;">${plat} Account Connected!</h2>
          <p style="color: #a4e6cf;">Closing window and updating BrandLens workspace...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', platform: '${plat}' }, '*');
              setTimeout(() => window.close(), 600);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } else {
    const safeError = escapeHtml(exchangeResult.error || 'Token exchange failed.');
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connection Failed</title></head>
        <body style="font-family: sans-serif; background: #0c0d14; color: #ffb6bd; padding: 2rem; text-align: center;">
          <h2>Connection Failed</h2>
          <p>${safeError}</p>
          <button onclick="window.close()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
  }
});

apiRouter.delete('/connected-accounts/:id', (req: Request, res: Response): void => {
  const success = dbService.disconnectAccount(req.params.id);
  res.json({ success });
});

apiRouter.post('/connected-accounts/:id/toggle', (req: Request, res: Response): void => {
  const { isActive } = req.body;
  const success = dbService.toggleAccountActive(req.params.id, Boolean(isActive));
  res.json({ success });
});

// --- Direct Publishing API ---
apiRouter.post('/publish', async (req: Request, res: Response): Promise<void> => {
  const { postId, actorUsername, organizationId, companyId } = req.body;
  if (!postId || !actorUsername) {
    res.status(400).json({ success: false, error: 'postId and actorUsername are required.' });
    return;
  }

  const post = dbService.getPostById(postId);
  const targetOrgId = organizationId || companyId || post?.organizationId || 'org-nova-unlimited';

  const result = await publishPostDirect({
    postId,
    actorUsername,
    organizationId: targetOrgId,
    req
  });

  if (!result.success) {
    res.status(400).json({ success: false, error: result.errorMessage });
    return;
  }

  const updatedPost = dbService.getPostById(postId);
  res.json({
    success: true,
    post: updatedPost,
    platformPostId: result.platformPostId,
    publishedUrl: result.publishedUrl
  });
});

apiRouter.get('/publishing/attempts/:postId', (req: Request, res: Response): void => {
  const attempts = dbService.getPublishingAttemptsByPostId(req.params.postId);
  res.json({ success: true, attempts });
});

// --- Help & Support Routes ---
apiRouter.get('/config/support', (_req: Request, res: Response): void => {
  const rawNumber = (process.env.WHATSAPP_SUPPORT_NUMBER || '+919310296839').trim();
  const digitsOnly = rawNumber.replace(/\D/g, '') || '919310296839';
  res.json({
    success: true,
    whatsappConfigured: true,
    whatsappSupportNumber: digitsOnly,
    formattedNumber: '+91 93102 96839'
  });
});

apiRouter.post(['/help/chat', '/assistant/chat'], async (req: Request, res: Response): Promise<void> => {
  const { message, history, companyName, companyCategory, userRole, userName } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ success: false, error: 'A user question is required.' });
    return;
  }

  const result = await aiService.answerHelpQuestion({
    message: message.trim(),
    history: Array.isArray(history) ? history : [],
    companyName: typeof companyName === 'string' ? companyName : undefined,
    companyCategory: typeof companyCategory === 'string' ? companyCategory : undefined,
    userRole: typeof userRole === 'string' ? userRole : undefined,
    userName: typeof userName === 'string' ? userName : undefined
  });

  res.json(result);
});

// --- Data Ownership & Database Management Routes ---
apiRouter.get('/database/stats', (_req: Request, res: Response): void => {
  try {
    const stats = dbService.getDatabaseStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve database statistics.' });
  }
});

apiRouter.get('/database/export', (_req: Request, res: Response): void => {
  try {
    const exportData = dbService.exportFullDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="brandlens-export-${Date.now()}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to export database.' });
  }
});

apiRouter.get('/database/backup', (_req: Request, res: Response): void => {
  try {
    const dbFile = dbService.getRawDatabasePath();
    if (!fs.existsSync(dbFile)) {
      res.status(404).json({ success: false, error: 'Database file not found on server.' });
      return;
    }
    res.download(dbFile, `brandlens-backup-${Date.now()}.db`);
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to download database backup.' });
  }
});

// --- Admin Panel Enterprise Management Routes ---

apiRouter.get('/admin/overview', (_req: Request, res: Response): void => {
  try {
    const overview = dbService.getAdminOverview();
    res.json({ success: true, ...overview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch admin overview' });
  }
});

apiRouter.get('/admin/brands', (_req: Request, res: Response): void => {
  try {
    const brands = dbService.getAllCompaniesWithStats();
    res.json({ success: true, brands });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch brands' });
  }
});

apiRouter.post('/admin/brands', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName, companyCategory, companyEmail, password, description, brandVoice } = req.body;
    if (!companyName || !companyCategory || !companyEmail) {
      res.status(400).json({ success: false, error: 'Brand name, category, and email are required.' });
      return;
    }

    const { company, user } = dbService.registerCompany({
      companyName,
      companyCategory,
      companyEmail,
      password: password || 'brandlens123'
    });

    if (description || brandVoice) {
      dbService.updateCompanyByAdmin(company.id, {
        description: description || company.description,
        brandVoice: brandVoice || company.brandVoice
      });
    }

    res.status(201).json({
      success: true,
      message: 'Brand registered successfully.',
      company,
      user
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to create brand' });
  }
});

apiRouter.put('/admin/brands/:id', (req: Request, res: Response): void => {
  try {
    const brandId = req.params.id;
    const updated = dbService.updateCompanyByAdmin(brandId, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Brand not found.' });
      return;
    }
    res.json({ success: true, brand: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update brand' });
  }
});

apiRouter.delete('/admin/brands/:id', (req: Request, res: Response): void => {
  try {
    const brandId = req.params.id;
    const success = dbService.deleteCompanyByAdmin(brandId);
    res.json({ success, message: success ? 'Brand deleted successfully' : 'Brand not found' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to delete brand' });
  }
});

apiRouter.get('/admin/users', (_req: Request, res: Response): void => {
  try {
    const users = dbService.getAllUsersAcrossPlatform();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch users' });
  }
});

apiRouter.put('/admin/users/:id', (req: Request, res: Response): void => {
  try {
    const userId = req.params.id;
    const updated = dbService.updateUserByAdmin(userId, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update user' });
  }
});

apiRouter.delete('/admin/users/:id', (req: Request, res: Response): void => {
  try {
    const userId = req.params.id;
    const success = dbService.deleteUserByAdmin(userId);
    res.json({ success, message: success ? 'User removed successfully' : 'User not found' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to delete user' });
  }
});

apiRouter.get('/admin/apis', (_req: Request, res: Response): void => {
  try {
    const settings = dbService.getPlatformApiSettings();
    const stats = dbService.getDatabaseStats();
    res.json({ success: true, settings, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch API settings' });
  }
});

apiRouter.post('/admin/apis', (req: Request, res: Response): void => {
  try {
    const { updates } = req.body;
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ success: false, error: 'Valid updates object is required.' });
      return;
    }
    const newSettings = dbService.savePlatformApiSettings(updates);
    res.json({ success: true, message: 'API settings and environment updated successfully.', settings: newSettings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to save API settings' });
  }
});

apiRouter.post('/admin/apis/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const { service } = req.body;
    const startTime = Date.now();

    if (service === 'gemini') {
      const apiKey = dbService.getPlatformApiSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.includes('replace_') || apiKey === 'invalid') {
        res.json({ success: false, message: 'GEMINI_API_KEY is not set. Enter your key in the field below and click Save All Keys.' });
        return;
      }
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({
          apiKey: apiKey.trim(),
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
        const resp = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: 'Say "BrandLens Gemini Engine Online" in under 6 words.'
        });
        const latency = Date.now() - startTime;
        res.json({
          success: true,
          message: `Gemini 3.1 Flash-Lite connected! Latency: ${latency}ms`,
          latency,
          text: resp.text?.trim()
        });
      } catch (err: any) {
        res.json({ success: false, message: `Gemini test failed: ${err.message || 'Connection error'}` });
      }
      return;
    }

    if (service === 'freellm') {
      const url = dbService.getPlatformApiSetting('FREELLM_API_URL') || process.env.FREELLM_API_URL;
      const key = dbService.getPlatformApiSetting('FREELLM_API_KEY') || process.env.FREELLM_API_KEY;
      if (!url || !key || key.includes('replace_') || !url.startsWith('http')) {
        res.json({ success: false, message: 'FREELLM URL or Key not configured.' });
        return;
      }
      try {
        const pingRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'auto',
            messages: [{ role: 'user', content: 'ping' }]
          }),
          signal: AbortSignal.timeout(12000)
        });
        const latency = Date.now() - startTime;
        if (pingRes.ok) {
          res.json({ success: true, message: `FreeLLM online (${latency}ms, HTTP ${pingRes.status})`, latency });
        } else {
          res.json({ success: false, message: `FreeLLM returned HTTP ${pingRes.status} ${pingRes.statusText}` });
        }
      } catch (fErr: any) {
        res.json({ success: false, message: `FreeLLM connection error: ${fErr.message || 'Timeout/unreachable'}` });
      }
      return;
    }

    if (service === 'image_gen') {
      const urlStr = dbService.getPlatformApiSetting('IMAGE_GEN_URL') || process.env.IMAGE_GEN_URL || 'https://ai-image.ayushbhai1818.workers.dev/';
      try {
        const pingRes = await fetch(urlStr, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        const latency = Date.now() - startTime;
        res.json({ success: true, message: `Image generator reachable (${latency}ms, HTTP ${pingRes.status})`, latency });
      } catch (iErr: any) {
        res.json({ success: false, message: `Image generator notice: ${iErr.message || 'Unreachable'}. System will use custom category vector card renderer.` });
      }
      return;
    }

    if (service === 'database') {
      const stats = dbService.getDatabaseStats();
      const latency = Date.now() - startTime;
      res.json({ success: true, message: `SQLite database healthy! Read latency: ${latency}ms`, stats });
      return;
    }

    res.json({ success: true, message: `Service ${service} acknowledged.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Test failed' });
  }
});

apiRouter.post('/admin/database/vacuum', (_req: Request, res: Response): void => {
  try {
    const result = dbService.vacuumDatabase();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Vacuum failed' });
  }
});

apiRouter.post('/admin/impersonate', (req: Request, res: Response): void => {
  try {
    const { companyId } = req.body;
    if (!companyId) {
      res.status(400).json({ success: false, error: 'companyId is required.' });
      return;
    }
    const company = dbService.getCompanyById(companyId);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found.' });
      return;
    }
    const users = dbService.getAllUsersAcrossPlatform().filter(u => u.companyId === companyId);
    const ceo = users.find(u => u.role === 'CEO') || users[0] || {
      id: `usr-${company.id}-admin`,
      companyId: company.id,
      name: `${company.name} Administrator`,
      loginId: company.email,
      role: 'CEO' as Role,
      status: 'active',
      department: 'Executive',
      permissions: 'Full Administration',
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
    };

    res.json({
      success: true,
      company,
      user: ceo
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Impersonation failed' });
  }
});

// Multer error & file validation error boundary middleware
apiRouter.use((err: any, _req: Request, res: Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, error: `File size exceeds the maximum limit of ${maxUploadMb}MB.` });
      return;
    }
    res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
    return;
  }
  if (err && err.message && err.message.includes('Invalid document type')) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }
  next(err);
});



