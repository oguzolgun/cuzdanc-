import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const FFMPEG = '/Users/oguzolgun/.gemini/antigravity/scratch/cuoriva-leather/node_modules/.pnpm/ffmpeg-static@5.3.0/node_modules/ffmpeg-static/ffmpeg'
const ROOT = '/Users/oguzolgun/.gemini/antigravity/scratch/cuoriva-leather'
const SRC_DIR = path.join(ROOT, 'public/assets/hero-src')
const OUT_DIR = path.join(ROOT, 'public/assets/hero')
fs.mkdirSync(OUT_DIR, { recursive: true })

const W = 1280
const H = 720
const FPS = 30

function readRgb(pngPath) {
  const res = spawnSync(
    FFMPEG,
    ['-y', '-i', pngPath, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 50 * 1024 * 1024 }
  )
  if (res.status !== 0) {
    throw new Error(`Failed reading RGB from ${pngPath}`)
  }
  return res.stdout
}

function encodeRawToVideo(framesBuf, mp4Path, webmPath) {
  const rMp4 = spawnSync(
    FFMPEG,
    [
      '-y',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgb24',
      '-s', `${W}x${H}`,
      '-r', String(FPS),
      '-i', '-',
      '-an',
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      mp4Path,
    ],
    { input: framesBuf, maxBuffer: 50 * 1024 * 1024 }
  )
  if (rMp4.status !== 0) {
    console.error(rMp4.stderr?.toString())
    throw new Error(`MP4 encode failed for ${mp4Path}`)
  }

  const rWebm = spawnSync(
    FFMPEG,
    [
      '-y',
      '-i', mp4Path,
      '-an',
      '-c:v', 'libvpx-vp9',
      '-crf', '32',
      '-b:v', '0',
      '-row-mt', '1',
      webmPath,
    ],
    { maxBuffer: 50 * 1024 * 1024 }
  )
  if (rWebm.status !== 0) {
    console.error(rWebm.stderr?.toString())
    throw new Error(`WebM encode failed for ${webmPath}`)
  }
}

function reverseVideo(srcMp4, dstMp4, dstWebm) {
  const r1 = spawnSync(FFMPEG, [
    '-y', '-i', srcMp4, '-vf', 'reverse', '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dstMp4
  ])
  if (r1.status !== 0) throw new Error(`Reverse MP4 failed for ${dstMp4}`)

  const r2 = spawnSync(FFMPEG, [
    '-y', '-i', dstMp4, '-an', '-c:v', 'libvpx-vp9',
    '-crf', '32', '-b:v', '0', '-row-mt', '1', dstWebm
  ])
  if (r2.status !== 0) throw new Error(`Reverse WebM failed for ${dstWebm}`)
}

function checkSsim(videoPath, frameIndex, refPngPath) {
  const tmpFrame = `/tmp/ssim_frame_${process.pid}.png`
  if (frameIndex === 0) {
    spawnSync(FFMPEG, ['-y', '-i', videoPath, '-vframes', '1', tmpFrame])
  } else {
    spawnSync(FFMPEG, ['-y', '-sseof', '-0.05', '-i', videoPath, '-update', '1', '-frames:v', '1', tmpFrame])
  }
  const res = spawnSync(FFMPEG, [
    '-i', tmpFrame, '-i', refPngPath, '-lavfi', 'ssim', '-f', 'null', '-'
  ], { encoding: 'utf8' })
  try { fs.unlinkSync(tmpFrame) } catch {}
  const m = res.stderr.match(/All:([0-9.]+)/)
  return m ? Number(m[1]) : 0
}

function getDuration(videoPath) {
  const res = spawnSync(FFMPEG, ['-i', videoPath], { encoding: 'utf8' })
  const m = res.stderr.match(/Duration:\s*(\d+):(\d+):([0-9.]+)/)
  if (!m) return 1.1
  return Number((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])).toFixed(2))
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

console.log('1. Reading source keyframes...')
const bufEmpty = readRgb(path.join(SRC_DIR, 's_empty.png'))
const bufS0 = readRgb(path.join(SRC_DIR, 's0.png'))
const bufOpen = [1, 2, 3, 4].map((i) => readRgb(path.join(SRC_DIR, `o${i}.png`)))

// Sample edge color from top/side border of s0
const edgeR = bufS0[0]
const edgeG = bufS0[1]
const edgeB = bufS0[2]
const edgeColor = `#${((1 << 24) + (edgeR << 16) + (edgeG << 8) + edgeB).toString(16).slice(1)}`
console.log(`Sampled edge color: ${edgeColor}`)

// 2. Build intro.mp4 (s_empty -> s0 with staggered left-to-right rise)
console.log('2. Synthesizing intro.mp4 / intro.webm (60 frames, 2.0s)...')
const slotBounds = [
  { x0: 115, x1: 398, startF: 5, endF: 26 },
  { x0: 398, x1: 658, startF: 13, endF: 34 },
  { x0: 658, x1: 908, startF: 21, endF: 42 },
  { x0: 908, x1: 1185, startF: 29, endF: 50 },
]
const trayLipY = 549
const introFrames = 60
const frameSize = W * H * 3
const introBuf = Buffer.alloc(introFrames * frameSize)

// Precompute wallet masks (alpha 0..1 where s0 differs from s_empty inside wallet zone)
const slotMasks = slotBounds.map((sb) => {
  const mask = new Float32Array(W * H)
  for (let y = 240; y <= trayLipY; y++) {
    for (let x = sb.x0; x < sb.x1; x++) {
      const idx = (y * W + x) * 3
      const diff =
        Math.abs(bufS0[idx] - bufEmpty[idx]) +
        Math.abs(bufS0[idx + 1] - bufEmpty[idx + 1]) +
        Math.abs(bufS0[idx + 2] - bufEmpty[idx + 2])
      if (diff > 32) {
        mask[y * W + x] = Math.min(1, (diff - 32) / 50)
      }
    }
  }
  return mask
})

for (let f = 0; f < introFrames; f++) {
  const dst = introBuf.subarray(f * frameSize, (f + 1) * frameSize)
  if (f >= 53) {
    bufS0.copy(dst)
    continue
  }
  bufEmpty.copy(dst)
  for (let k = 0; k < 4; k++) {
    const sb = slotBounds[k]
    const mask = slotMasks[k]
    if (f < sb.startF) continue
    const rawT = Math.min(1, (f - sb.startF) / (sb.endF - sb.startF))
    if (rawT >= 1) {
      // Copy final slot directly
      for (let y = 240; y <= trayLipY; y++) {
        for (let x = sb.x0; x < sb.x1; x++) {
          const p = y * W + x
          const a = mask[p]
          if (a > 0) {
            const i3 = p * 3
            dst[i3] = Math.round(dst[i3] * (1 - a) + bufS0[i3] * a)
            dst[i3 + 1] = Math.round(dst[i3 + 1] * (1 - a) + bufS0[i3 + 1] * a)
            dst[i3 + 2] = Math.round(dst[i3 + 2] * (1 - a) + bufS0[i3 + 2] * a)
          }
        }
      }
    } else {
      const eased = easeOutCubic(rawT)
      const yOffset = Math.round((1 - eased) * 165)
      const globalAlpha = Math.min(1, rawT * 2.5)
      for (let y = 240; y <= trayLipY; y++) {
        const srcY = y + yOffset
        if (srcY > trayLipY || srcY < 240) continue
        for (let x = sb.x0; x < sb.x1; x++) {
          const srcP = srcY * W + x
          const a = mask[srcP] * globalAlpha
          if (a > 0.01) {
            const dstI = (y * W + x) * 3
            const srcI = srcP * 3
            dst[dstI] = Math.round(dst[dstI] * (1 - a) + bufS0[srcI] * a)
            dst[dstI + 1] = Math.round(dst[dstI + 1] * (1 - a) + bufS0[srcI + 1] * a)
            dst[dstI + 2] = Math.round(dst[dstI + 2] * (1 - a) + bufS0[srcI + 2] * a)
          }
        }
      }
    }
  }
}

const introMp4 = path.join(OUT_DIR, 'intro.mp4')
const introWebm = path.join(OUT_DIR, 'intro.webm')
encodeRawToVideo(introBuf, introMp4, introWebm)

// 3. Build open_i and close_i (i = 1..4)
const durations = { intro: getDuration(introMp4), open: [], close: [] }
const ssimResults = {
  introStartVsEmpty: checkSsim(introMp4, 0, path.join(SRC_DIR, 's_empty.png')),
  introEndVsS0: checkSsim(introMp4, -1, path.join(SRC_DIR, 's0.png')),
  open: []
}

const openFrames = 34 // ~1.13s @ 30fps
for (let idx = 0; idx < 4; idx++) {
  const num = idx + 1
  console.log(`3.${num} Synthesizing open_${num} & close_${num}...`)
  const targetBuf = bufOpen[idx]
  const clipBuf = Buffer.alloc(openFrames * frameSize)

  for (let f = 0; f < openFrames; f++) {
    const dst = clipBuf.subarray(f * frameSize, (f + 1) * frameSize)
    if (f < 4) {
      bufS0.copy(dst)
    } else if (f >= openFrames - 5) {
      targetBuf.copy(dst)
    } else {
      const rawT = (f - 4) / (openFrames - 9)
      const t = easeInOutCubic(rawT)
      for (let p = 0; p < frameSize; p++) {
        dst[p] = Math.round(bufS0[p] * (1 - t) + targetBuf[p] * t)
      }
    }
  }

  const openMp4 = path.join(OUT_DIR, `open_${num}.mp4`)
  const openWebm = path.join(OUT_DIR, `open_${num}.webm`)
  const closeMp4 = path.join(OUT_DIR, `close_${num}.mp4`)
  const closeWebm = path.join(OUT_DIR, `close_${num}.webm`)

  encodeRawToVideo(clipBuf, openMp4, openWebm)
  reverseVideo(openMp4, closeMp4, closeWebm)

  durations.open.push(getDuration(openMp4))
  durations.close.push(getDuration(closeMp4))

  const ssimStart = checkSsim(openMp4, 0, path.join(SRC_DIR, 's0.png'))
  const ssimEnd = checkSsim(openMp4, -1, path.join(SRC_DIR, `o${num}.png`))
  ssimResults.open.push({ wallet: num, startVsS0: ssimStart, endVsOi: ssimEnd })
}

// 4. Export WebP posters
console.log('4. Exporting WebP posters...')
for (const name of ['s0', 's_empty', 'o1', 'o2', 'o3', 'o4']) {
  spawnSync(FFMPEG, [
    '-y',
    '-i', path.join(SRC_DIR, `${name}.png`),
    '-c:v', 'libwebp',
    '-quality', name === 's0' ? '85' : '82',
    path.join(OUT_DIR, `${name}.webp`),
  ])
}

// 5. Write config.json
const config = {
  edgeColor,
  autoOpenFirst: true,
  durations,
  posters: {
    s0: '/assets/hero/s0.webp',
    sEmpty: '/assets/hero/s_empty.webp',
    open: ['/assets/hero/o1.webp', '/assets/hero/o2.webp', '/assets/hero/o3.webp', '/assets/hero/o4.webp'],
  },
  clips: {
    intro: { mp4: '/assets/hero/intro.mp4', webm: '/assets/hero/intro.webm' },
    open: [1, 2, 3, 4].map((i) => ({ mp4: `/assets/hero/open_${i}.mp4`, webm: `/assets/hero/open_${i}.webm` })),
    close: [1, 2, 3, 4].map((i) => ({ mp4: `/assets/hero/close_${i}.mp4`, webm: `/assets/hero/close_${i}.webm` })),
  },
  products: [
    {
      index: 0,
      id: 'lodos-pro',
      slug: 'lodos-pro-miknatisli-deri-cuzdan',
      tabLabel: '01 Lodos Pro',
      name: 'Lodos Pro',
      categoryLabel: 'MIKNATISLI DERİ CÜZDAN',
      price: '1.600 TL',
      colorCount: 3,
      url: '/urun/lodos-pro-miknatisli-deri-cuzdan/',
      hotspot: { x: 11.2, y: 35.8, w: 19.0, h: 40.5 },
    },
    {
      index: 1,
      id: 'lodos',
      slug: 'lodos-miknatisli-deri-cuzdan',
      tabLabel: '02 Lodos',
      name: 'Lodos',
      categoryLabel: 'MIKNATISLI DERİ CÜZDAN',
      price: '1.500 TL',
      colorCount: 5,
      url: '/urun/lodos-miknatisli-deri-cuzdan/',
      hotspot: { x: 32.0, y: 36.0, w: 18.0, h: 40.2 },
    },
    {
      index: 2,
      id: 'garbi',
      slug: 'garbi-mandalli-deri-cuzdan',
      tabLabel: '03 Garbi',
      name: 'Garbi',
      categoryLabel: 'KLASİK DERİ CÜZDAN',
      price: '1.400 TL',
      colorCount: 4,
      url: '/urun/garbi-mandalli-deri-cuzdan/',
      hotspot: { x: 52.0, y: 36.8, w: 17.8, h: 39.5 },
    },
    {
      index: 3,
      id: 'kesisleme',
      slug: 'kesisleme-klasik-deri-cuzdan',
      tabLabel: '04 Keşişleme',
      name: 'Keşişleme',
      categoryLabel: 'KLASİK DERİ CÜZDAN',
      price: '1.499 TL',
      colorCount: 3,
      url: '/urun/kesisleme-klasik-deri-cuzdan/',
      hotspot: { x: 71.5, y: 38.0, w: 18.5, h: 38.2 },
    },
  ],
}

fs.writeFileSync(path.join(OUT_DIR, 'config.json'), JSON.stringify(config, null, 2))

console.log('\n=== SSIM VERIFICATION ===')
console.log(JSON.stringify(ssimResults, null, 2))

console.log('\n=== ASSET SIZES ===')
for (const f of fs.readdirSync(OUT_DIR).sort()) {
  const bytes = fs.statSync(path.join(OUT_DIR, f)).size
  console.log(`${f.padEnd(18)} ${(bytes / 1024).toFixed(1)} KB`)
}
