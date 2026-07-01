const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const COURSES = [
  { id: 'c1111111-1111-1111-1111-111111111111', title: 'Data Science Essentials',      category: 'Data Science',  icon: '📊', difficulty: 'Intermediate', description: 'Data analysis, visualization, statistics.' },
  { id: 'c2222222-2222-2222-2222-222222222222', title: 'UI/UX Design Fundamentals',    category: 'Design',        icon: '🎨', difficulty: 'Beginner',     description: 'Layout grids, typography, wireframes.' },
  { id: 'c3333333-3333-3333-3333-333333333333', title: 'Web Development Bootcamp',     category: 'Development',   icon: '💻', difficulty: 'Beginner',     description: 'HTML, CSS, JS, React and Next.js.' },
  { id: 'c4444444-4444-4444-4444-444444444444', title: 'Digital Marketing Masterclass',category: 'Marketing',     icon: '📈', difficulty: 'Beginner',     description: 'SEO, copywriting, Google Analytics.' },
  { id: 'c5555555-5555-5555-5555-555555555555', title: 'Python for Beginners',         category: 'Development',   icon: '🐍', difficulty: 'Beginner',     description: 'Python: variables, loops, logic.' },
  { id: 'c6666666-6666-6666-6666-666666666666', title: 'Advanced React Patterns',      category: 'Development',   icon: '⚛️', difficulty: 'Advanced',    description: 'Hooks, context, state management.' },
  { id: 'c7777777-7777-7777-7777-777777777777', title: 'Mobile App Development',       category: 'Development',   icon: '📱', difficulty: 'Intermediate',description: 'iOS/Android with React Native.' },
  { id: 'c8888888-8888-8888-8888-888888888888', title: 'SEO Growth Strategies',        category: 'Marketing',     icon: '🔍', difficulty: 'Intermediate',description: 'Rank #1 with technical SEO.' },
  { id: 'c9999999-9999-9999-9999-999999999999', title: 'Copywriting for Beginners',    category: 'Marketing',     icon: '✍️', difficulty: 'Beginner',    description: 'Sales pages, ad banners, newsletters.' },
  { id: 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Database Design & SQL',        category: 'Data Science',  icon: '🗄️', difficulty: 'Intermediate',description: 'Tables, complex joins, aggregates.' },
  { id: 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', title: 'Machine Learning Basics',      category: 'Data Science',  icon: '🤖', difficulty: 'Advanced',    description: 'Regression, classification, neural nets.' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', title: 'Graphic Design Masterclass',   category: 'Design',        icon: '🖌️', difficulty: 'Beginner',    description: 'Photoshop, Illustrator, brand identity.' }
];

// Dates spanning the past 2 real months so "This Month" and "Last Month" filters work
// Current date: ~June 30 2026
// Last Month = May 2026 → 5 date slots
// This Month = June 2026 → 2 date slots  (fewer because month just started / ongoing)
const DATE_SLOTS = [
  { date: '2026-05-01T10:00:00Z', share: 0.08 },  // Last Month — early May
  { date: '2026-05-08T12:00:00Z', share: 0.10 },  // Last Month — mid May start
  { date: '2026-05-15T14:00:00Z', share: 0.14 },  // Last Month — mid May
  { date: '2026-05-22T11:00:00Z', share: 0.16 },  // Last Month — late May
  { date: '2026-05-31T09:00:00Z', share: 0.14 },  // Last Month — end May
  { date: '2026-06-10T15:00:00Z', share: 0.18 },  // This Month — early June
  { date: '2026-06-25T17:00:00Z', share: 0.20 },  // This Month — late June
];

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function seed() {
  console.log('\n=== RE-SEED with current dates (May–June 2026) ===\n');

  // 1. Upsert courses
  const { error: cErr } = await supabase.from('courses').upsert(COURSES);
  if (cErr) { console.error('Course error:', cErr); process.exit(1); }
  console.log(`✓ ${COURSES.length} courses upserted`);

  // 2. Get student ids
  const { data: profiles } = await supabase.from('profiles').select('id').eq('role', 'student');
  const studentIds = (profiles || []).map(p => p.id);
  console.log(`✓ ${studentIds.length} students found`);

  if (studentIds.length === 0) { console.error('No students!'); process.exit(1); }

  // 3. Build all unique pairs and shuffle
  const allPairs = [];
  for (const uid of studentIds) {
    for (const course of COURSES) {
      allPairs.push({ user_id: uid, course_id: course.id });
    }
  }
  shuffle(allPairs);
  console.log(`✓ ${allPairs.length} unique pairs ready`);

  // 4. Clear old enrollments
  await supabase.from('enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Old enrollments cleared');

  // 5. Distribute across date slots
  const total = allPairs.length;
  let cursor = 0;
  const batches = DATE_SLOTS.map((slot, i) => {
    const isLast = i === DATE_SLOTS.length - 1;
    const count = isLast ? total - cursor : Math.round(total * slot.share);
    const slice = allPairs.slice(cursor, cursor + count);
    cursor += count;
    return { date: slot.date, pairs: slice };
  });

  // 6. Build rows
  const rows = [];
  for (const batch of batches) {
    for (const pair of batch.pairs) {
      const r = Math.random();
      const progress = r < 0.15 ? 100 : r < 0.30 ? 0 : Math.floor(Math.random() * 99) + 1;
      rows.push({ id: uuidv4(), user_id: pair.user_id, course_id: pair.course_id, progress, created_at: batch.date });
    }
  }

  // 7. Insert in chunks
  let inserted = 0, errors = 0;
  const CHUNK = 100;
  console.log(`\nInserting ${rows.length} enrollments...`);
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from('enrollments').insert(rows.slice(i, i + CHUNK));
    if (error) { errors += CHUNK; console.error(`  [x] chunk error:`, error.message); }
    else { inserted += rows.slice(i, i + CHUNK).length; }
  }

  console.log(`\n✓ DONE! ${inserted} enrollments (${errors} errors)`);
  console.log('\nDistribution by date:');
  batches.forEach(b => {
    const label = new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    console.log(`  ${label} → ${b.pairs.length} enrollments`);
  });
  console.log('\n"This Month" (June 2026) and "Last Month" (May 2026) filters now have real data!');
}

seed().catch(err => { console.error('Fatal:', err); process.exit(1); });
