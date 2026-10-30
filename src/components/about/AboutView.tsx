import React from 'react';
import { ShieldCheck, HelpCircle, ArrowLeft, ArrowUpRight, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

interface AboutViewProps {
  onNavigateToHelp?: () => void;
  onNavigateToDashboard?: () => void;
  onClose?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  onNavigateToHelp,
  onNavigateToDashboard,
  onClose,
}) => {
  return (
    <div className="about-page-wrap page-enter">
      {/* Top action navigation if opened as guest or from dashboard */}
      {(onClose || onNavigateToDashboard) && (
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose || onNavigateToDashboard}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#a4a3b2] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>{onClose ? 'Back to Overview' : 'Back to Workspace'}</span>
          </button>
          <div className="text-[10px] font-mono tracking-widest text-[#777587]">
            BRANDLENS / SPECIFICATION
          </div>
        </div>
      )}

      {/* ========================================================
          HERO HEADER
          ======================================================== */}
      <header className="about-hero-header">
        <div className="about-eyebrow">
          <span>03 / GOVERNANCE ARCHITECTURE</span>
        </div>
        <h1 className="about-title">
          About BrandLens &amp; <span className="accent">Governance.</span>
        </h1>
        <p className="about-subtitle">
          An intelligent brand governance workspace engineered to maintain identity integrity,
          service relevance, and role responsibility across all communications.
        </p>
      </header>

      {/* ========================================================
          SECTION A: BRANDLENS — GOVERNANCE WITH CONTEXT
          ======================================================== */}
      <section className="mb-14">
        <div className="section-tag">SECTION A / THE PRODUCT</div>
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white font-mono mb-3">
          Governance with context.
        </h2>
        <p className="text-sm sm:text-base text-[#a4a3b2] leading-relaxed max-w-3xl font-light">
          BrandLens is an AI-powered brand governance workspace that helps teams review content against
          their company's identity, service relevance, assigned roles, and applicable guidelines
          before publication.
        </p>

        {/* 3 Visually Distinct Concepts */}
        <div className="about-concepts-grid">
          {/* Concept 1 */}
          <div className="about-concept-card">
            <div className="about-concept-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9cecff] shadow-[0_0_8px_#9cecff]" />
              <span>01 / BUSINESS SCOPE</span>
            </div>
            <h3 className="about-concept-title">Company relevance</h3>
            <p className="about-concept-desc">
              Content should relate to the organization's actual business and approved activities.
              Eliminates off-topic commentary, unsupported buzzwords, and distractions.
            </p>
          </div>

          {/* Concept 2 */}
          <div className="about-concept-card">
            <div className="about-concept-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b39bff] shadow-[0_0_8px_#b39bff]" />
              <span>02 / TEAM SCOPE</span>
            </div>
            <h3 className="about-concept-title">Role-aware governance</h3>
            <p className="about-concept-desc">
              Each person should communicate within their assigned responsibilities and permissions.
              Protects teams from accidental commitments or premature executive disclosures.
            </p>
          </div>

          {/* Concept 3 */}
          <div className="about-concept-card">
            <div className="about-concept-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9ce6c5] shadow-[0_0_8px_#9ce6c5]" />
              <span>03 / QUALITY SCOPE</span>
            </div>
            <h3 className="about-concept-title">Content integrity</h3>
            <p className="about-concept-desc">
              Review meaningful issues, understand suggested corrections, and verify claims against
              available company information before words leave the draft state.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION B: CURRENT ORGANIZATION (NOVA UNLIMITED)
          ======================================================== */}
      <section className="mb-14">
        <div className="section-tag">SECTION B / ACTIVE WORKSPACE</div>
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white font-mono mb-3">
          Configured organization.
        </h2>

        <div className="about-org-card">
          <div className="about-org-grid">
            {/* Left Column: Organization Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded border border-[rgba(190,174,255,0.4)] bg-[rgba(141,115,211,0.15)] flex items-center justify-center text-[#9cecff]">
                  <Cpu size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-[#b39bff] uppercase">
                    Configured Company
                  </div>
                  <div className="text-xl font-mono font-semibold text-white">
                    Nova Unlimited
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#8a8999] uppercase tracking-wider block mb-1">
                  Industry Focus
                </span>
                <span className="text-sm font-medium text-[#f4f3f8]">
                  Server and hosting services.
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#8a8999] uppercase tracking-wider block mb-1">
                  Contextual Review Scope
                </span>
                <p className="text-xs sm:text-sm text-[#a4a3b2] leading-relaxed font-light">
                  Nova Unlimited is the currently configured organization in BrandLens. Its content
                  reviews use the company's available hosting/server context, configured guidelines,
                  approved facts, and user role.
                </p>
              </div>
            </div>

            {/* Right Column: Architectural Boundary Clarification */}
            <div className="p-5 rounded bg-black/40 border border-white/10 space-y-3">
              <div className="text-[10px] font-mono tracking-wider text-[#9ce6c5] uppercase flex items-center gap-2">
                <ShieldCheck size={14} />
                <span>ARCHITECTURAL SEPARATION</span>
              </div>
              <p className="text-xs text-[#9d9baa] leading-relaxed">
                BrandLens is the <span className="text-white font-medium">governance product</span>.
                Nova Unlimited is the <span className="text-white font-medium">company currently configured inside it</span>.
              </p>
              <div className="text-[11px] font-mono text-[#757588] border-t border-white/[0.08] pt-3 space-y-1">
                <div>• Review context: Hosting, cloud computing, server uptime, virtualization.</div>
                <div>• Guideline status: Starter configuration active.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION C: ROLE GUIDELINES (EMPLOYEE, MANAGER, ADMIN)
          ======================================================== */}
      <section className="mb-14">
        <div className="section-tag">SECTION C / ROLE MATRICES</div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white font-mono">
              Role guidelines.
            </h2>
            <p className="text-xs sm:text-sm text-[#8a8999] font-mono mt-1">
              Current Nova Unlimited starter guidelines (configured per organization).
            </p>
          </div>
        </div>

        <div className="about-roles-grid">
          {/* Employee Card */}
          <div className="about-role-card employee">
            <div className="about-role-header">
              <div className="about-role-tag text-[#b39bff]">ROLE 01 — TECHNICAL &amp; OPS</div>
              <h3 className="about-role-title">Employee</h3>
            </div>
            <ul className="about-role-list">
              <li>Product-level and operational communications within assigned authority.</li>
              <li>Accurate descriptions of available hosting services.</li>
              <li>Technical and customer guidance supported by verified information.</li>
              <li>Escalate commercial commitments and official announcements that require higher authorization.</li>
            </ul>
          </div>

          {/* Manager Card */}
          <div className="about-role-card manager">
            <div className="about-role-header">
              <div className="about-role-tag text-[#9cecff]">ROLE 02 — INITIATIVES &amp; TEAMS</div>
              <h3 className="about-role-title">Manager</h3>
            </div>
            <ul className="about-role-list">
              <li>Hosting campaigns, team initiatives, project updates, and management-level communications within assigned authority.</li>
              <li>Use supported company facts and approved claims.</li>
              <li>Respect company-wide approval requirements and commercial restrictions.</li>
            </ul>
          </div>

          {/* Administrator Card */}
          <div className="about-role-card admin">
            <div className="about-role-header">
              <div className="about-role-tag text-[#9ce6c5]">ROLE 03 — CORPORATE &amp; BRAND</div>
              <h3 className="about-role-title">Administrator</h3>
            </div>
            <ul className="about-role-list">
              <li>Organization-wide announcements, approved corporate messaging, and brand-level communications within assigned authority.</li>
              <li>Follow company policy and use verified organizational information.</li>
              <li>Do not treat administrator status as permission to invent facts or bypass mandatory policies.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION D: GOVERNANCE WORKFLOW (VISUAL PIPELINE)
          ======================================================== */}
      <section className="mb-14">
        <div className="section-tag">SECTION D / THE PIPELINE</div>
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white font-mono mb-2">
          Governance workflow.
        </h2>
        <p className="text-xs sm:text-sm text-[#a4a3b2] max-w-2xl font-light">
          A continuous, verified sequence connecting draft composition to ready-for-publishing status.
        </p>

        {/* Compact 6-Stage Visual Flow */}
        <div className="about-flow-container">
          <div className="about-flow-card">
            <div className="about-flow-step">STEP 01</div>
            <h4 className="about-flow-name">Draft</h4>
            <p className="about-flow-desc">Author content, title, and optional visual server media.</p>
          </div>

          <div className="about-flow-card">
            <div className="about-flow-step">STEP 02</div>
            <h4 className="about-flow-name">Company Relevance</h4>
            <p className="about-flow-desc">Confirm alignment with hosting &amp; server business domain.</p>
          </div>

          <div className="about-flow-card">
            <div className="about-flow-step">STEP 03</div>
            <h4 className="about-flow-name">Role Scope</h4>
            <p className="about-flow-desc">Verify statement authority against assigned role.</p>
          </div>

          <div className="about-flow-card">
            <div className="about-flow-step">STEP 04</div>
            <h4 className="about-flow-name">Content Review</h4>
            <p className="about-flow-desc">Check tone, verified claims, and issue severity.</p>
          </div>

          <div className="about-flow-card">
            <div className="about-flow-step">STEP 05</div>
            <h4 className="about-flow-name">Fix &amp; Recheck</h4>
            <p className="about-flow-desc">Apply focused AI corrections and re-evaluate draft.</p>
          </div>

          <div className="about-flow-card border-emerald-400/40 bg-emerald-950/15">
            <div className="about-flow-step text-emerald-300">STEP 06</div>
            <h4 className="about-flow-name text-emerald-200">Ready to Post</h4>
            <p className="about-flow-desc">All checks verified. Distinct from published status.</p>
          </div>
        </div>

        {/* Clear status distinction callout */}
        <div className="mt-5 p-4 rounded bg-white/[0.02] border border-white/[0.08] flex items-start gap-3">
          <AlertCircle size={16} className="text-[#9cecff] shrink-0 mt-0.5" />
          <div className="text-xs text-[#9d9baa] leading-relaxed">
            <span className="text-white font-medium">Status Distinction: </span>
            <span className="text-emerald-300 font-mono">Ready to Post</span> indicates that the
            content has passed internal governance checks. <span className="text-[#c8bbff] font-mono">Posted</span> occurs
            only after actual dispatch through an authorized connected social account or manual confirmation.
            <em className="block text-[#7a7888] font-light mt-1">
              Note: AI approval is not equivalent to official company legal or corporate authorization.
            </em>
          </div>
        </div>
      </section>

      {/* ========================================================
          FINISHING TOUCHES & HELP LINK
          ======================================================== */}
      <footer className="pt-10 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-center sm:text-left">
          <div className="text-xs font-mono text-white tracking-wide">
            “AI-assisted review. Human-informed decisions. Better-aligned content.”
          </div>
          <div className="text-[11px] font-mono text-[#777587] mt-1">
            BrandLens · Clarity in every impression.
          </div>
        </div>

        {onNavigateToHelp && (
          <button
            type="button"
            onClick={onNavigateToHelp}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-white/[0.03] hover:bg-white/[0.06] border border-[rgba(166,139,255,0.3)] hover:border-[rgba(166,139,255,0.6)] text-[#c9beff] hover:text-white text-xs font-mono transition-all cursor-pointer"
          >
            <span>Have questions? Ask Help Assistant</span>
            <ArrowUpRight size={14} />
          </button>
        )}
      </footer>
    </div>
  );
};
