/**
 * Seed Real Authentication Users into Supabase Auth & Public system_users
 * ERP Group Khalid Al-Sulaim
 *
 * Security:
 * - Credentials must be provided via environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 * - Password comes from SEED_DEFAULT_PASSWORD or is generated randomly per user.
 * - Roles are written to app_metadata (trusted / tamper-proof), NOT user_metadata.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54421';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (
  SUPABASE_URL.includes('127.0.0.1') || SUPABASE_URL.includes('localhost')
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '')
    : ''
);

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let pwd = '';
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd + 'A1!';
}

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;

const USERS_TO_SEED = [
  {
    email: 'khalid@alsulaim.sa',
    username: 'khalid.admin',
    fullName: 'خالد السليم',
    role: 'رئيس المجموعة',
    branch: 'المقر الرئيسي',
    companyId: 'all'
  },
  {
    email: 'admin@alsulaim.sa',
    username: 'super.admin',
    fullName: 'مشرف الإدارة المركزية (Super Admin)',
    role: 'المدير العام',
    branch: 'المقر الرئيسي',
    companyId: 'all'
  },
  {
    email: 'finance@alsulaim.sa',
    username: 'finance.manager',
    fullName: 'أحمد المحاسب المالي',
    role: 'مدير الحسابات',
    branch: 'فرع الرياض الرئيسي',
    companyId: 'SAF'
  },
  {
    email: 'ops@alsulaim.sa',
    username: 'operation.user',
    fullName: 'فهد مسؤول العمليات والتشغيل',
    role: 'مشرف تشغيل',
    branch: 'فرع جدة',
    companyId: 'YAQ'
  },
  {
    email: 'saf.manager@alsulaim.sa',
    username: 'saf.manager',
    fullName: 'سليمان خالد (مدير الصفا الماسي)',
    role: 'مدير استقدام',
    branch: 'فرع الرياض الرئيسي',
    companyId: 'SAF'
  },
  {
    email: 'yaq.operations@alsulaim.sa',
    username: 'yaq.operations',
    fullName: 'عبدالرحمن العتيبي (مدير تأجير الياقوت)',
    role: 'مدير تأجير وتشغيل',
    branch: 'فرع الدمام',
    companyId: 'YAQ'
  },
  {
    email: 'top.hr@alsulaim.sa',
    username: 'top.hr',
    fullName: 'سارة خالد (مسؤولة توظيف توب تالنت)',
    role: 'مدير توظيف ATS',
    branch: 'فرع الخبر',
    companyId: 'TOP'
  },
  {
    email: 'kas.tenders@alsulaim.sa',
    username: 'kas.tenders',
    fullName: 'م. بندر الهويريني (مدير منافسات كاس واعتماد)',
    role: 'مدير منافسات وتوريد',
    branch: 'المقر الرئيسي - كاس',
    companyId: 'all'
  },
  {
    email: 'client@alsulaim.sa',
    username: 'client.portal',
    fullName: 'بوابة العميل المعتمد (الخدمة الذاتية)',
    role: 'عميل مستفيد',
    branch: 'فرع الرياض الرئيسي',
    companyId: 'SAF'
  },
  {
    email: 'agent.manila@agency.ph',
    username: 'agency.manila',
    fullName: 'وكالة مانيلا الدولية المعتمدة (Manila Global Agency)',
    role: 'شريك خارجي',
    branch: 'وكالات الفلبين',
    companyId: 'SAF'
  },
  {
    email: 'store.manager@alsulaim.sa',
    username: 'store.manager',
    fullName: 'مدير المتاجر الإلكترونية وقنوات البيع',
    role: 'مدير مبيعات إلكترونية',
    branch: 'المقر الرئيسي',
    companyId: 'SAF'
  }
];

async function seedAuthUsers() {
  console.log('====================================================');
  console.log('🚀 SEEDING REAL AUTH USERS IN SUPABASE & POSTGRESQL');
  console.log('====================================================\n');

  // 1. Fetch existing auth users
  const { data: existingAuth, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) {
    console.error('❌ Failed to list auth users:', listErr.message);
    return;
  }
  const existingEmails = new Set((existingAuth?.users || []).map(u => u.email?.toLowerCase()));

  for (const user of USERS_TO_SEED) {
    let authUserId = null;
    const password = DEFAULT_PASSWORD || generateSecurePassword();

    const appMetadata = {
      role: user.role,
      company_id: user.companyId,
      branch: user.branch,
      username: user.username
    };

    const userMetadata = {
      full_name: user.fullName,
      username: user.username
    };

    if (existingEmails.has(user.email.toLowerCase())) {
      console.log(`ℹ️ Auth user already exists: ${user.email} -> Updating metadata and app_metadata`);
      const existing = existingAuth.users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
      authUserId = existing.id;
      const updatePayload = {
        email_confirm: true,
        app_metadata: appMetadata,
        user_metadata: userMetadata
      };
      if (DEFAULT_PASSWORD) {
        updatePayload.password = DEFAULT_PASSWORD;
      }
      await supabaseAdmin.auth.admin.updateUserById(authUserId, updatePayload);
    } else {
      console.log(`➕ Creating new auth user: ${user.email}`);
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true,
        app_metadata: appMetadata,
        user_metadata: userMetadata
      });
      if (createErr) {
        console.error(`❌ Error creating ${user.email}:`, createErr.message);
        continue;
      }
      authUserId = created.user.id;
      if (!DEFAULT_PASSWORD) {
        console.log(`🔑 Generated credentials for ${user.email}: username=${user.username} | password=${password}`);
      }
    }

    // 2. Upsert into public.system_users table
    const { error: sysErr } = await supabaseAdmin
      .from('system_users')
      .upsert({
        id: authUserId,
        username: user.username,
        full_name: user.fullName,
        email: user.email,
        role: user.role,
        branch: user.branch,
        status: 'نشط',
        created_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (sysErr) {
      console.warn(`⚠️ Warning syncing system_users for ${user.email}:`, sysErr.message);
    } else {
      console.log(`✅ Synced user in system_users: [${user.username}] -> ${user.fullName}`);
    }
  }

  console.log('\n🎉 ALL REAL AUTH USERS SUCCESSFULLY PROVISIONED!');
}

seedAuthUsers();
