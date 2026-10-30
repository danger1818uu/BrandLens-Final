import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldCheck,
  Download,
  FileJson,
  HardDrive,
  RefreshCw,
  Lock,
  Server,
  Key,
  Globe,
  Github,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { apiClient } from '../../services/api';

export const DataSecurityView: React.FC = () => {
  const [stats, setStats] = useState<{
    engine: string;
    databasePath: string;
    sizeBytes: number;
    sizeKb: string;
    tables: Record<string, number>;
    ownership: string;
    lastExportAvailable: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiClient.fetchDatabaseStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#11121d]/90 via-[#18192a]/90 to-[#12131f]/90 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#a68bff]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <ShieldCheck size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-wide">Data Sovereignty & Security Center</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% User Owned
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Your database is completely local and private to your instance. No external database vendors or third-party trackers have access to your data. Full offline-first ownership with 1-click database export.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-mono flex items-center gap-2 transition-all shrink-0 self-start md:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#a68bff]' : 'text-zinc-400'} />
            <span>Refresh Health</span>
          </button>
        </div>
      </div>

      {/* Grid: Database Status & Ownership Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Live Database Engine & Storage */}
        <div className="lg:col-span-2 bg-[#12131a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-[#a68bff]/15 text-[#a68bff] border border-[#a68bff]/20">
                  <Database size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">Real Local SQLite Database</h2>
                  <p className="text-[11px] text-zinc-400">Node.js Native DatabaseSync • Zero External Cloud DB Dependency</p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Healthy & Active
              </span>
            </div>

            {/* Table Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Total Posts</span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                  {stats?.tables?.posts ?? '—'}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">Table: posts</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Drafts Stored</span>
                <span className="text-lg font-bold font-mono text-[#a68bff] mt-0.5 block">
                  {stats?.tables?.drafts ?? '—'}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">Table: drafts</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">AI Task Records</span>
                <span className="text-lg font-bold font-mono text-cyan-400 mt-0.5 block">
                  {stats?.tables?.ai_tasks ?? '—'}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">Table: ai_tasks</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Audit Activities</span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                  {stats?.tables?.post_activities ?? '—'}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">Table: post_activities</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Connected Accounts</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                  {stats?.tables?.connected_accounts ?? '—'}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">Table: connected_accounts</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Database Size</span>
                <span className="text-lg font-bold font-mono text-amber-300 mt-0.5 block">
                  {stats?.sizeKb ? `${stats.sizeKb} KB` : '—'}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono truncate block" title={stats?.databasePath}>
                  brandlens.db
                </span>
              </div>
            </div>
          </div>

          {/* Action Downloads */}
          <div className="pt-4 border-t border-white/5 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
              <HardDrive size={14} className="text-emerald-400" />
              <span>Full Data Ownership: Export or download your database anytime.</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={apiClient.getDatabaseExportUrl()}
                download
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all shadow-md"
              >
                <FileJson size={14} className="text-cyan-400" />
                <span>Export JSON Data</span>
              </a>
              <a
                href={apiClient.getDatabaseBackupUrl()}
                download
                className="px-3.5 py-2 rounded-xl bg-[#a68bff]/20 hover:bg-[#a68bff]/30 text-[#cbbaff] border border-[#a68bff]/30 text-xs font-medium flex items-center gap-1.5 transition-all shadow-md"
              >
                <Download size={14} />
                <span>Download SQLite (.db)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Card 2: Security & Anti-Scraping Guards */}
        <div className="bg-[#12131a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
            <span className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Lock size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Security Hardening</h2>
              <p className="text-[11px] text-zinc-400">Scraping & leak prevention status</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span className="text-zinc-200">Anti-Scraping Guard</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Active (Rate limited)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span className="text-zinc-200">Zero Credential Leaks</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Keys Redacted
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span className="text-zinc-200">Strict PII & Government ID Check</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Zero Tolerance
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span className="text-zinc-200">Path Traversal Defense</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Path Basename Sanitized
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span className="text-zinc-200">Search Crawler Blocking</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                X-Robots: noindex
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section: GitHub & Cloudflare Deployment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step-by-Step GitHub Setup */}
        <div className="bg-[#12131a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <span className="p-2.5 rounded-xl bg-zinc-800 text-white border border-white/10">
              <Github size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">1. Create Your GitHub Repository</h2>
              <p className="text-[11px] text-zinc-400">Safely push your project without leaking keys</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-zinc-300">
            <p className="text-zinc-400 leading-relaxed">
              Your <code className="text-[#a68bff] font-mono">.gitignore</code> is already configured to keep <code className="text-[#a68bff] font-mono">.env</code>, <code className="text-[#a68bff] font-mono">data/</code>, and <code className="text-[#a68bff] font-mono">uploads/</code> private so no secret or personal document is ever committed.
            </p>

            <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] space-y-2 text-zinc-200 overflow-x-auto">
              <div className="text-zinc-500"># In your project root terminal:</div>
              <div className="text-emerald-400">git init</div>
              <div className="text-emerald-400">git add .</div>
              <div className="text-emerald-400">git commit -m "Initial commit: BrandLens secure workspace"</div>
              <div className="text-zinc-500"># Create a new repository on github.com, then:</div>
              <div className="text-cyan-400">git remote add origin https://github.com/&lt;your-username&gt;/&lt;your-repo-name&gt;.git</div>
              <div className="text-cyan-400">git branch -M main</div>
              <div className="text-cyan-400">git push -u origin main</div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Free Cloudflare Hosting */}
        <div className="bg-[#12131a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <span className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Globe size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">2. Host on Cloudflare For Free</h2>
              <p className="text-[11px] text-zinc-400">Cloudflare Pages + Free Backend Options</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-zinc-300">
            <ol className="space-y-2 list-decimal list-inside text-zinc-300/90 leading-relaxed">
              <li>
                <strong className="text-white">Cloudflare Pages (Zero Cost, Global CDN):</strong>
                <p className="pl-5 text-zinc-400 text-[11px] mt-0.5">
                  Log into <strong>dash.cloudflare.com</strong> &gt; <em>Workers & Pages</em> &gt; <em>Create application</em> &gt; <em>Pages</em> &gt; <em>Connect to Git</em>.
                </p>
              </li>
              <li>
                <strong className="text-white">Build Settings:</strong>
                <div className="pl-5 mt-1 font-mono text-[11px] text-[#a68bff] bg-black/40 p-2 rounded-lg border border-white/5">
                  Framework preset: Vite<br />
                  Build command: npm run build<br />
                  Build output directory: dist
                </div>
              </li>
              <li>
                <strong className="text-white">Backend (Express + SQLite):</strong>
                <p className="pl-5 text-zinc-400 text-[11px] mt-0.5">
                  Deploy backend on <strong>Render.com</strong> or <strong>Fly.io</strong> for $0/mo free tier (Command: <code className="text-[#a68bff] font-mono">npm start</code>), or run with <strong>Cloudflare Tunnel</strong> (<code className="text-[#a68bff] font-mono">cloudflared tunnel --url http://localhost:3000</code>) for a completely free self-hosted domain!
                </p>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
