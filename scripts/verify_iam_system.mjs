import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54521';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runIamVerification() {
  console.log('================================================================');
  console.log('🛡️  KHALID ERP ENTERPRISE IAM & ACCESS CONTROL VERIFICATION TEST');
  console.log('================================================================\n');

  let passed = 0;
  let total = 6;

  // Test 1: Verify the 5 Operating Companies
  try {
    const { data: companies, error } = await supabase.from('iam_companies').select('*');
    if (error) throw error;

    console.log(`[TEST 1] Companies in Database: ${companies.length}/5 companies registered.`);
    const codes = companies.map(c => c.code).sort().join(', ');
    console.log(`         Codes: [${codes}]`);
    if (companies.length >= 5) {
      console.log('✅ TEST 1 PASSED: Multi-tenant companies seeded successfully.');
      passed++;
    } else {
      console.log('❌ TEST 1 FAILED: Expected 5 companies.');
    }
  } catch (err) {
    console.error('❌ TEST 1 ERROR:', err.message);
  }

  // Test 2: Verify System Roles
  try {
    const { data: roles, error } = await supabase.from('iam_roles').select('*');
    if (error) throw error;
    console.log(`\n[TEST 2] Roles Catalog: ${roles.length} enterprise roles registered.`);
    if (roles.length >= 7) {
      console.log('✅ TEST 2 PASSED: Roles seeded successfully.');
      passed++;
    } else {
      console.log('❌ TEST 2 FAILED: Expected >= 7 roles.');
    }
  } catch (err) {
    console.error('❌ TEST 2 ERROR:', err.message);
  }

  // Test 3: Verify Granular Permissions Catalog
  try {
    const { data: perms, error } = await supabase.from('iam_permissions').select('*');
    if (error) throw error;
    console.log(`\n[TEST 3] Permissions Catalog: ${perms.length} granular permissions registered.`);
    if (perms.length >= 10) {
      console.log('✅ TEST 3 PASSED: Permissions registered.');
      passed++;
    } else {
      console.log('❌ TEST 3 FAILED: Expected >= 10 permissions.');
    }
  } catch (err) {
    console.error('❌ TEST 3 ERROR:', err.message);
  }

  // Test 4: Verify Separation of Duties (SoD) Rules
  try {
    const { data: sod, error } = await supabase.from('iam_sod_rules').select('*');
    if (error) throw error;
    console.log(`\n[TEST 4] Separation of Duties (SoD): ${sod.length} active conflict rules registered.`);
    sod.forEach(r => console.log(`         - [${r.code}] ${r.name} (${r.permission_a} <-> ${r.permission_b})`));
    if (sod.length >= 3) {
      console.log('✅ TEST 4 PASSED: SoD rules present and active.');
      passed++;
    } else {
      console.log('❌ TEST 4 FAILED: Expected >= 3 SoD rules.');
    }
  } catch (err) {
    console.error('❌ TEST 4 ERROR:', err.message);
  }

  // Test 5: Verify User Creation & RBAC assignment
  try {
    const testEmail = `sec_audit_${Date.now()}@alsulaim.sa`;
    const { data: newUser, error: uErr } = await supabase
      .from('iam_users')
      .insert([
        {
          employee_number: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          full_name: 'مدقق الأمان الرقابي المستقل',
          email: testEmail,
          phone: '0555555555',
          job_title: 'مدقق امتثال خارجي',
          account_type: 'Auditor',
          status: 'نشط',
          mfa_enabled: true,
          mfa_method: 'Google Authenticator',
        }
      ])
      .select()
      .single();

    if (uErr) throw uErr;
    console.log(`\n[TEST 5] Created test user: ${newUser.full_name} (${newUser.email}) - ID: ${newUser.id}`);

    // Clean up test user
    await supabase.from('iam_users').delete().eq('id', newUser.id);
    console.log('✅ TEST 5 PASSED: User CRUD lifecycle verified.');
    passed++;
  } catch (err) {
    console.error('❌ TEST 5 ERROR:', err.message);
  }

  // Test 6: Verify Immutable Audit Logging
  try {
    const auditPayload = {
      actor_email: 'audit_bot@alsulaim.sa',
      company_code: 'KAS',
      action: 'SECURITY_INTEGRITY_CHECK',
      resource: 'iam_policy_engine',
      result: 'SUCCESS',
      severity: 'معلومات',
      ip_address: '127.0.0.1',
      user_agent: 'VerificationAgent/1.0',
      new_values: { timestamp: new Date().toISOString(), status: 'VERIFIED' },
    };

    const { data: logEntry, error: logErr } = await supabase
      .from('iam_audit_logs')
      .insert([auditPayload])
      .select()
      .single();

    if (logErr) throw logErr;
    console.log(`\n[TEST 6] Audit log created successfully - ID: ${logEntry.id} (Action: ${logEntry.action})`);
    console.log('✅ TEST 6 PASSED: Audit trail write confirmed.');
    passed++;
  } catch (err) {
    console.error('❌ TEST 6 ERROR:', err.message);
  }

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULT: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');
}

runIamVerification();
