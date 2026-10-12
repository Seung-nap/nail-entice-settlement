// 빌드가 끝나면 최신 버전 설치 파일만 output/ 에 모은다.
//  · output/ : 지금 버전의 설치본(Setup)·포터블(Portable) 두 개만 남기고 나머지는 지운다
//  · release/: 이전 버전 설치 파일은 정리한다 (이전 버전은 GitHub Releases 에 남아 있다)
// 사용: node scripts/collect-output.cjs   (npm run dist / npm run release 끝에 자동 실행)
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { version } = require(path.join(root, 'package.json'));
const rel = path.join(root, 'release');
const out = path.join(root, 'output');
const latest = [`NailEntice-Settlement-Setup-${version}.exe`, `NailEntice-Settlement-Portable-${version}.exe`];

for (const f of latest) {
  if (!fs.existsSync(path.join(rel, f))) {
    console.error(`[output] release/${f} 가 없습니다 — 먼저 빌드하세요 (npm run dist)`);
    process.exit(1);
  }
}

fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (!latest.includes(f)) fs.rmSync(path.join(out, f), { recursive: true, force: true });
for (const f of latest) fs.copyFileSync(path.join(rel, f), path.join(out, f));

// release/ 의 지난 버전 설치 파일 정리 (latest.yml·win-unpacked·지금 버전은 유지)
const old = /^(NailEntice-Settlement-(Setup|Portable)-|nail-entice-settlement-)(\d+\.\d+\.\d+)/;
let pruned = 0;
for (const f of fs.readdirSync(rel)) {
  const m = f.match(old);
  if (m && m[3] !== version) { fs.rmSync(path.join(rel, f), { recursive: true, force: true }); pruned++; }
}

console.log(`[output] v${version} → output/${latest.join(', ')}` + (pruned ? ` · release/ 지난 버전 ${pruned}개 정리` : ''));
