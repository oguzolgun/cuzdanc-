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

// Helper: sample RGB+Alpha from an RGBA-like (rgbBuf + alphaMask) with bilinear filtering
function sampleSpriteBilinear(rgbBuf, alphaMask, sx, sy, dstOut) {
  if (sx < 0 || sx >= W - 1 || sy < 0 || sy >= H - 1) return 0
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  const fx = sx - x0
  const fy = sy - y0

  const p00 = y0 * W + x0
  const p10 = p00 + 1
  const p01 = p00 + W
  const p11 = p01 + 1

  const w00 = (1 - fx) * (1 - fy)
  const w10 = fx * (1 - fy)
  const w01 = (1 - fx) * fy
  const w11 = fx * fy

  const a = alphaMask[p00] * w00 + alphaMask[p10] * w10 + alphaMask[p01] * w01 + alphaMask[p11] * w11
  if (a <= 0.005) return 0

  const i00 = p00 * 3
  const i10 = p10 * 3
  const i01 = p01 * 3
  const i11 = p11 * 3

  dstOut[0] = rgbBuf[i00] * w00 + rgbBuf[i10] * w10 + rgbBuf[i01] * w01 + rgbBuf[i11] * w11
  dstOut[1] = rgbBuf[i00 + 1] * w00 + rgbBuf[i10 + 1] * w10 + rgbBuf[i01 + 1] * w01 + rgbBuf[i11 + 1] * w11
  dstOut[2] = rgbBuf[i00 + 2] * w00 + rgbBuf[i10 + 2] * w10 + rgbBuf[i01 + 2] * w01 + rgbBuf[i11 + 2] * w11
  return a
}

function getMaskBounds(mask, xMin, xMax, yMin, yMax) {
  let bx0 = W, by0 = H, bx1 = 0, by1 = 0, count = 0
  for (let y = yMin; y <= yMax; y++) {
    for (let x = xMin; x <= xMax; x++) {
      if (mask[y * W + x] > 0.2) {
        if (x < bx0) bx0 = x
        if (x > bx1) bx1 = x
        if (y < by0) by0 = y
        if (y > by1) by1 = y
        count++
      }
    }
  }
  if (count === 0) return { x0: xMin, y0: yMin, x1: xMax, y1: yMax, cx: (xMin + xMax) / 2, cy: (yMin + yMax) / 2 }
  return { x0: bx0, y0: by0, x1: bx1, y1: by1, cx: (bx0 + bx1) / 2, cy: (by0 + by1) / 2 }
}

function dilateMask(mask, radius) {
  const out = new Float32Array(mask)
  for (let y = radius; y < H - radius; y++) {
    for (let x = radius; x < W - radius; x++) {
      if (mask[y * W + x] > 0.8) continue
      let maxV = mask[y * W + x]
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const v = mask[(y + dy) * W + (x + dx)]
          if (v > maxV) maxV = v
        }
      }
      out[y * W + x] = maxV
    }
  }
  return out
}

function fillMaskHoles(mask, xMin, xMax, yMin, yMax) {
  const out = new Float32Array(mask)
  // Horizontal scanline fill: between leftmost and rightmost >0.65 pixel per row (only fill small interior gaps <= 28px)
  for (let y = yMin; y <= yMax; y++) {
    let lastX = -1
    for (let x = xMin; x <= xMax; x++) {
      if (out[y * W + x] > 0.65) {
        if (lastX >= 0 && x - lastX > 1 && x - lastX <= 28) {
          for (let fx = lastX + 1; fx < x; fx++) {
            out[y * W + fx] = 1
          }
        }
        lastX = x
      }
    }
  }
  // Vertical scanline fill for any remaining small interior pockets (<= 28px)
  for (let x = xMin; x <= xMax; x++) {
    let lastY = -1
    for (let y = yMin; y <= yMax; y++) {
      if (out[y * W + x] > 0.65) {
        if (lastY >= 0 && y - lastY > 1 && y - lastY <= 28) {
          for (let fy = lastY + 1; fy < y; fy++) {
            out[fy * W + x] = 1
          }
        }
        lastY = y
      }
    }
  }
  return out
}

function extractLargestUpperComponent(mask, xMin, xMax, yMin, yMax) {
  const visited = new Uint8Array(W * H)
  let bestComp = []
  const queue = new Int32Array(W * H)

  for (let y = yMin; y <= Math.min(yMax, 310); y++) {
    for (let x = xMin; x <= xMax; x++) {
      const startP = y * W + x
      if (visited[startP] || mask[startP] <= 0.35) continue
      let head = 0
      let tail = 0
      queue[tail++] = startP
      visited[startP] = 1
      const comp = []

      while (head < tail) {
        const p = queue[head++]
        comp.push(p)
        const px = p % W
        const py = (p - px) / W
        const neighbors = [
          px > xMin ? p - 1 : -1,
          px < xMax ? p + 1 : -1,
          py > yMin ? p - W : -1,
          py < yMax ? p + W : -1,
        ]
        for (const np of neighbors) {
          if (np >= 0 && !visited[np] && mask[np] > 0.25) {
            visited[np] = 1
            queue[tail++] = np
          }
        }
      }

      if (comp.length > bestComp.length) {
        bestComp = comp
      }
    }
  }

  const out = new Float32Array(W * H)
  for (const p of bestComp) {
    out[p] = mask[p]
  }
  return out
}

const openRois = [
  { x0: 210, x1: 685, y0: 120, y1: 445 }, // o1: Lodos Pro
  { x0: 380, x1: 905, y0: 75, y1: 445 },  // o2: Lodos
  { x0: 475, x1: 915, y0: 135, y1: 472 }, // o3: Garbi
  { x0: 410, x1: 925, y0: 75, y1: 455 },  // o4: Etezyen
]

const openFrames = 26 // 0.87s @ 30fps — crisp snappy lift & flick-open
const tmpRgb = [0, 0, 0]

for (let idx = 0; idx < 4; idx++) {
  const num = idx + 1
  console.log(`3.${num} Synthesizing seamless solid lift open_${num} & close_${num}...`)
  const targetBuf = bufOpen[idx]
  const sb = slotBounds[idx]
  const roi = openRois[idx]
  const closedMask = slotMasks[idx]
  const closedBounds = getMaskBounds(closedMask, sb.x0, sb.x1 - 1, 240, trayLipY)

  // Build open floating wallet mask within tight ROI
  const openMaskRaw = new Float32Array(W * H)
  const regionY0 = roi.y0
  const regionY1 = roi.y1
  const regionX0 = roi.x0
  const regionX1 = roi.x1

  for (let y = regionY0; y <= regionY1; y++) {
    for (let x = regionX0; x <= regionX1; x++) {
      const p = y * W + x
      const i3 = p * 3
      const refBuf = (x >= sb.x0 && x < sb.x1 && y >= 240) ? bufEmpty : bufS0
      const diff =
        Math.abs(targetBuf[i3] - refBuf[i3]) +
        Math.abs(targetBuf[i3 + 1] - refBuf[i3 + 1]) +
        Math.abs(targetBuf[i3 + 2] - refBuf[i3 + 2])
      if (diff > 30) {
        openMaskRaw[p] = Math.min(1, (diff - 30) / 38)
      }
    }
  }
  // Keep ONLY the single connected floating wallet component (eliminates stray pixels on other wallets/lights)
  const openMaskSingle = extractLargestUpperComponent(openMaskRaw, regionX0, regionX1, regionY0, regionY1)
  const compBounds = getMaskBounds(openMaskSingle, regionX0, regionX1, regionY0, regionY1)
  const openMaskClosed = fillMaskHoles(openMaskSingle, compBounds.x0, compBounds.x1, compBounds.y0, compBounds.y1)
  const openMask = dilateMask(openMaskClosed, 2)
  const openBounds = getMaskBounds(openMask, regionX0, regionX1, regionY0, regionY1)

  // Locked background: s0 with slot `idx` cleanly emptied using s_empty
  const emptySlotBg = Buffer.from(bufS0)
  const dilatedClosed = dilateMask(closedMask, 5)
  for (let y = 235; y <= trayLipY + 4; y++) {
    for (let x = sb.x0; x < sb.x1; x++) {
      const p = y * W + x
      const a = dilatedClosed[p]
      if (a > 0.01) {
        const i3 = p * 3
        emptySlotBg[i3] = Math.round(emptySlotBg[i3] * (1 - a) + bufEmpty[i3] * a)
        emptySlotBg[i3 + 1] = Math.round(emptySlotBg[i3 + 1] * (1 - a) + bufEmpty[i3 + 1] * a)
        emptySlotBg[i3 + 2] = Math.round(emptySlotBg[i3 + 2] * (1 - a) + bufEmpty[i3 + 2] * a)
      }
    }
  }

  // Build exact final open frame: 100% locked emptySlotBg + solid openSprite
  const finalOpenFrame = Buffer.from(emptySlotBg)
  for (let y = regionY0; y <= regionY1; y++) {
    for (let x = regionX0; x <= regionX1; x++) {
      const p = y * W + x
      const a = openMask[p]
      if (a > 0.01) {
        const i3 = p * 3
        finalOpenFrame[i3] = Math.round(finalOpenFrame[i3] * (1 - a) + targetBuf[i3] * a)
        finalOpenFrame[i3 + 1] = Math.round(finalOpenFrame[i3 + 1] * (1 - a) + targetBuf[i3 + 1] * a)
        finalOpenFrame[i3 + 2] = Math.round(finalOpenFrame[i3 + 2] * (1 - a) + targetBuf[i3 + 2] * a)
      }
    }
  }

  const clipBuf = Buffer.alloc(openFrames * frameSize)

  for (let f = 0; f < openFrames; f++) {
    const dst = clipBuf.subarray(f * frameSize, (f + 1) * frameSize)
    if (f < 2) {
      bufS0.copy(dst)
      continue
    }
    if (f >= openFrames - 3) {
      finalOpenFrame.copy(dst)
      continue
    }

    const u = (f - 2) / (openFrames - 5) // 0..1

    // 100% locked background (other 3 wallets & tray never move or fade)
    emptySlotBg.copy(dst)

    // Smooth continuous arc from closed slot center -> open floating center
    const moveT = easeInOutCubic(u)
    const curCx = closedBounds.cx + (openBounds.cx - closedBounds.cx) * moveT
    const curCy = closedBounds.cy + (openBounds.cy - closedBounds.cy) * moveT - Math.sin(moveT * Math.PI) * 18

    // Closed wallet lifts out 100% opaque (0..0.34), fast 3-frame flick-open (0.34..0.48), open wallet settles 100% opaque (0.48..1.0)
    const closedAlpha = u < 0.34 ? 1 : u > 0.48 ? 0 : 1 - easeInOutCubic((u - 0.34) / 0.14)
    const openAlpha = u < 0.34 ? 0 : u > 0.48 ? 1 : easeInOutCubic((u - 0.34) / 0.14)

    if (closedAlpha > 0.01) {
      const scaleClosed = 1 + 0.24 * Math.min(1, u / 0.48)
      const halfW = ((closedBounds.x1 - closedBounds.x0) / 2) * scaleClosed + 4
      const halfH = ((closedBounds.y1 - closedBounds.y0) / 2) * scaleClosed + 4
      const minX = Math.max(0, Math.floor(curCx - halfW))
      const maxX = Math.min(W - 1, Math.ceil(curCx + halfW))
      const minY = Math.max(0, Math.floor(curCy - halfH))
      const maxY = Math.min(H - 1, Math.ceil(curCy + halfH))

      for (let y = minY; y <= maxY; y++) {
        if (moveT < 0.22 && y > trayLipY) continue
        const sy = (y - curCy) / scaleClosed + closedBounds.cy
        if (sy < closedBounds.y0 || sy > closedBounds.y1) continue
        for (let x = minX; x <= maxX; x++) {
          const sx = (x - curCx) / scaleClosed + closedBounds.cx
          if (sx < closedBounds.x0 || sx > closedBounds.x1) continue
          const a = sampleSpriteBilinear(bufS0, closedMask, sx, sy, tmpRgb) * closedAlpha
          if (a > 0.01) {
            const i3 = (y * W + x) * 3
            dst[i3] = Math.round(dst[i3] * (1 - a) + tmpRgb[0] * a)
            dst[i3 + 1] = Math.round(dst[i3 + 1] * (1 - a) + tmpRgb[1] * a)
            dst[i3 + 2] = Math.round(dst[i3 + 2] * (1 - a) + tmpRgb[2] * a)
          }
        }
      }
    }

    if (openAlpha > 0.01) {
      const openGrow = u <= 0.34 ? 0 : easeOutCubic(Math.min(1, (u - 0.34) / 0.66))
      const scaleOpenY = 0.86 + 0.14 * openGrow
      const scaleOpenX = 0.78 + 0.22 * openGrow
      const halfW = ((openBounds.x1 - openBounds.x0) / 2) * scaleOpenX + 4
      const halfH = ((openBounds.y1 - openBounds.y0) / 2) * scaleOpenY + 4
      const minX = Math.max(0, Math.floor(curCx - halfW))
      const maxX = Math.min(W - 1, Math.ceil(curCx + halfW))
      const minY = Math.max(0, Math.floor(curCy - halfH))
      const maxY = Math.min(H - 1, Math.ceil(curCy + halfH))

      for (let y = minY; y <= maxY; y++) {
        const sy = (y - curCy) / scaleOpenY + openBounds.cy
        if (sy < openBounds.y0 || sy > openBounds.y1) continue
        for (let x = minX; x <= maxX; x++) {
          const sx = (x - curCx) / scaleOpenX + openBounds.cx
          if (sx < openBounds.x0 || sx > openBounds.x1) continue
          const a = sampleSpriteBilinear(targetBuf, openMask, sx, sy, tmpRgb) * openAlpha
          if (a > 0.01) {
            const i3 = (y * W + x) * 3
            dst[i3] = Math.round(dst[i3] * (1 - a) + tmpRgb[0] * a)
            dst[i3 + 1] = Math.round(dst[i3 + 1] * (1 - a) + tmpRgb[1] * a)
            dst[i3 + 2] = Math.round(dst[i3 + 2] * (1 - a) + tmpRgb[2] * a)
          }
        }
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

// 4. Export WebP posters (o1..o4 from exact last frame of open_i.mp4 so poster === video end frame)
console.log('4. Exporting WebP posters...')
for (const name of ['s0', 's_empty']) {
  spawnSync(FFMPEG, [
    '-y',
    '-i', path.join(SRC_DIR, `${name}.png`),
    '-c:v', 'libwebp',
    '-quality', name === 's0' ? '85' : '82',
    path.join(OUT_DIR, `${name}.webp`),
  ])
}
for (let i = 1; i <= 4; i++) {
  spawnSync(FFMPEG, [
    '-y',
    '-sseof', '-0.05',
    '-i', path.join(OUT_DIR, `open_${i}.mp4`),
    '-frames:v', '1',
    '-c:v', 'libwebp',
    '-quality', '84',
    path.join(OUT_DIR, `o${i}.webp`),
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
      id: 'etezyen',
      slug: 'etezyen-klasik-deri-cuzdan',
      tabLabel: '04 Etezyen',
      name: 'Etezyen',
      categoryLabel: 'KLASİK DERİ CÜZDAN',
      price: '1.499 TL',
      colorCount: 3,
      url: '/urun/etezyen-klasik-deri-cuzdan/',
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
