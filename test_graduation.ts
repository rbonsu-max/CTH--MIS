import db from './db';

async function run() {
  console.log("DB Update...");
  db.prepare("UPDATE academic_years SET is_current = 0").run();
  db.prepare("INSERT OR IGNORE INTO academic_years (code, start_date, end_date, is_current) VALUES ('2026/2027', '2026-09-01', '2027-08-31', 1)").run();
  db.prepare("UPDATE academic_years SET is_current = 1 WHERE code = '2026/2027'").run();

  console.log("Logging in...");
  const loginRes = await fetch('http://localhost:3009/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'youroger1@gmail.com', password: '$$Ecg$$' })
  });
  const cookie = loginRes.headers.get('set-cookie') as string;

  console.log("Testing API constraint for duration 4 years with active year 2026 (Passed 2026-2023+1=4 years)...");
  const params = new URLSearchParams({ progid: 'SNBTH', admission_year: '2023/2024' });
  const gradRes = await fetch(`http://localhost:3009/api/assessments/graduation-list?${params.toString()}`, {
    headers: { cookie }
  });

  if (gradRes.ok) {
    console.log("✅ SUCCESS:", await gradRes.json());
  } else {
    console.error("❌ ERROR:", await gradRes.json());
  }

  // Reverse to current year to test failure
  db.prepare("UPDATE academic_years SET is_current = 0").run();
  db.prepare("UPDATE academic_years SET is_current = 1 WHERE code = '2023/2024'").run();

  const gradResFail = await fetch(`http://localhost:3009/api/assessments/graduation-list?${params.toString()}`, {
    headers: { cookie }
  });

  if (gradResFail.ok) {
    console.log("❌ EXPECTED FAILURE BUT GOT SUCCESS:", await gradResFail.json());
  } else {
    console.error("✅ EXPECTED CONSTRAINT ERROR Triggered Succesfully:", await gradResFail.json());
  }
}
run();
