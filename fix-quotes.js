const fs = require('fs');
const files = [
  'app/resume/preview.tsx',
  'app/resume/components/templates.tsx'
];

const replacements = [
  [/[\u201C\u201D]/g, '"'],
  [/[\u2018\u2019]/g, "'"],
  [/\u2026/g,         '...'],
  [/\u2013/g,         '-'],
  [/\u2014/g,         '-'],
  [/\u00A0/g,         ' ']
];

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  let total = 0;
  for (const [re, rep] of replacements) {
    const m = s.match(re);
    if (m) total += m.length;
    s = s.replace(re, rep);
  }
  fs.writeFileSync(f, s);
  console.log('fixed', f, '-', total, 'chars replaced');
}
