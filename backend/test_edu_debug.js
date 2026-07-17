// Simulate the EXACT same request the browser makes during education edit+save
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'PortfolioNavyCutSecretKey2026!';
const token = jwt.sign({ id: 1, username: 'rugha' }, JWT_SECRET, { expiresIn: '1h' });

async function testExactBrowserRequest() {
  // First fetch education to get existing data (like the dashboard does)
  console.log('1. Fetching education list...');
  const t0 = Date.now();
  const listRes = await fetch('https://portfolio-f4os.onrender.com/api/education');
  const list = await listRes.json();
  console.log(`   Done in ${Date.now() - t0}ms. Found ${list.length} records.`);

  const rec = list.find(e => e.degree === '12th');
  if (!rec) { console.log('No 12th record found!'); return; }
  console.log(`   Editing: id=${rec.id} school="${rec.school}"`);

  // Build the EXACT FormData the frontend would build
  const formData = new FormData();
  formData.append('school', rec.school);
  formData.append('degree', rec.degree);
  formData.append('field_of_study', 'Intermediate');
  formData.append('start_date', rec.passing_year || rec.end_date);
  formData.append('end_date', rec.passing_year || rec.end_date);
  formData.append('passing_year', rec.passing_year || '');
  formData.append('full_marks', String(rec.full_marks || '600'));
  formData.append('marks_obtained', String(rec.marks_obtained || '371'));
  const pct = rec.percentage != null ? String(rec.percentage) : '61.83';
  formData.append('percentage', pct);
  formData.append('board', rec.board || 'CBSE');
  const desc = `Completed 12th standard (Intermediate) from ${rec.board || 'CBSE'} Board at ${rec.school} in the year ${rec.passing_year} with a score of ${rec.marks_obtained}/${rec.full_marks} (${pct}%).`;
  formData.append('description', desc);
  formData.append('access_cert10', rec.access_cert10 ? '1' : '0');
  formData.append('access_cert12', rec.access_cert12 ? '1' : '0');
  formData.append('access_certbach', rec.access_certbach ? '1' : '0');
  formData.append('board', rec.board || '');

  // Send as POST with _method=PUT (exactly like the frontend does)
  const url = `https://portfolio-f4os.onrender.com/api/education/${rec.id}?_method=PUT`;
  console.log(`\n2. Sending POST to: ${url}`);
  const t1 = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log(`   Status: ${res.status} (${Date.now() - t1}ms)`);
    console.log(`   Headers:`, Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log(`   Response: ${text}`);
    console.log('\n✅ SUCCESS - No network error!');
  } catch (err) {
    console.log(`   ❌ ERROR after ${Date.now() - t1}ms: ${err.message}`);
    console.log(`   Error name: ${err.name}`);
  }
}

testExactBrowserRequest().catch(console.error);
