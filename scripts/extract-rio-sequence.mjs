import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const FFMPEG = '/Users/oguzolgun/.gemini/antigravity/scratch/cuoriva-leather/node_modules/.pnpm/ffmpeg-static@5.3.0/node_modules/ffmpeg-static/ffmpeg';
const INPUT = '/Users/oguzolgun/.gemini/antigravity/brain/36c8832d-ea00-4f3f-9ca3-840b50625165/.user_uploaded/media_1794864215869_ec5d8f73.mp4';
const BASE_DIR = '/Users/oguzolgun/.gemini/antigravity/scratch/cuoriva-leather/public/assets/sequence/rio';

const DESKTOP_DIR = path.join(BASE_DIR, 'desktop');
const MOBILE_DIR = path.join(BASE_DIR, 'mobile');

fs.mkdirSync(DESKTOP_DIR, { recursive: true });
fs.mkdirSync(MOBILE_DIR, { recursive: true });

console.log('Extracting Desktop frames (20 fps, 1280px, q=75)...');
// Desktop frames
const rDesk = spawnSync(FFMPEG, [
  '-y',
  '-i', INPUT,
  '-vf', 'fps=20,scale=1280:-1:flags=lanczos',
  '-c:v', 'libwebp',
  '-quality', '75',
  path.join(DESKTOP_DIR, 'f_%04d.webp')
], { stdio: 'inherit' });

if (rDesk.status !== 0) {
  console.error('Desktop extraction failed');
  process.exit(1);
}

console.log('Extracting Mobile frames (12 fps, 720px, q=70)...');
// Mobile frames
const rMob = spawnSync(FFMPEG, [
  '-y',
  '-i', INPUT,
  '-vf', 'fps=12,scale=720:-1:flags=lanczos',
  '-c:v', 'libwebp',
  '-quality', '70',
  path.join(MOBILE_DIR, 'f_%04d.webp')
], { stdio: 'inherit' });

if (rMob.status !== 0) {
  console.error('Mobile extraction failed');
  process.exit(1);
}

console.log('Extracting Poster frame (at 4.0s, open wallet)...');
// Poster frame
const rPoster = spawnSync(FFMPEG, [
  '-y',
  '-ss', '00:00:04.000',
  '-i', INPUT,
  '-vframes', '1',
  '-vf', 'scale=1280:-1:flags=lanczos',
  '-c:v', 'libwebp',
  '-quality', '82',
  path.join(BASE_DIR, 'poster.webp')
], { stdio: 'inherit' });

if (rPoster.status !== 0) {
  console.error('Poster extraction failed');
  process.exit(1);
}

// Calculate sizes
const deskFiles = fs.readdirSync(DESKTOP_DIR).filter(f => f.endsWith('.webp')).sort();
const mobFiles = fs.readdirSync(MOBILE_DIR).filter(f => f.endsWith('.webp')).sort();

let deskBytes = 0;
for (const f of deskFiles) {
  deskBytes += fs.statSync(path.join(DESKTOP_DIR, f)).size;
}

let mobBytes = 0;
for (const f of mobFiles) {
  mobBytes += fs.statSync(path.join(MOBILE_DIR, f)).size;
}

const posterBytes = fs.statSync(path.join(BASE_DIR, 'poster.webp')).size;

console.log(`Desktop: ${deskFiles.length} frames, ${(deskBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log(`Mobile: ${mobFiles.length} frames, ${(mobBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log(`Poster: ${(posterBytes / 1024).toFixed(1)} KB`);

// Sample edge colors using ffmpeg to scale frame 1 and frame 80 to 1x1 crop of border
// or extract corner/edge pixels
const sampleBorderScript = spawnSync(FFMPEG, [
  '-y',
  '-i', path.join(DESKTOP_DIR, deskFiles[0]),
  '-vf', 'crop=iw:10:0:0,scale=1:1',
  '-f', 'rawvideo',
  '-pix_fmt', 'rgb24',
  '-'
]);

let edgeHex = '#100c0a'; // fallback dark warm studio edge
if (sampleBorderScript.stdout && sampleBorderScript.stdout.length >= 3) {
  const r = sampleBorderScript.stdout[0];
  const g = sampleBorderScript.stdout[1];
  const b = sampleBorderScript.stdout[2];
  edgeHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  console.log(`Sampled top border edge color: RGB(${r}, ${g}, ${b}) -> ${edgeHex}`);
}

const meta = {
  desktop: {
    frameCount: deskFiles.length,
    fps: 20,
    width: 1280,
    height: 720,
    pattern: '/assets/sequence/rio/desktop/f_%04d.webp',
    totalSizeMB: Number((deskBytes / (1024 * 1024)).toFixed(2))
  },
  mobile: {
    frameCount: mobFiles.length,
    fps: 12,
    width: 720,
    height: 405,
    pattern: '/assets/sequence/rio/mobile/f_%04d.webp',
    totalSizeMB: Number((mobBytes / (1024 * 1024)).toFixed(2))
  },
  duration: 10.03,
  poster: '/assets/sequence/rio/poster.webp',
  edgeColor: edgeHex,
  beats: [
    { progress: 0.0, label: 'Sıcak Gofraj & Dikiş Detayı' },
    { progress: 0.35, label: 'Gizli Kilit & Hassas Kapak' },
    { progress: 0.65, label: '3D Katmanlı Kart Mimarisi' },
    { progress: 0.92, label: 'Koleksiyon Keşfi' }
  ]
};

fs.writeFileSync(path.join(BASE_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
console.log('meta.json written successfully.');
