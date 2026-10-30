import { dbService } from '../server/db.ts';
import { aiService } from '../server/ai.ts';

async function runVerification() {
  console.log('=== BRANDLENS END-TO-END VERIFICATION & AUDIT SUITE ===\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASS: ${testName}`);
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    }
  }

  // TEST 1: Tenant Companies Existence & Distinct Configurations
  console.log('[1] Multi-Company Isolation & Persistence');
  const novaComp = dbService.getCompanyById('org-nova-unlimited');
  const bbComp = dbService.getCompanyById('comp-bobbi-brown-qa');

  assert(Boolean(novaComp && novaComp.id === 'org-nova-unlimited'), 'Nova Unlimited company exists in SQLite DB');
  assert(Boolean(bbComp && bbComp.id === 'comp-bobbi-brown-qa'), 'Bobbi Brown QA test fixture company exists in SQLite DB');
  assert(novaComp?.category === 'Technology', 'Nova Unlimited is categorized as Technology');
  assert(bbComp?.category === 'Cosmetics', 'Bobbi Brown QA fixture is categorized as Cosmetics');

  // TEST 2: Role Authentication & Account Isolation
  console.log('\n[2] Authentication & Role Isolation');
  const novaCeoAuth = dbService.authenticateUser('novaunlimited0@gmail.com', 'ceo123');
  const novaEmpAuth = dbService.authenticateUser('employee@novaunlimited.test', 'employee123');
  const bbCeoAuth = dbService.authenticateUser('ceo@bobbibrown.qa.test', 'ceo123');
  const bbEmpAuth = dbService.authenticateUser('employee.makeup@bobbibrown.qa.test', 'employee123');

  assert(Boolean(novaCeoAuth && novaCeoAuth.user.role === 'CEO' && novaCeoAuth.company.id === 'org-nova-unlimited'), 'Nova CEO authenticates with isolated companyId');
  assert(Boolean(novaEmpAuth && novaEmpAuth.user.role === 'Employee' && novaEmpAuth.company.id === 'org-nova-unlimited'), 'Nova Employee authenticates with isolated companyId');
  assert(Boolean(bbCeoAuth && bbCeoAuth.user.role === 'CEO' && bbCeoAuth.company.id === 'comp-bobbi-brown-qa'), 'Bobbi Brown CEO authenticates with isolated companyId');
  assert(Boolean(bbEmpAuth && bbEmpAuth.user.role === 'Employee' && bbEmpAuth.company.id === 'comp-bobbi-brown-qa'), 'Bobbi Brown Employee authenticates with isolated companyId');

  // Check wrong password
  const badAuth = dbService.authenticateUser('novaunlimited0@gmail.com', 'wrongpassword');
  assert(badAuth === null, 'Invalid credentials rejected by secure hash verifier');

  // TEST 3: Company AI Prompts Generation & Versioning
  console.log('\n[3] Compact AI Prompt Generation & Tenant Versioning');
  const initialNovaPrompt = dbService.getCompanyAIPrompt('org-nova-unlimited');
  const initialBbPrompt = dbService.getCompanyAIPrompt('comp-bobbi-brown-qa');

  assert(Boolean(initialNovaPrompt && initialNovaPrompt.generationStatus === 'current'), 'Nova Unlimited has active compact prompt');
  assert(Boolean(initialBbPrompt && initialBbPrompt.generationStatus === 'current'), 'Bobbi Brown has active compact prompt');
  assert(
    Boolean(initialNovaPrompt?.compactCompanyContext.includes('Nova') || initialNovaPrompt?.compactCompanyContext.includes('infrastructure')),
    'Nova prompt reflects server hosting domain'
  );
  assert(
    Boolean(initialBbPrompt?.compactCompanyContext.includes('Bobbi Brown') || initialBbPrompt?.compactCompanyContext.includes('cosmetics') || initialBbPrompt?.compactCompanyContext.includes('skincare')),
    'Bobbi Brown prompt reflects cosmetics & skin-true domain'
  );

  // Update Bobbi Brown Guidelines and verify ONLY Bobbi Brown prompt is regenerated
  console.log('\n[4] CEO Guidelines Saving & Independent Prompt Regeneration');
  const prevNovaConfigVer = initialNovaPrompt?.configurationVersion || 0;
  const prevBbConfigVer = initialBbPrompt?.configurationVersion || 0;

  const bbGuidelinesBundle = dbService.getCompanyGuidelines('comp-bobbi-brown-qa');
  const updatedBundle = {
    ...bbGuidelinesBundle,
    companyWide: bbGuidelinesBundle.companyWide + '\n- Extra guideline test: Emphasize undertone accuracy and zero medical claims.'
  };

  const saveRes = dbService.saveCompanyGuidelines('comp-bobbi-brown-qa', updatedBundle);
  const updatedBbCompany = dbService.getCompanyById('comp-bobbi-brown-qa')!;
  
  // Trigger prompt update
  const newPromptData = await aiService.generateCompactPrompts(updatedBbCompany, saveRes.bundle);
  const savedBbPrompt = dbService.saveCompanyAIPrompt('comp-bobbi-brown-qa', {
    ...newPromptData,
    sourceProfileVersion: updatedBbCompany.profileVersion,
    sourceGuidelinesVersion: saveRes.newVersion
  });

  const currentNovaPrompt = dbService.getCompanyAIPrompt('org-nova-unlimited');

  assert(Boolean(savedBbPrompt.configurationVersion > prevBbConfigVer), 'Bobbi Brown prompt configuration version incremented on save');
  assert(Boolean(savedBbPrompt.sourceGuidelinesVersion === saveRes.newVersion), 'Bobbi Brown prompt references updated guideline version');
  assert(Boolean(currentNovaPrompt?.configurationVersion === prevNovaConfigVer), 'Nova Unlimited prompt version UNTOUCHED by Bobbi Brown update (Tenant Isolation confirmed)');

  // TEST 5: Cross-Company AI Content Review Behavior
  console.log('\n[5] Cross-Company AI Governance Evaluation');

  // Nova Unlimited Review: Server hosting post should pass
  const novaTechCheck = await aiService.checkText({
    title: 'Optimizing Cloud Server Latency for Kubernetes Deployments',
    caption: 'Learn our sysadmin best practices for Linux kernel tuning, NVMe storage caching, and node resource allocation on Nova Unlimited VPS infrastructure.',
    platform: 'LinkedIn',
    role: 'Employee',
    orgId: 'org-nova-unlimited'
  });
  assert(Boolean(novaTechCheck.data?.companyRelevance?.status === 'pass'), 'Nova hosting content passes company relevance check');

  // Nova Unlimited Review: Off-topic lipstick review should fail with OFF_TOPIC
  const novaOffTopicCheck = await aiService.checkText({
    title: 'Top 5 Lip Gloss Shades for Autumn Glow',
    caption: 'Here are our favorite matte lipstick swatches for natural dewy beauty finish.',
    platform: 'LinkedIn',
    role: 'Employee',
    orgId: 'org-nova-unlimited'
  });
  assert(Boolean(novaOffTopicCheck.data?.companyRelevance?.status === 'fail'), 'Off-topic beauty content fails on Nova Unlimited workspace');
  assert(Boolean(novaOffTopicCheck.data?.structuredIssues?.some(i => i.code === 'OFF_TOPIC')), 'Off-topic issue generated with code OFF_TOPIC');

  // Nova Unlimited Review: 100% uptime claim should trigger UNSUPPORTED_CLAIM
  const novaGuaranteeCheck = await aiService.checkText({
    title: 'Our New VPS Guarantee',
    caption: 'We promise 100% uptime guaranteed forever on every cloud instance with zero downtime ever.',
    platform: 'LinkedIn',
    role: 'Employee',
    orgId: 'org-nova-unlimited'
  });
  assert(
    Boolean(novaGuaranteeCheck.data?.structuredIssues?.some(i => i.code === 'UNSUPPORTED_CLAIM')),
    'Unverified 100% uptime guarantee flagged with code UNSUPPORTED_CLAIM for Nova Unlimited'
  );

  // Bobbi Brown Review: Cosmetics post should pass
  const bbCosmeticsCheck = await aiService.checkText({
    title: 'Finding Your Skin-True Undertone',
    caption: 'Discover shade matching techniques with our Skin Long-Wear Weightless Foundation for a breathable natural matte finish.',
    platform: 'LinkedIn',
    role: 'Employee',
    orgId: 'comp-bobbi-brown-qa'
  });
  assert(Boolean(bbCosmeticsCheck.data?.companyRelevance?.status === 'pass'), 'Beauty content passes on Bobbi Brown QA workspace');

  // Bobbi Brown Review: Server hosting post should fail with OFF_TOPIC
  const bbHostingCheck = await aiService.checkText({
    title: 'Linux Kernel 6.8 Patch for Bare-Metal Nodes',
    caption: 'Deploying high performance cloud compute clusters on dedicated bare metal servers.',
    platform: 'LinkedIn',
    role: 'Employee',
    orgId: 'comp-bobbi-brown-qa'
  });
  assert(Boolean(bbHostingCheck.data?.companyRelevance?.status === 'fail'), 'Server compute content fails on Bobbi Brown QA workspace');

  // Bobbi Brown Review: Permanent wrinkle erasure should trigger UNSUPPORTED_CLAIM
  const bbWrinkleCheck = await aiService.checkText({
    title: 'Miracle Skin Cure',
    caption: 'Our face cream erases wrinkles permanently and cures acne overnight with guaranteed 100% allergy-free formula.',
    platform: 'LinkedIn',
    role: 'Employee',
    orgId: 'comp-bobbi-brown-qa'
  });
  assert(
    Boolean(bbWrinkleCheck.data?.structuredIssues?.some(i => i.code === 'UNSUPPORTED_CLAIM')),
    'Permanent wrinkle erasure claim flagged with code UNSUPPORTED_CLAIM for Bobbi Brown QA fixture'
  );

  // TEST 6: AI Text Enhancement Distinct Personalization
  console.log('\n[6] AI Text Enhancement Distinct Personalization');
  const novaEnhance = await aiService.enhanceText({
    text: 'Our cloud servers guarantee 100% uptime and unhackable security.',
    role: 'Employee',
    platform: 'LinkedIn',
    orgId: 'org-nova-unlimited'
  });
  assert(
    Boolean(novaEnhance.enhancedText && !novaEnhance.enhancedText.includes('100% uptime')),
    'Nova enhancement replaces unverified 100% uptime with verified high-availability terminology'
  );

  const bbEnhance = await aiService.enhanceText({
    text: 'Our foundation erases wrinkles permanently and gives a nice look.',
    role: 'Employee',
    platform: 'LinkedIn',
    orgId: 'comp-bobbi-brown-qa'
  });
  assert(
    Boolean(bbEnhance.enhancedText && !bbEnhance.enhancedText.includes('erases wrinkles permanently')),
    'Bobbi Brown enhancement replaces permanent wrinkle claims with skin-true texture benefits'
  );

  // TEST 7: AI Image Generation Prompt Synthesis
  console.log('\n[7] Image Prompt Generation & Distinct Visual Direction');
  const novaImg = await aiService.generateImage({
    title: 'Next Gen Compute',
    caption: 'High density datacenter servers',
    role: 'Employee',
    platform: 'LinkedIn',
    orgId: 'org-nova-unlimited'
  });
  assert(Boolean(novaImg.prompt && novaImg.prompt.length >= 200 && novaImg.prompt.length <= 450), 'Nova visual prompt within target length (200-450 chars)');
  assert(Boolean(novaImg.prompt?.toLowerCase().includes('server') || novaImg.prompt?.toLowerCase().includes('data center')), 'Nova visual prompt directs server infrastructure photography');
  assert(Boolean(novaImg.mediaRef && novaImg.mediaRef.startsWith('/uploads/')), 'Nova image generation produced real media asset in /uploads');

  const bbImg = await aiService.generateImage({
    title: 'Weightless Foundation Campaign',
    caption: 'Natural matte complexion in morning light',
    role: 'Employee',
    platform: 'LinkedIn',
    orgId: 'comp-bobbi-brown-qa'
  });
  assert(Boolean(bbImg.prompt && bbImg.prompt.length >= 200 && bbImg.prompt.length <= 450), 'Bobbi Brown visual prompt within target length (200-450 chars)');
  assert(Boolean(bbImg.prompt?.toLowerCase().includes('cosmetic') || bbImg.prompt?.toLowerCase().includes('skin') || bbImg.prompt?.toLowerCase().includes('bottle')), 'Bobbi Brown visual prompt directs beauty cosmetics photography');
  assert(Boolean(bbImg.mediaRef && bbImg.mediaRef.startsWith('/uploads/')), 'Bobbi Brown image generation produced real media asset in /uploads');

  // TEST 8: Posts & Publishing Isolation
  console.log('\n[8] Posts Table Isolation & Status Transitions');
  const novaPosts = dbService.getPostsByCompanyAndAuthor('org-nova-unlimited');
  const bbPosts = dbService.getPostsByCompanyAndAuthor('comp-bobbi-brown-qa');

  assert(novaPosts.every(p => p.organizationId === 'org-nova-unlimited'), 'All Nova query results strictly belong to org-nova-unlimited');
  assert(bbPosts.every(p => p.organizationId === 'comp-bobbi-brown-qa'), 'All Bobbi Brown query results strictly belong to comp-bobbi-brown-qa');

  console.log(`\n=== VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===`);
  if (passedTests === totalTests) {
    console.log('✓ ALL END-TO-END CRITERIA SUCCESSFULLY VERIFIED.');
  } else {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
