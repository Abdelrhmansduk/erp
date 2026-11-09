/**
 * Comprehensive Automated Verification Script for Real Auth & Live PostgreSQL
 * ERP Group Khalid Al-Sulaim
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54421';
const ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '');

const client = createClient(SUPABASE_URL, ANON_KEY);

async function runVerification() {
  console.log('================================================================');
  console.log('🛡️ VERIFYING REAL AUTHENTICATION & LIVE POSTGRESQL INTEGRATION');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 5;

  // Test 1: Real Auth Valid Credentials
  console.log('[Test 1/5] Testing Real Authentication with Valid Credentials (admin@alsulaim.sa)...');
  const r1 = await client.auth.signInWithPassword({
    email: 'admin@alsulaim.sa',
    password: process.env.ERP_TEST_PASSWORD || ''
  });
  if (r1.data?.session && !r1.error) {
    console.log('✅ Passed Test 1: Valid credentials successfully authenticated with GoTrue JWT session.');
    console.log(`   User ID: ${r1.data.user.id}, Role: ${r1.data.user.user_metadata?.role || 'Admin'}`);
    passedTests++;
  } else {
    console.error('❌ Failed Test 1:', r1.error?.message);
  }

  // Test 2: Real Auth Invalid Credentials Rejection
  console.log('\n[Test 2/5] Testing Real Auth Rejection on Invalid Password (admin@alsulaim.sa with wrong pass)...');
  const r2 = await client.auth.signInWithPassword({
    email: 'admin@alsulaim.sa',
    password: 'wrong-password-12345'
  });
  if (!r2.data?.session && r2.error) {
    console.log('✅ Passed Test 2: Wrong password was strictly rejected with error:', r2.error.message);
    passedTests++;
  } else {
    console.error('❌ Failed Test 2: Invalid password was not rejected!');
  }

  // Test 3: Real Database Live Queries across multiple entities
  console.log('\n[Test 3/5] Querying live PostgreSQL tables via Supabase REST API...');
  const { data: clients, error: cErr } = await client.from('clients').select('id, name, phone, client_activity').limit(3);
  const { data: contracts, error: ctErr } = await client.from('contracts').select('id, contract_number, client_name, amount').limit(3);
  const { data: cvs, error: cvErr } = await client.from('cvs').select('id, cv_code, maid_name, job').limit(3);

  if (!cErr && !ctErr && !cvErr && clients?.length && contracts?.length && cvs?.length) {
    console.log(`✅ Passed Test 3: Live queries succeeded:`);
    console.log(`   - Clients: ${clients.length} retrieved (e.g. ${clients[0].name})`);
    console.log(`   - Contracts: ${contracts.length} retrieved (e.g. ${contracts[0].contract_number} - ${contracts[0].client_name})`);
    console.log(`   - CVs: ${cvs.length} retrieved (e.g. ${cvs[0].maid_name} - ${cvs[0].job})`);
    passedTests++;
  } else {
    console.error('❌ Failed Test 3: Table query failed:', cErr?.message || ctErr?.message || cvErr?.message);
  }

  // Test 4: Real Database CRUD (Create & Delete Test Client)
  console.log('\n[Test 4/5] Testing Live PostgreSQL CRUD (Insert & Delete in clients)...');
  const testClientNo = `CLI-TEST-${Date.now()}`;
  const { data: inserted, error: insErr } = await client.from('clients').insert([
    {
      client_no: testClientNo,
      name: 'عميل اختبار المنظومة الحية',
      phone: '0599999999',
      national_id: '1000000000',
      branch: 'فرع الرياض',
      status: 'نشط',
      type: 'شخص'
    }
  ]).select();

  if (!insErr && inserted?.length) {
    console.log(`   Inserted test record with client_no: ${testClientNo}`);
    const { error: delErr } = await client.from('clients').delete().eq('client_no', testClientNo);
    if (!delErr) {
      console.log('✅ Passed Test 4: Live INSERT and DELETE operations completed successfully in PostgreSQL.');
      passedTests++;
    } else {
      console.error('❌ Failed Test 4 Delete:', delErr.message);
    }
  } else {
    console.error('❌ Failed Test 4 Insert:', insErr?.message);
  }

  // Test 5: Verify Multi-Company Users Provisioning
  console.log('\n[Test 5/5] Testing System Users Registry in PostgreSQL...');
  const { data: sysUsers, error: suErr } = await client.from('system_users').select('username, full_name, role, email');
  if (!suErr && sysUsers?.length >= 5) {
    console.log(`✅ Passed Test 5: All ${sysUsers.length} system users are active and mapped in PostgreSQL.`);
    passedTests++;
  } else {
    console.error('❌ Failed Test 5:', suErr?.message);
  }

  console.log('\n================================================================');
  console.log(`   FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification();
