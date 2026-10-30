import type { Platform } from '../../src/types/index.ts';
import { encryptToken, decryptToken } from '../encryption.ts';
import { dbService } from '../db.ts';
import path from 'node:path';
import fs from 'node:fs';

const SOCIAL_TIMEOUT_MS = 15000;

export interface SocialConfigInfo {
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

export function getAppBaseUrl(req?: { protocol: string; get: (header: string) => string | undefined }): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  if (process.env.SHARED_APP_URL) {
    return process.env.SHARED_APP_URL.replace(/\/$/, '');
  }
  if (req) {
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }
  return 'http://localhost:3000';
}

export function getPlatformConfig(platform: Platform, req?: any): SocialConfigInfo {
  const baseUrl = getAppBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/callback/${platform.toLowerCase()}`;
  let appDomain = '';
  try {
    appDomain = new URL(baseUrl).hostname;
  } catch (e) {
    appDomain = baseUrl.replace(/^https?:\/\//, '').split('/')[0];
  }

  switch (platform) {
    case 'Instagram': {
      const clientId = process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID || '';
      const clientSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || '';
      return {
        platform: 'Instagram',
        isConfigured: Boolean(clientId && clientSecret),
        clientIdConfigured: Boolean(clientId),
        clientSecretConfigured: Boolean(clientSecret),
        redirectUri,
        appDomain,
        siteUrl: `${baseUrl}/`,
        requiredScopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'],
        instructions: [
          'In Meta for Developers (developers.facebook.com), open your app dashboard.',
          'Go to App Settings > Basic in the left navigation sidebar.',
          `Step 1 (Add Platform): Scroll down, click "+ Add Platform", select "Website", and enter Site URL: ${baseUrl}/`,
          `Step 2 (App Domains): In the "App Domains" input, add: ${appDomain}`,
          `Step 3 (Valid OAuth Redirect URI): Under Facebook Login (or Use Cases > Authentication) > Settings, enter: ${redirectUri}`,
          'Step 4: Click "Save Changes" at the bottom of the page in Meta Dashboard.'
        ]
      };
    }
    case 'LinkedIn': {
      const clientId = process.env.LINKEDIN_CLIENT_ID || '';
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
      return {
        platform: 'LinkedIn',
        isConfigured: Boolean(clientId && clientSecret),
        clientIdConfigured: Boolean(clientId),
        clientSecretConfigured: Boolean(clientSecret),
        redirectUri,
        requiredScopes: ['openid', 'profile', 'email', 'w_member_social'],
        instructions: [
          'Log in to LinkedIn Developer Portal (linkedin.com/developers).',
          'Create or select an application and request "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect".',
          `Add Authorized redirect URL: ${redirectUri}`,
          'Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to your environment variables in AI Studio.'
        ]
      };
    }
    case 'X': {
      const clientId = process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || '';
      const clientSecret = process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || '';
      return {
        platform: 'X',
        isConfigured: Boolean(clientId && clientSecret),
        clientIdConfigured: Boolean(clientId),
        clientSecretConfigured: Boolean(clientSecret),
        redirectUri,
        requiredScopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        instructions: [
          'Log in to X Developer Portal (developer.x.com).',
          'Under User Authentication Settings, select OAuth 2.0 (Confidential Client / Web App).',
          `Add Callback / Redirect URL: ${redirectUri}`,
          'Set permissions to "Read and write".',
          'Add X_CLIENT_ID and X_CLIENT_SECRET to your environment variables in AI Studio.'
        ]
      };
    }
  }
}

export function buildOAuthUrl(platform: Platform, req: any, organizationId = 'org-nova-unlimited'): { url?: string; error?: string } {
  const config = getPlatformConfig(platform, req);
  if (!config.isConfigured) {
    return {
      error: `Server credentials for ${platform} are not yet configured in environment variables. Follow the in-app setup guide.`
    };
  }

  const state = Buffer.from(JSON.stringify({ platform, organizationId, ts: Date.now() })).toString('base64url');

  if (platform === 'LinkedIn') {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      redirect_uri: config.redirectUri,
      state,
      scope: config.requiredScopes.join(' ')
    });
    return { url: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}` };
  }

  if (platform === 'Instagram') {
    const clientId = process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID!;
    const requestedMode = req?.query?.mode || req?.query?.scope;

    let scopes: string[] = [];
    if (requestedMode === 'basic' || requestedMode === 'public_profile') {
      scopes = ['public_profile'];
    } else if (process.env.META_SCOPES) {
      scopes = process.env.META_SCOPES.split(',').map((s: string) => s.trim());
    } else {
      // By default request public_profile plus publishing permissions if configured
      scopes = ['public_profile', ...config.requiredScopes];
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: config.redirectUri,
      state,
      scope: scopes.join(','),
      response_type: 'code'
    });
    return { url: `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}` };
  }

  if (platform === 'X') {
    const clientId = process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID!;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: config.redirectUri,
      scope: config.requiredScopes.join(' '),
      state,
      code_challenge: 'challenge', // In production PKCE is paired
      code_challenge_method: 'plain'
    });
    return { url: `https://twitter.com/i/oauth2/authorize?${params.toString()}` };
  }

  return { error: `Unsupported platform: ${platform}` };
}

export async function exchangeOAuthCode(
  platform: Platform,
  code: string,
  req: any,
  organizationId = 'org-nova-unlimited'
): Promise<{ success: boolean; account?: any; error?: string }> {
  const config = getPlatformConfig(platform, req);
  if (!config.isConfigured) {
    return { success: false, error: `${platform} credentials are not configured.` };
  }

  try {
    if (platform === 'LinkedIn') {
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange LinkedIn code for access token');
      }

      // Fetch user profile
      const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userRes.json();

      const accountName = userData.name || `${userData.given_name || ''} ${userData.family_name || ''}`.trim() || 'Nova Unlimited LinkedIn';
      const accountIdentifier = userData.sub ? `urn:li:person:${userData.sub}` : '@nova_unlimited';

      const account = dbService.saveConnectedAccount({
        id: `acc-linkedin-${Date.now()}`,
        organizationId,
        platform: 'LinkedIn',
        accountIdentifier,
        accountName,
        accountAvatar: userData.picture || null,
        accessTokenEnc: encryptToken(tokenData.access_token),
        refreshTokenEnc: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        scopes: config.requiredScopes
      });

      return { success: true, account };
    }

    if (platform === 'X') {
      const clientId = process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID!;
      const clientSecret = process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET!;
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri,
          code_verifier: 'challenge'
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange X authorization code');
      }

      // Fetch user profile
      const userRes = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userRes.json();
      const accountName = userData?.data?.name || 'Nova Unlimited X';
      const accountIdentifier = userData?.data?.username ? `@${userData.data.username}` : '@nova_unlimited';

      const account = dbService.saveConnectedAccount({
        id: `acc-x-${Date.now()}`,
        organizationId,
        platform: 'X',
        accountIdentifier,
        accountName,
        accountAvatar: userData?.data?.profile_image_url || null,
        accessTokenEnc: encryptToken(tokenData.access_token),
        refreshTokenEnc: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        scopes: config.requiredScopes
      });

      return { success: true, account };
    }

    if (platform === 'Instagram') {
      const clientId = process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID!;
      const clientSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET!;

      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(config.redirectUri)}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error?.message || 'Failed to exchange Meta authorization code');
      }

      let accountName = 'Nova Unlimited Instagram';
      let accountIdentifier = '@nova_hosting';
      let accountAvatar: string | null = null;

      try {
        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,picture&access_token=${tokenData.access_token}`);
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.name) accountName = meData.name;
          if (meData.picture?.data?.url) accountAvatar = meData.picture.data.url;
          if (meData.id) accountIdentifier = `@${meData.id}`;
        }

        const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=name,instagram_business_account{id,username,profile_picture_url}&access_token=${tokenData.access_token}`);
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          const igPage = pagesData?.data?.find((p: any) => p.instagram_business_account);
          if (igPage?.instagram_business_account) {
            const ig = igPage.instagram_business_account;
            if (ig.username) accountIdentifier = `@${ig.username}`;
            if (ig.profile_picture_url) accountAvatar = ig.profile_picture_url;
            if (igPage.name) accountName = `${igPage.name} (Instagram)`;
          }
        }
      } catch (err) {
        console.warn('Could not fetch expanded Meta profile details:', err);
      }

      const account = dbService.saveConnectedAccount({
        id: `acc-instagram-${Date.now()}`,
        organizationId,
        platform: 'Instagram',
        accountIdentifier,
        accountName,
        accountAvatar,
        accessTokenEnc: encryptToken(tokenData.access_token),
        scopes: config.requiredScopes
      });

      return { success: true, account };
    }

    return { success: false, error: 'Platform not supported.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'OAuth exchange failed.' };
  }
}

// Concurrency lock to prevent duplicate concurrent publishing
const publishingLocks = new Set<string>();

export async function publishPostDirect(params: {
  postId: string;
  actorUsername: string;
  organizationId?: string;
  req?: any;
}): Promise<{
  success: boolean;
  publishedUrl?: string;
  platformPostId?: string;
  errorMessage?: string;
}> {
  const { postId, actorUsername, organizationId = 'org-nova-unlimited' } = params;

  // 1. Lock check
  if (publishingLocks.has(postId)) {
    return {
      success: false,
      errorMessage: 'Publishing is already in progress for this post. Please wait.'
    };
  }
  publishingLocks.add(postId);

  const attemptId = `pub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  try {
    const post = dbService.getPostById(postId);
    if (!post) {
      return { success: false, errorMessage: 'Post record not found.' };
    }

    // 2. Pre-publish validation
    if (post.status === 'posted') {
      return { success: false, errorMessage: 'This post has already been posted to the platform.' };
    }

    if (post.status !== 'ready_to_post') {
      return {
        success: false,
        errorMessage: 'Post is not in "Ready to Post" status. Run and pass governance review first.'
      };
    }

    // Platform character validation
    const charLimits: Record<Platform, number> = {
      LinkedIn: 3000,
      Instagram: 2200,
      X: 280
    };
    if (post.caption.length > charLimits[post.platform]) {
      return {
        success: false,
        errorMessage: `Post content exceeds ${post.platform}'s character limit of ${charLimits[post.platform]} characters (current: ${post.caption.length}).`
      };
    }

    // Media format validation
    if (post.mediaType === 'pdf' && (post.platform === 'Instagram' || post.platform === 'X')) {
      return {
        success: false,
        errorMessage: `${post.platform} does not support PDF media attachments. Only Images and Videos are permitted.`
      };
    }

    // 3. Check connected account
    const connectedAcc = dbService.getConnectedAccountByPlatform(post.platform, organizationId);
    if (!connectedAcc || !connectedAcc.isActive) {
      dbService.createPublishingAttempt({
        id: attemptId,
        postId,
        platform: post.platform,
        accountId: null
      });
      dbService.updatePublishingAttempt(attemptId, {
        attemptStatus: 'failed',
        errorMessage: `No active connected account found for ${post.platform}. Please connect your account in Connected Accounts.`
      });
      dbService.createActivity(
        postId,
        actorUsername,
        'publish_failed',
        `Direct publishing aborted: No active connected account for ${post.platform}.`
      );
      return {
        success: false,
        errorMessage: `No active connected account found for ${post.platform}. Please connect your official ${post.platform} profile in the Connected Accounts tab.`
      };
    }

    // Record pending attempt
    dbService.createPublishingAttempt({
      id: attemptId,
      postId,
      platform: post.platform,
      accountId: connectedAcc.id
    });

    const decryptedToken = decryptToken(connectedAcc.accessTokenEnc);
    if (!decryptedToken) {
      throw new Error(`Failed to decrypt authorized credentials for ${post.platform}. Please reconnect the account.`);
    }

    let platformPostId = '';
    let platformPostUrl = '';

    // Dispatch to platform APIs
    if (post.platform === 'X') {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${decryptedToken}`
        },
        body: JSON.stringify({
          text: `${post.title ? post.title + '\n\n' : ''}${post.caption}`.trim()
        }),
        signal: AbortSignal.timeout(SOCIAL_TIMEOUT_MS)
      });

      const tweetData = await response.json();
      if (!response.ok || !tweetData?.data?.id) {
        throw new Error(tweetData?.detail || tweetData?.title || `X API returned error (${response.status})`);
      }

      platformPostId = tweetData.data.id;
      platformPostUrl = `https://twitter.com/i/web/status/${platformPostId}`;
    } else if (post.platform === 'LinkedIn') {
      const sub = connectedAcc.accountIdentifier.startsWith('urn:li:')
        ? connectedAcc.accountIdentifier
        : `urn:li:person:${connectedAcc.accountIdentifier.replace('@', '')}`;

      const response = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${decryptedToken}`,
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify({
          author: sub,
          commentary: `${post.title ? post.title + '\n\n' : ''}${post.caption}`.trim(),
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: []
          },
          lifecycleState: 'PUBLISHED'
        }),
        signal: AbortSignal.timeout(SOCIAL_TIMEOUT_MS)
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`LinkedIn Posts API returned error (${response.status}): ${errBody.substring(0, 150)}`);
      }

      const postUrn = response.headers.get('x-restli-id') || `urn:li:share:${Date.now()}`;
      platformPostId = postUrn;
      platformPostUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}`;
    } else if (post.platform === 'Instagram') {
      // Instagram feed posts require an image or video
      if (!post.mediaRef) {
        throw new Error(
          'Instagram requires an image or video attachment for all feed posts. Please attach media in the editor or click "Record Manual Post" to confirm publication.'
        );
      }

      // Resolve the media URL into a publicly reachable URL
      const baseUrl = getAppBaseUrl(params.req);
      let publicMediaUrl = post.mediaRef;
      if (!publicMediaUrl.startsWith('http://') && !publicMediaUrl.startsWith('https://')) {
        const cleanRef = publicMediaUrl.startsWith('/') ? publicMediaUrl : `/${publicMediaUrl}`;
        publicMediaUrl = `${baseUrl}${cleanRef}`;
      }

      // Meta servers cannot reach localhost or 127.0.0.1
      if (publicMediaUrl.includes('localhost') || publicMediaUrl.includes('127.0.0.1')) {
        throw new Error(
          `Instagram direct publishing requires a publicly reachable image URL. Your environment URL (${baseUrl}) is running locally, which Meta's servers cannot access to download media. Please use "Record Manual Post" to mark this post as published, or configure APP_URL with a public domain.`
        );
      }

      // Look up linked Instagram Business / Professional account
      let igUserId = '';
      let pageAccessToken = decryptedToken;

      try {
        const meAccountsRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(decryptedToken)}`
        );
        if (meAccountsRes.ok) {
          const meAccountsData = await meAccountsRes.json();
          if (Array.isArray(meAccountsData?.data)) {
            for (const page of meAccountsData.data) {
              if (page.instagram_business_account?.id) {
                igUserId = page.instagram_business_account.id;
                if (page.access_token) {
                  pageAccessToken = page.access_token;
                }
                break;
              }
            }
          }
        }
      } catch (lookupErr) {
        console.warn('Error querying Meta accounts:', lookupErr);
      }

      if (!igUserId) {
        let fbName = '';
        try {
          const meRes = await fetch(
            `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(decryptedToken)}`,
            { signal: AbortSignal.timeout(SOCIAL_TIMEOUT_MS) }
          );
          if (meRes.ok) {
            const meData = await meRes.json();
            fbName = meData.name || meData.id;
          }
        } catch (_) {}

        throw new Error(
          `No Instagram Business account was found linked to your Meta profile${fbName ? ` (${fbName})` : ''}. Instagram direct API publishing requires an Instagram Professional account connected to a Facebook Page. You can post directly on Instagram, then click "Record Manual Post" to confirm.`
        );
      }

      // Step 1: Create Instagram Media Container
      const isVideo = post.mediaType === 'video';
      const containerParams = new URLSearchParams();
      if (isVideo) {
        containerParams.append('media_type', 'VIDEO');
        containerParams.append('video_url', publicMediaUrl);
      } else {
        containerParams.append('image_url', publicMediaUrl);
      }
      containerParams.append('caption', `${post.title ? post.title + '\n\n' : ''}${post.caption}`.trim());
      containerParams.append('access_token', pageAccessToken);

      const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
        method: 'POST',
        body: containerParams,
        signal: AbortSignal.timeout(SOCIAL_TIMEOUT_MS)
      });

      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData?.id) {
        const errMsg = containerData?.error?.message || `Failed to create Instagram media container (HTTP ${containerRes.status})`;
        throw new Error(`Instagram API container creation error: ${errMsg}. You can use "Record Manual Post" to confirm publication.`);
      }

      const creationId = containerData.id;

      if (isVideo) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // Step 2: Publish Media Container
      const publishParams = new URLSearchParams();
      publishParams.append('creation_id', creationId);
      publishParams.append('access_token', pageAccessToken);

      const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
        method: 'POST',
        body: publishParams,
        signal: AbortSignal.timeout(SOCIAL_TIMEOUT_MS)
      });

      const publishData = await publishRes.json();
      if (!publishRes.ok || !publishData?.id) {
        const errMsg = publishData?.error?.message || `Failed to publish Instagram media container (HTTP ${publishRes.status})`;
        throw new Error(`Instagram API publishing error: ${errMsg}`);
      }

      platformPostId = publishData.id;
      platformPostUrl = `https://www.instagram.com/p/${platformPostId}`;
    }

    // 4. Record success
    dbService.updatePublishingAttempt(attemptId, {
      attemptStatus: 'success',
      platformPostId,
      platformPostUrl
    });

    // Mark post as posted ONLY upon verified platform API confirmation!
    dbService.markPostPosted(postId, actorUsername);
    dbService.createActivity(
      postId,
      actorUsername,
      'published',
      `Directly published to ${post.platform} via connected account ${connectedAcc.accountIdentifier} (Post ID: ${platformPostId})`
    );

    return {
      success: true,
      platformPostId,
      publishedUrl: platformPostUrl
    };
  } catch (err: any) {
    dbService.updatePublishingAttempt(attemptId, {
      attemptStatus: 'failed',
      errorMessage: err.message || 'Direct publishing failed.'
    });

    dbService.createActivity(
      postId,
      actorUsername,
      'publish_failed',
      `Publishing attempt failed: ${err.message || 'Unknown error'}`
    );

    return {
      success: false,
      errorMessage: err.message || 'Failed to publish post to social platform.'
    };
  } finally {
    publishingLocks.delete(postId);
  }
}
