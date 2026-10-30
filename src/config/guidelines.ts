import { Role } from '../types';
import { getOrganizationConfig } from './organizations';

export interface RoleGuidelineConfig {
  role: Role;
  title: string;
  focus: string;
  rules: string[];
  promptContext: string;
}

export function getRoleGuideline(role: Role, orgId?: string): RoleGuidelineConfig {
  const org = getOrganizationConfig(orgId);
  const roleConfig = org.roles[role] || org.roles.Employee;

  return {
    role,
    title: roleConfig.title,
    focus: `${org.name} (${org.industry}) — ${roleConfig.allowedScope[0] || 'Domain-specific posting'}`,
    rules: [
      ...roleConfig.allowedScope.map(s => `Permitted: ${s}`),
      ...roleConfig.prohibitedActions.map(p => `Prohibited: ${p}`),
      `Policy: ${org.unsupportedClaimsPolicy}`
    ],
    promptContext: roleConfig.guidelinesPrompt
  };
}
