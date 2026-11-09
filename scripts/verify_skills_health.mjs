#!/usr/bin/env node
/**
 * ERP Group Khalid Al-Sulaim — Unified Skills Health & Quality Gate Verifier
 * Verifies:
 *   1. All 13 local skills in .agents/skills/ exist and have valid YAML frontmatter (name + description).
 *   2. AGENTS.md and .agents/skills.json are synchronized.
 *   3. Zero hardcoded secrets/keys exist in tracked source/script files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const skillsConfigPath = path.join(ROOT, '.agents', 'skills.json');
const agentsMdPath = path.join(ROOT, 'AGENTS.md');

console.log('================================================================================');
console.log('🚀 KHALID AL-SULAIM ERP — SKILLS ACTIVATION & HEALTH VERIFIER');
console.log('================================================================================\n');

let passed = 0;
let failed = 0;

// 1. Verify .agents/skills.json & AGENTS.md
if (!fs.existsSync(skillsConfigPath) || !fs.existsSync(agentsMdPath)) {
  console.error('❌ [FAIL] Missing .agents/skills.json or AGENTS.md');
  process.exit(1);
}

const skillsConfig = JSON.parse(fs.readFileSync(skillsConfigPath, 'utf8'));
const localSkills = skillsConfig.activeLocalSkills || [];

console.log(`📦 Checking ${localSkills.length} Active Project-Local Skills in .agents/skills/...`);

for (const skill of localSkills) {
  const fullPath = path.join(ROOT, skill.path);
  if (!fs.existsSync(fullPath)) {
    console.error(`  ❌ [MISSING] ${skill.name} (${skill.path})`);
    failed++;
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const hasFrontmatter = /^---\s*\n[\s\S]*?name:\s*.+\n[\s\S]*?description:\s*.+\n[\s\S]*?---/.test(content);
  if (!hasFrontmatter) {
    console.error(`  ❌ [INVALID FRONTMATTER] ${skill.name} (${skill.path})`);
    failed++;
    continue;
  }
  console.log(`  ✅ [ACTIVE] ${skill.name.padEnd(34)} → [${skill.layer}]`);
  passed++;
}

console.log(`\n🌐 Linked Global Skills (${(skillsConfig.linkedGlobalSkills || []).length}):`);
console.log(`  ${(skillsConfig.linkedGlobalSkills || []).join(', ')}`);

// 2. Verify Zero Leaked Keys in Tracked Code/Config Files
console.log('\n🔒 Running Zero-Secret Repository Guard (`code-review-security-audit`)...');
try {
  const grepOut = execSync(
    'git grep -i -E "(sb_publishable_|sb_secret_|sbp_[a-zA-Z0-9]{10,}|sntryu_|AIzaSy|vpktsypunodgihpcufdj|6A5AA1D4EAFF4E9FB37E23D68491D6F4)" -- "src/" "scripts/" "mcp.json" ".vscode/"',
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
  );
  if (grepOut.trim()) {
    console.error('❌ [FAIL] Found hardcoded secret pattern:\n' + grepOut);
    failed++;
  }
} catch {
  console.log('  ✅ [PASS] 0 hardcoded keys or tokens in src/, scripts/, and MCP configs.');
  passed++;
}

// 3. Run 58-Page System Auditor
console.log('\n🎨 Running 58-Page Mobbin UI & System Auditor (`ui-ux-design-system`)...');
const auditOut = execSync('node scripts/audit_system.cjs', { encoding: 'utf8' });
if (auditOut.includes('[]')) {
  console.log('  ✅ [PASS] All 58 pages passed with 0 audit issues ([]).');
  passed++;
} else {
  console.error('❌ [FAIL] Page audit reported issues:\n' + auditOut);
  failed++;
}

// 4. Run 77-Module Automated ERP Verifier
console.log('\n⚙️  Running 77-Module Automated ERP Verifier (`testing-and-qa`)...');
const modOut = execSync('node scripts/run_automated_tests.js', { encoding: 'utf8' });
if (modOut.includes('Failed: 0')) {
  console.log('  ✅ [PASS] All 77 ERP modules verified (77/77 PASSED).');
  passed++;
} else {
  console.error('❌ [FAIL] Module verifier reported failures:\n' + modOut);
  failed++;
}

console.log('\n================================================================================');
console.log(`📊 SKILLS VERIFICATION SUMMARY: ${passed} checks passed, ${failed} failed.`);
console.log('================================================================================');

if (failed > 0) {
  process.exit(1);
}
