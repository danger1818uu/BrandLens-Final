import React, { useState, useEffect } from 'react';
import { Platform, ConnectedAccount, PlatformConfigStatus } from '../../types';
import { apiClient } from '../../services/api';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Power,
  Trash2,
  Key,
  ShieldCheck,
  Info,
  Loader2
} from 'lucide-react';

interface ConnectedAccountsViewProps {
  username: string;
}

export const ConnectedAccountsView: React.FC<ConnectedAccountsViewProps> = ({ username }) => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [configs, setConfigs] = useState<PlatformConfigStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch accounts and server configuration readiness
  const loadData = async () => {
    try {
      setLoading(true);
      const [accs, cfgs] = await Promise.all([
        apiClient.fetchConnectedAccounts(),
        apiClient.fetchPlatformConfigs()
      ]);
      setAccounts(accs);
      setConfigs(cfgs);
    } catch (err: any) {
      console.error('Failed to load accounts/configs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for OAuth postMessage from popup window
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setStatusMessage({
          text: `Successfully connected ${event.data.platform || 'social'} account!`,
          type: 'success'
        });
        loadData();
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleConnect = async (platform: Platform, mode?: string) => {
    setActionLoading(`connect-${platform}${mode ? `-${mode}` : ''}`);
    setStatusMessage(null);
    try {
      const url = await apiClient.getAuthUrl(platform, mode);
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        url,
        `brandlens_oauth_${platform.toLowerCase()}`,
        `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
      );

      if (!authWindow) {
        setStatusMessage({
          text: 'Popup was blocked by your browser. Please allow popups for this site.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.message || `Failed to initiate ${platform} connection.`,
        type: 'error'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (accId: string, platform: Platform) => {
    if (!window.confirm(`Are you sure you want to disconnect your ${platform} account?`)) return;

    setActionLoading(`disconnect-${accId}`);
    try {
      await apiClient.disconnectAccount(accId);
      setStatusMessage({
        text: `Disconnected ${platform} account.`,
        type: 'success'
      });
      loadData();
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to disconnect account.',
        type: 'error'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (accId: string, currentActive: boolean) => {
    try {
      await apiClient.toggleAccount(accId, !currentActive);
      loadData();
    } catch (err) {
      console.error('Failed to toggle account:', err);
    }
  };

  const platforms: Platform[] = ['LinkedIn', 'Instagram', 'X'];

  return (
    <div className="max-w-5xl mx-auto space-y-8 page-enter pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white/[0.025] border border-white/10 rounded-xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[rgba(166,139,255,0.15)] text-[#c9beff] border border-[rgba(166,139,255,0.3)] font-medium">
              NOVA UNLIMITED
            </span>
            <span className="text-xs font-mono text-[#828392]">· Multi-Channel Governance</span>
          </div>
          <h2 className="text-lg sm:text-xl font-medium text-white tracking-tight uppercase font-mono">
            Connected Social Accounts
          </h2>
          <p className="text-xs sm:text-[13px] text-[#9a9aa8]">
            Manage authorized social publishing integrations, OAuth credentials, and direct publishing channels.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="text-xs font-mono text-[#a0a0b0] hover:text-white flex items-center gap-2 px-3.5 py-2 rounded bg-white/5 border border-white/10 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[#a68bff]' : ''} />
          <span>Refresh Accounts</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-lg border text-xs sm:text-sm font-mono flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[#9090a0] hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Platform Account Cards */}
      <div className="space-y-6">
        {platforms.map((plat) => {
          const connectedAcc = accounts.find((a) => a.platform === plat);
          const config = configs.find((c) => c.platform === plat);
          const isConfigured = Boolean(config?.isConfigured);
          const computedCallbackUrl = config?.redirectUri || `${window.location.origin}/api/auth/callback/${plat.toLowerCase()}`;

          return (
            <div
              key={plat}
              className="bg-[rgba(14,15,22,0.85)] border border-white/15 rounded-xl p-6 sm:p-7 space-y-6 shadow-xl backdrop-blur-xl"
            >
              {/* Top Row: Platform Identity & Connection Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center font-mono font-bold text-white text-base">
                    {plat === 'LinkedIn' && <span className="text-[#9cecff]">in</span>}
                    {plat === 'Instagram' && <span className="text-[#ff9cd9]">ig</span>}
                    {plat === 'X' && <span className="text-white">𝕏</span>}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white font-mono flex items-center gap-2">
                      {plat}
                      {connectedAcc && (
                        <span className="text-xs font-mono text-[#a68bff] font-normal">
                          {connectedAcc.accountIdentifier}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#828392]">
                      {plat === 'LinkedIn' && 'Professional articles, company updates & rich media.'}
                      {plat === 'Instagram' && 'High-impact images and visual service highlights.'}
                      {plat === 'X' && 'Real-time server announcements & technical community updates.'}
                    </p>
                  </div>
                </div>

                {/* Status Badges & Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  {connectedAcc ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Connected</span>
                      </span>

                      {/* Active toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggle(connectedAcc.id, connectedAcc.isActive)}
                        className={`p-1.5 rounded border transition-colors ${
                          connectedAcc.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                            : 'bg-white/5 border-white/10 text-[#727382] hover:text-white'
                        }`}
                        title={connectedAcc.isActive ? 'Channel active for publishing' : 'Channel paused'}
                      >
                        <Power size={14} />
                      </button>

                      {/* Disconnect */}
                      <button
                        type="button"
                        disabled={actionLoading === `disconnect-${connectedAcc.id}`}
                        onClick={() => handleDisconnect(connectedAcc.id, plat)}
                        className="p-1.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
                        title="Disconnect account"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : isConfigured ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={actionLoading === `connect-${plat}`}
                        onClick={() => handleConnect(plat)}
                        className="btn-primary-glow flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono font-medium bg-[rgba(166,139,255,0.25)] hover:bg-[rgba(166,139,255,0.4)] text-white border border-[rgba(166,139,255,0.6)] shadow-[0_0_15px_rgba(166,139,255,0.2)] transition-all cursor-pointer"
                        title={plat === 'Instagram' ? 'Connect with Instagram Publishing Scopes' : undefined}
                      >
                        {actionLoading === `connect-${plat}` ? (
                          <Loader2 size={13} className="animate-spin text-[#c9beff]" />
                        ) : (
                          <Share2 size={13} className="text-[#c9beff]" />
                        )}
                        <span>Connect {plat} ↗</span>
                      </button>

                      {plat === 'Instagram' && (
                        <button
                          type="button"
                          disabled={actionLoading === `connect-${plat}-basic`}
                          onClick={() => handleConnect(plat, 'basic')}
                          className="px-3.5 py-2 rounded-md text-xs font-mono text-[#a4e6cf] hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Instant connect using standard Meta profile (avoids Invalid Scopes error)"
                        >
                          {actionLoading === `connect-${plat}-basic` ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={13} />
                          )}
                          <span>Quick Connect (Basic)</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Key size={13} className="text-amber-400" />
                      <span>Setup required</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Connected Account Details (if connected) */}
              {connectedAcc && (
                <div className="p-4 rounded-lg bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-[#828392]">AUTHORIZED PROFILE</div>
                    <div className="text-sm font-medium text-white font-mono">
                      {connectedAcc.accountName} ({connectedAcc.accountIdentifier})
                    </div>
                    <div className="text-xs font-mono text-[#a4e6cf]">
                      Active for direct publishing · Verified OAuth token stored securely
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConnect(plat)}
                    className="text-xs font-mono text-[#c9beff] hover:text-white px-3 py-1.5 rounded bg-white/5 border border-white/10 transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    Reconnect Channel ↗
                  </button>
                </div>
              )}

              {/* In-App Setup Guide & Computed Callback URLs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#a0a0b2] uppercase tracking-wider font-medium">
                    OAuth Callback URL & Setup Checklist
                  </span>
                  <span className="text-[11px] font-mono text-[#727382]">
                    {isConfigured ? '✓ Credentials detected' : '⚠️ Missing server credentials'}
                  </span>
                </div>

                {/* Computed Callback Box */}
                <div className="space-y-2">
                  <div className="p-3 bg-black/50 border border-white/10 rounded-lg flex items-center justify-between gap-3">
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="text-[10px] font-mono text-[#828392] uppercase">
                        Valid OAuth Redirect URI (for Facebook Login / OAuth Settings):
                      </div>
                      <code className="text-xs font-mono text-[#c9beff] truncate block">
                        {computedCallbackUrl}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyUrl(computedCallbackUrl)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors cursor-pointer"
                    >
                      {copiedUrl === computedCallbackUrl ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} className="text-[#a0a0b0]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {plat === 'Instagram' && config?.appDomain && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-3 bg-black/50 border border-white/10 rounded-lg flex items-center justify-between gap-2">
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="text-[10px] font-mono text-[#ffb6bd] uppercase font-medium">
                            Meta App Domain (Fixes "Can't load URL"):
                          </div>
                          <code className="text-xs font-mono text-[#e0e0ec] truncate block">
                            {config.appDomain}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(config.appDomain!)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                        >
                          {copiedUrl === config.appDomain ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} className="text-[#a0a0b0]" />
                          )}
                        </button>
                      </div>

                      <div className="p-3 bg-black/50 border border-white/10 rounded-lg flex items-center justify-between gap-2">
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="text-[10px] font-mono text-[#a4e6cf] uppercase font-medium">
                            Meta Website Site URL:
                          </div>
                          <code className="text-xs font-mono text-[#e0e0ec] truncate block">
                            {config.siteUrl || `${window.location.origin}/`}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(config.siteUrl || `${window.location.origin}/`)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                        >
                          {copiedUrl === (config.siteUrl || `${window.location.origin}/`) ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} className="text-[#a0a0b0]" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step-by-step setup guide */}
                {config?.instructions && (
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 space-y-3">
                    <div className="text-xs font-mono text-[#d0d0df] font-medium flex items-center gap-1.5">
                      <Info size={13} className="text-[#a68bff]" />
                      <span>Configuration steps for {plat}:</span>
                    </div>
                    <ol className="text-xs font-sans text-[#b0b0c2] space-y-1.5 list-decimal list-inside pl-1">
                      {config.instructions.map((inst, i) => (
                        <li key={i} className="leading-relaxed">
                          {inst}
                        </li>
                      ))}
                    </ol>

                    {plat === 'Instagram' && (
                      <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-amber-300 font-mono font-medium">
                          <AlertTriangle size={14} />
                          <span>Fixing Meta "Invalid Scopes" Error:</span>
                        </div>
                        <p className="text-[#d0d0df] leading-relaxed">
                          If Meta says <em>"Invalid Scopes: instagram_basic, instagram_content_publish..."</em>, those permissions have not been added to your app yet in the Meta portal:
                        </p>
                        <ul className="text-[#b0b0c2] list-disc list-inside space-y-1 pl-1">
                          <li><strong>Option 1 (Quick):</strong> Click <strong>Quick Connect (Basic)</strong> above to connect immediately without adding advanced permissions.</li>
                          <li><strong>Option 2 (Publishing):</strong> In Meta Developer Dashboard, go to <strong>App Review → Permissions and Features</strong> (or <strong>Use cases</strong>), find <code>instagram_basic</code> and <code>instagram_content_publish</code>, and click <strong>Add</strong>.</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
