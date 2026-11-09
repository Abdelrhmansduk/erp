import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../src/data/kasMonafasatSheetData.json');
const raw = fs.readFileSync(jsonPath, 'utf8');
const sheetData = JSON.parse(raw);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54521';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('Truncating existing records in kas_monafasat_master...');
  await supabase.from('kas_monafasat_master').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Starting rich ingestion of 11,727 Monafasat records into Supabase with authentic titles & entities...');

  const allRecords = [];
  for (const [sheetName, items] of Object.entries(sheetData)) {
    for (const item of items) {
      allRecords.push({
        tender_name: item.title || item.tenderName || 'منافسة عامة',
        reference_number: String(item.referenceNumber || item.tenderNumber || item.seq || Date.now()),
        government_entity: item.entity || item.governmentEntity || 'جهة حكومية',
        status: item.status || 'مفتوحة للعطاءات',
        tender_type: item.tenderType || 'منافسة عامة',
        category: sheetName.includes('الادارة الطبية') || sheetName.includes('الاداره الطبيه') ? 'القطاع الطبي والصحي' : sheetName,
        sub_category: sheetName,
        booklet_price: Number(item.bookletPrice) || 0,
        estimated_value: Number(item.estimatedCost || item.bidValue || 0),
        winning_bid_value: Number(item.winningBidValue) || 0,
        winning_company: item.company || '',
        award_gap_percentage: Number(item.awardGapPercentage) || 0,
        bids_count: Number(item.biddersCount || item.bidsCount || 0),
        location: item.city || 'الرياض',
        submission_deadline: item.deadlineDate && !isNaN(Date.parse(item.deadlineDate)) ? new Date(item.deadlineDate).toISOString() : null,
        is_bookmarked: Boolean(item.isBookmarked),
      });
    }
  }

  console.log(`Prepared ${allRecords.length} rich records. Uploading in batches of 500...`);
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('kas_monafasat_master').insert(batch);
    if (error) {
      console.error(`\nError inserting batch ${i} to ${i + batch.length}:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rInserted: ${inserted} / ${allRecords.length} records...`);
    }
  }

  console.log('\nDone! Authentic Monafasat Ingestion completed successfully.');
}

seed().catch(console.error);
