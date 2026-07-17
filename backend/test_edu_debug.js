const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'PortfolioNavyCutSecretKey2026!';
const token = jwt.sign({ id: 1, username: 'rugha' }, JWT_SECRET, { expiresIn: '1h' });

async function testEduEdit() {
  console.log('Testing education PUT with exact form values...\n');

  // First, get the list of education items to find the real ID
  const listRes = await fetch('https://portfolio-f4os.onrender.com/api/education', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const list = await listRes.json();
  console.log('Education list:', JSON.stringify(list.map(e => ({ id: e.id, school: e.school, degree: e.degree })), null, 2));

  if (!list || !list.length) {
    console.log('No education records found!');
    return;
  }

  // Find the 12th record
  const rec = list.find(e => e.degree === '12th') || list[0];
  console.log('\nEditing record:', rec.id, rec.school, rec.degree);

  const formData = new FormData();
  formData.append('school', rec.school || 'Christ college');
  formData.append('degree', rec.degree || '12th');
  formData.append('field_of_study', 'Intermediate');
  formData.append('start_date', rec.passing_year || '2023');
  formData.append('end_date', rec.passing_year || '2023');
  formData.append('passing_year', rec.passing_year || '2023');
  formData.append('full_marks', rec.full_marks != null ? String(rec.full_marks) : '600');
  formData.append('marks_obtained', rec.marks_obtained != null ? String(rec.marks_obtained) : '371');
  const pct = rec.percentage != null ? String(rec.percentage) : '61.83';
  formData.append('percentage', pct);
  formData.append('board', rec.board || 'CBSE');
  formData.append('description', rec.description || 'test');
  formData.append('access_cert10', rec.access_cert10 ? '1' : '0');
  formData.append('access_cert12', rec.access_cert12 ? '1' : '0');
  formData.append('access_certbach', rec.access_certbach ? '1' : '0');

  const url = `https://portfolio-f4os.onrender.com/api/education/${rec.id}?_method=PUT`;
  console.log('\nSending POST to:', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

testEduEdit().catch(console.error);
