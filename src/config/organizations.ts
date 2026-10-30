import type { Role } from '../types/index.ts';

export interface RolePostingScope {
  role: Role;
  title: string;
  allowedScope: string[];
  prohibitedActions: string[];
  approvalRequirement?: string;
  guidelinesPrompt: string;
}

export interface OrganizationConfig {
  id: string;
  name: string;
  tagline: string;
  industry: string;
  description: string;
  companyContext: string;
  supportedServiceCategories: string[];
  allowedContentTopics: string[];
  restrictedContentTopics: string[];
  approvedFactsAndClaims: string[];
  unsupportedClaimsPolicy: string;
  brandVoice: {
    tone: string;
    style: string;
    vocabularyRecommendations: string[];
    prohibitedPatterns: string[];
  };
  roles: Record<Role, RolePostingScope>;
}

export const NOVA_UNLIMITED_CONFIG: OrganizationConfig = {
  id: 'org-nova-unlimited',
  name: 'Nova Unlimited',
  tagline: 'High-Performance Server Infrastructure & Hosting Services',
  industry: 'Server and hosting services',
  description: 'Enterprise and developer cloud infrastructure, VPS nodes, dedicated bare-metal servers, and managed hosting environments.',
  companyContext: 'Nova Unlimited is a company that provides server and hosting-related services. Its content should be relevant to the company\'s actual services, technical offerings, hosting products, customer needs, service updates, and legitimate business activities.',
  supportedServiceCategories: [
    'Managed Server Hosting & Infrastructure Ops',
    'Cloud Virtual Private Servers (VPS)',
    'Dedicated Bare-Metal Server Compute',
    'Infrastructure Networking & DDoS Mitigation',
    'Automated Snapshots, Storage & Disaster Recovery',
    'Server Health Monitoring & Performance Tuning',
    'Developer APIs & Automated Provisioning Workflows'
  ],
  allowedContentTopics: [
    'Hosting and server architecture best practices',
    'VPS and dedicated server deployments and scaling',
    'Cloud infrastructure performance benchmarks and resource allocation',
    'Server security, kernel patching, Linux administration, and network hardening',
    'Company service updates, maintenance windows, and infrastructure improvements',
    'Hosting educational tutorials, sysadmin guides, and customer best practices',
    'Network reliability, latency optimization, and disaster recovery advice'
  ],
  restrictedContentTopics: [
    'Entertainment, gaming memes, pop culture references, and lifestyle commentary',
    'Cryptocurrency speculative trading, coin drops, or token sales',
    'Personal political views or contentious social and societal debates',
    'Consumer electronics or personal gadgets unrelated to servers/data centers',
    'Unrelated sports, celebrity news, or general viral trends'
  ],
  approvedFactsAndClaims: [
    'Nova Unlimited provides server infrastructure and hosting services.',
    'Nova Unlimited offers dedicated servers, cloud VPS, and managed server environments.',
    'Nova Unlimited maintains continuous infrastructure monitoring and network security best practices.',
    'Nova Unlimited supports scalable compute resources for developer and enterprise workloads.'
  ],
  unsupportedClaimsPolicy: 'Do NOT declare unsupported claims as false automatically. Flag any specific unverified numbers (e.g., 100% uptime, 99.999% SLA, unlisted pricing, unverified hardware models, or unapproved certifications) for verification with code UNSUPPORTED_CLAIM.',
  brandVoice: {
    tone: 'Authoritative, technically precise, objective, transparent, and supportive.',
    style: 'Direct, clear, and professional without marketing hyperbole, unverifiable promises, or buzzword fluff.',
    vocabularyRecommendations: [
      'high-throughput', 'redundancy', 'infrastructure resilience', 'compute node',
      'low latency', 'packet filtering', 'bare-metal compute', 'provisioning'
    ],
    prohibitedPatterns: [
      '100% uptime guaranteed (unless officially verified)',
      'Cheapest hosting on earth',
      'Unverified speed or award claims',
      'Absolute guarantees of zero downtime or impenetrable security'
    ]
  },
  roles: {
    Employee: {
      role: 'Employee',
      title: 'Product Focus & Technical Accuracy',
      allowedScope: [
        'Technical tutorials and how-to guides for server administration',
        'Hosting documentation, FAQs, and developer tips',
        'Customer troubleshooting guidance and best practices',
        'Explanations of standard hosting concepts and server performance metrics'
      ],
      prohibitedActions: [
        'Committing to specific pricing, promotional discounts, or commercial contracts',
        'Announcing company-wide policy, governance, or legal positions',
        'Announcing unreleased product roadmaps or unannounced commercial plans',
        'Promising custom SLA guarantees or enterprise liability waivers'
      ],
      approvalRequirement: 'Commercial pricing quotes or official company policy changes require Manager or Administrator signoff.',
      guidelinesPrompt: `Role: Employee (Nova Unlimited)
- Scope: Technical tutorials, server management tips, documentation, and customer best practices.
- Restrictions: You cannot publish pricing commitments, enterprise quotes, company-wide policy shifts, or executive positions.
- Fact Policy: Only discuss approved hosting capabilities. Flag unsupported claims for verification.`
    },
    Manager: {
      role: 'Manager',
      title: 'Leadership & Operational Integrity',
      allowedScope: [
        'Departmental updates and operational milestones',
        'Service enhancements and infrastructure maintenance notices',
        'Approved marketing campaigns and customer success spotlights',
        'Team hiring announcements and operational achievements'
      ],
      prohibitedActions: [
        'Unilateral enterprise pricing changes without executive signoff',
        'Unverified corporate-wide policy shifts or legal statements',
        'Unapproved corporate financial disclosures or acquisition remarks'
      ],
      approvalRequirement: 'Major corporate policy overhauls or unannounced enterprise deals require Administrator approval.',
      guidelinesPrompt: `Role: Manager (Nova Unlimited)
- Scope: Operational announcements, maintenance windows, campaign updates, and team achievements.
- Restrictions: Avoid unilateral enterprise pricing alterations or unverified corporate policy shifts.
- Fact Policy: Ensure statements are grounded in verified operations and verified metrics.`
    },
    Administrator: {
      role: 'Administrator',
      title: 'Brand Standards & Corporate Governance',
      allowedScope: [
        'Organization-wide communications and strategic brand positioning',
        'Executive announcements and corporate policy updates',
        'Official service agreements, high-level roadmaps, and company milestones'
      ],
      prohibitedActions: [
        'Making unsupported factual or technical claims (e.g., claiming 100% uptime without verified documentation). Admin privileges do not override factual verification rules.'
      ],
      approvalRequirement: 'All external factual assertions must still be verifiable against infrastructure records.',
      guidelinesPrompt: `Role: Administrator (Nova Unlimited)
- Scope: Organization-wide announcements, executive updates, and corporate brand positioning.
- Boundaries: High authority, but MUST strictly uphold factual integrity. Administrative status does NOT permit unsupported factual claims (e.g. 100% uptime without proof).`
    },
    CEO: {
      role: 'CEO',
      title: 'Executive Vision & Organizational Authority',
      allowedScope: [
        'Corporate strategy, investor updates, executive vision',
        'Company-wide announcements and overarching brand positioning',
        'High-level partnership initiatives and corporate milestones'
      ],
      prohibitedActions: [
        'Making unverified regulatory or compliance assertions without legal review',
        'Absolute guarantees of zero downtime or impenetrable security'
      ],
      approvalRequirement: 'Autonomous executive authority; self-governing under BrandLens verification.',
      guidelinesPrompt: `Role: CEO (Nova Unlimited)
- Scope: Visionary announcements, corporate milestones, company identity, and governance.
- Boundaries: Supreme workspace governance authority while maintaining factual and brand integrity.`
    },
    HOD: {
      role: 'HOD',
      title: 'Head of Department & Operational Governance',
      allowedScope: [
        'Cross-functional department policies, operational workflows, and team roadmaps',
        'Departmental releases, technical architectures, and service upgrades',
        'Reviewing and endorsing team posts prior to executive escalation'
      ],
      prohibitedActions: [
        'Unapproved company-wide financial disclosures',
        'Committing external contractual obligations without executive clearance'
      ],
      approvalRequirement: 'Departmental authority; major corporate policy changes require CEO signoff.',
      guidelinesPrompt: `Role: HOD (Nova Unlimited)
- Scope: Departmental announcements, team workflows, architectural standards, and operational reviews.
- Boundaries: Manage department compliance and approve technical disclosures.`
    }
  }
};

export const BOBBI_BROWN_QA_CONFIG: OrganizationConfig = {
  id: 'comp-bobbi-brown-qa',
  name: 'Bobbi Brown (QA Test Fixture)',
  tagline: 'Authentic Beauty, Complexion Perfection & Artistry',
  industry: 'Cosmetics & Beauty (Hypothetical QA Fixture)',
  description: 'HYPOTHETICAL QA FIXTURE: Prestige cosmetics and skincare test workspace. Focus on natural beauty, complexion perfection, undertone accuracy, and clean makeup application.',
  companyContext: 'HYPOTHETICAL TEST FIXTURE: Bobbi Brown test workspace provides prestige cosmetics and skincare focused on natural complexion, skin-true undertones, and empowering artistry. Do NOT make medical, clinical cure, or drug claims.',
  supportedServiceCategories: [
    'Prestige Foundation & Complexion Products',
    'Hydrating Skincare Primers & Bases',
    'Lip Color & Multi-Use Cheek Formulations',
    'Long-Wear Eye Makeup & Artistry Tools',
    'Professional Shade Matching & Consultations'
  ],
  allowedContentTopics: [
    'Complexion and foundation shade matching guides',
    'Undertone identification and seamless blending tips',
    'Skin-first makeup tutorials and clean application techniques',
    'Breathable long-wear makeup wear tests and reviews',
    'Artistry masterclasses, beauty routines, and seasonal looks',
    'Hydration and healthy-looking radiant skin finishes'
  ],
  restrictedContentTopics: [
    'Server infrastructure, cloud hosting, and data center technology',
    'Cryptocurrency speculative trading or token sales',
    'Political campaigns and controversial societal debates',
    'Unrelated gaming, esports, or personal tech hardware',
    'Exaggerated medical or pharmaceutical claims'
  ],
  approvedFactsAndClaims: [
    'Bobbi Brown (QA Test Fixture) provides prestige cosmetics and skincare.',
    'Formulas emphasize natural skin finish, true-to-skin undertones, and breathable wear.',
    'Skin Long-Wear Weightless Foundation offers natural matte coverage.',
    'Vitamin Enriched Face Base provides rich hydration for smooth makeup prep.'
  ],
  unsupportedClaimsPolicy: 'Do NOT allow unverified clinical or medical claims. Flag any claims of permanent wrinkle eradication, 100% cure for skin diseases, or prescription-drug efficacy with code UNSUPPORTED_CLAIM.',
  brandVoice: {
    tone: 'Sophisticated, empowering, authentic, clean, and artistry-guided.',
    style: 'Skin-first, refined, and timeless without hype or exaggerated promises.',
    vocabularyRecommendations: [
      'skin-true', 'natural matte', 'undertone matching', 'breathable wear',
      'radiant finish', 'artistry', 'healthy glow', 'weightless formula'
    ],
    prohibitedPatterns: [
      'Erases wrinkles permanently',
      '100% cure for acne',
      'Instant anti-aging miracle',
      'Reverses aging overnight'
    ]
  },
  roles: {
    Employee: {
      role: 'Employee',
      title: 'Beauty Advisor & Artistry Content',
      allowedScope: [
        'Makeup tutorials, shade matching tips, and application techniques',
        'Product demonstrations and swatches with approved terminology',
        'Client beauty FAQs and clean beauty routine tips'
      ],
      prohibitedActions: [
        'Announcing promotional discounts or commercial contract pricing',
        'Making unilateral corporate announcements or policy changes',
        'Asserting medical, clinical, or pharmacological claims'
      ],
      approvalRequirement: 'Commercial sales pricing and partnership deals require Manager or CEO signoff.',
      guidelinesPrompt: 'Role: Employee (Bobbi Brown QA)\n- Scope: Beauty tutorials, shade matching, application guides.\n- Restrictions: Cannot announce pricing discounts or unverified medical claims.'
    },
    Manager: {
      role: 'Manager',
      title: 'Marketing & Editorial Governance',
      allowedScope: [
        'Seasonal beauty campaigns, editorial features, and community updates',
        'Product launch highlights and beauty masterclass announcements',
        'Reviewing team beauty tutorials for brand voice compliance'
      ],
      prohibitedActions: [
        'Authorizing unverified medical or dermatological claims',
        'Unapproved corporate financial or acquisition statements'
      ],
      approvalRequirement: 'Major product line launches require HOD or CEO approval.',
      guidelinesPrompt: 'Role: Manager (Bobbi Brown QA)\n- Scope: Campaign announcements, editorial direction, content review.\n- Restrictions: Uphold brand elegance and regulatory cosmetic compliance.'
    },
    Administrator: {
      role: 'Administrator',
      title: 'Brand Standards & Corporate Governance',
      allowedScope: [
        'Company-wide cosmetics brand positioning and executive communications',
        'Global brand guidelines, shade library updates, and compliance standards'
      ],
      prohibitedActions: [
        'Making unsupported dermatological or clinical claims'
      ],
      approvalRequirement: 'High authority under BrandLens factual integrity review.',
      guidelinesPrompt: 'Role: Administrator (Bobbi Brown QA)\n- Scope: Organization-wide announcements and brand identity.'
    },
    CEO: {
      role: 'CEO',
      title: 'Executive Vision & Organizational Authority',
      allowedScope: [
        'Corporate strategy, executive vision, and brand philosophy',
        'High-level partnership initiatives and major corporate milestones'
      ],
      prohibitedActions: [
        'Making unverified regulatory or drug efficacy assertions'
      ],
      approvalRequirement: 'Autonomous executive authority.',
      guidelinesPrompt: 'Role: CEO (Bobbi Brown QA)\n- Scope: Visionary brand direction and corporate milestones.'
    },
    HOD: {
      role: 'HOD',
      title: 'Head of Artistry & Product Compliance',
      allowedScope: [
        'Artistry masterclasses, technical formulation reviews, and shade development',
        'Reviewing product claims against cosmetics regulatory standards'
      ],
      prohibitedActions: [
        'Unapproved corporate financial disclosures'
      ],
      approvalRequirement: 'Artistry and product signoff authority.',
      guidelinesPrompt: 'Role: HOD (Bobbi Brown QA)\n- Scope: Artistry standards and product integrity.'
    }
  }
};

// Registry of organizations (designed for extensibility when future organizations are added)
const ORGANIZATIONS_REGISTRY: Record<string, OrganizationConfig> = {
  [NOVA_UNLIMITED_CONFIG.id]: NOVA_UNLIMITED_CONFIG,
  [BOBBI_BROWN_QA_CONFIG.id]: BOBBI_BROWN_QA_CONFIG
};

export function getOrganizationConfig(orgId?: string): OrganizationConfig {
  if (orgId && ORGANIZATIONS_REGISTRY[orgId]) {
    return ORGANIZATIONS_REGISTRY[orgId];
  }
  return NOVA_UNLIMITED_CONFIG;
}

export function getAllOrganizations(): OrganizationConfig[] {
  return Object.values(ORGANIZATIONS_REGISTRY);
}

