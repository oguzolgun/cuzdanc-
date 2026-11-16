/**
 * scroll-sequence.js - Elon Leather Reusable Scroll-Scrub Product Film Engine
 * 
 * Drives a canvas frame sequence synchronously with scroll progress.
 * Supports:
 *  - Responsive desktop (cover) & mobile (contain) aspect ratios
 *  - 2-tier progressive loading (every 4th frame first, then idle fill)
 *  - Lerp smoothing (factor ~0.1) on requestAnimationFrame
 *  - Connection & reduced-motion fallbacks
 *  - Zero wheel hijacking / native scroll only
 */

export function initScrollSequence(wrapperEl) {
  if (!wrapperEl) return;

  const canvas = wrapperEl.querySelector('canvas[data-seq-canvas]');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  // Configuration from data attributes or defaults
  const desktopSrc = wrapperEl.dataset.seqSrc || '/assets/sequence/rio/desktop/f_%04d.webp';
  const desktopFrames = parseInt(wrapperEl.dataset.seqFrames || '199', 10);
  const mobileSrc = wrapperEl.dataset.seqMobileSrc || '/assets/sequence/rio/mobile/f_%04d.webp';
  const mobileFrames = parseInt(wrapperEl.dataset.seqMobileFrames || '120', 10);
  const posterSrc = wrapperEl.dataset.seqPoster || '/assets/sequence/rio/poster.webp';
  const edgeColor = wrapperEl.dataset.seqEdgeColor || '#221b10';

  // Check fallbacks: prefers-reduced-motion, saveData, slow connections
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSaveData = conn && conn.saveData === true;
  const isSlowConnection = conn && ['slow-2g', '2g', '3g'].includes(conn.effectiveType);

  if (prefersReduced || isSaveData || isSlowConnection) {
    wrapperEl.classList.add('seq-fallback-mode');
    return;
  }

  let isMobile = window.innerWidth <= 768;
  let activeSrcPattern = isMobile ? mobileSrc : desktopSrc;
  let totalFrames = isMobile ? mobileFrames : desktopFrames;

  let frames = new Array(totalFrames).fill(null);
  let loadedCount = 0;
  let hasStartedLoading = false;
  let currentDrawnIndex = -1;
  let targetProgress = 0;
  let smoothedProgress = 0;
  let rafId = null;

  function getFrameUrl(index) {
    const numStr = String(index + 1).padStart(4, '0');
    return activeSrcPattern.replace('%04d', numStr);
  }

  // Draw frame on canvas with proper scaling & centering
  function drawFrame(img) {
    if (!img || !canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background to sampled edge color
    ctx.fillStyle = edgeColor;
    ctx.fillRect(0, 0, w, h);

    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    if (imgW === 0 || imgH === 0) {
      ctx.restore();
      return;
    }

    const imgRatio = imgW / imgH;
    const canvasRatio = w / h;

    let renderW, renderH, offsetX, offsetY;

    if (isMobile) {
      // Mobile contain mode - never crop the wallet
      if (canvasRatio > imgRatio) {
        renderH = h;
        renderW = h * imgRatio;
        offsetX = (w - renderW) / 2;
        offsetY = 0;
      } else {
        renderW = w;
        renderH = w / imgRatio;
        offsetX = 0;
        offsetY = (h - renderH) / 2;
      }
    } else {
      // Desktop cover mode - full atmospheric fill
      if (canvasRatio > imgRatio) {
        renderW = w;
        renderH = w / imgRatio;
        offsetX = 0;
        offsetY = (h - renderH) / 2;
      } else {
        renderH = h;
        renderW = h * imgRatio;
        offsetX = (w - renderW) / 2;
        offsetY = 0;
      }
    }

    ctx.drawImage(img, Math.round(offsetX), Math.round(offsetY), Math.round(renderW), Math.round(renderH));
    ctx.restore();
  }

  // Find nearest loaded frame for instant scrubbing response
  function getNearestLoadedFrame(targetIdx) {
    if (frames[targetIdx]) return frames[targetIdx];
    let step = 1;
    while (targetIdx - step >= 0 || targetIdx + step < frames.length) {
      if (targetIdx - step >= 0 && frames[targetIdx - step]) return frames[targetIdx - step];
      if (targetIdx + step < frames.length && frames[targetIdx + step]) return frames[targetIdx + step];
      step++;
    }
    return null;
  }

  // 2-tier loading strategy
  function startLoading() {
    if (hasStartedLoading) return;
    hasStartedLoading = true;

    // Phase 1: Load every 4th frame + first and last
    const phase1Indices = [];
    for (let i = 0; i < totalFrames; i += 4) {
      phase1Indices.push(i);
    }
    if (phase1Indices[phase1Indices.length - 1] !== totalFrames - 1) {
      phase1Indices.push(totalFrames - 1);
    }

    let p1Index = 0;
    const concurrency = 6;

    function loadNextPhase1() {
      if (p1Index >= phase1Indices.length) {
        startPhase2();
        return;
      }
      const idx = phase1Indices[p1Index++];
      const img = new Image();
      img.src = getFrameUrl(idx);
      img.decode().catch(() => {}).then(() => {
        frames[idx] = img;
        loadedCount++;
        // If this is the closest frame to current progress, draw it
        const currentTargetIdx = Math.round(smoothedProgress * (totalFrames - 1));
        if (Math.abs(currentTargetIdx - idx) <= 2 && currentDrawnIndex === -1) {
          drawFrame(img);
          currentDrawnIndex = idx;
        }
        loadNextPhase1();
      });
    }

    for (let c = 0; c < concurrency; c++) {
      loadNextPhase1();
    }

    // Phase 2: Load remaining frames in idle time
    function startPhase2() {
      const remaining = [];
      for (let i = 0; i < totalFrames; i++) {
        if (!frames[i]) remaining.push(i);
      }

      let rIdx = 0;
      function idleStep(deadline) {
        while ((deadline.timeRemaining() > 5 || deadline.didTimeout) && rIdx < remaining.length) {
          const idx = remaining[rIdx++];
          const img = new Image();
          img.src = getFrameUrl(idx);
          img.decode().catch(() => {}).then(() => {
            frames[idx] = img;
            loadedCount++;
          });
        }
        if (rIdx < remaining.length) {
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(idleStep, { timeout: 1000 });
          } else {
            setTimeout(() => idleStep({ timeRemaining: () => 10, didTimeout: true }), 50);
          }
        }
      }

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(idleStep, { timeout: 1000 });
      } else {
        setTimeout(() => idleStep({ timeRemaining: () => 10, didTimeout: true }), 50);
      }
    }
  }

  // Animation Loop
  function tick() {
    const rect = wrapperEl.getBoundingClientRect();
    const maxScroll = rect.height - window.innerHeight;

    if (maxScroll > 0) {
      const rawProgress = -rect.top / maxScroll;
      targetProgress = Math.min(Math.max(rawProgress, 0), 1);
    }

    // Lerp smoothing
    const diff = targetProgress - smoothedProgress;
    if (Math.abs(diff) > 0.0001) {
      smoothedProgress += diff * 0.1;
    } else {
      smoothedProgress = targetProgress;
    }

    const frameIdx = Math.round(smoothedProgress * (totalFrames - 1));
    if (frameIdx !== currentDrawnIndex) {
      const bestFrame = getNearestLoadedFrame(frameIdx);
      if (bestFrame) {
        drawFrame(bestFrame);
        currentDrawnIndex = frameIdx;
      }
    }

    // Dispatch custom progress event for synced story cards & progress rail
    wrapperEl.dispatchEvent(new CustomEvent('seq:progress', {
      detail: { progress: smoothedProgress, targetProgress }
    }));

    rafId = requestAnimationFrame(tick);
  }

  // Observe wrapper entering within 1.5 screens (protect LCP)
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        startLoading();
      }
    }
  }, { rootMargin: '150% 0px' });

  observer.observe(wrapperEl);

  // Resize handler
  function handleResize() {
    const newIsMobile = window.innerWidth <= 768;
    if (newIsMobile !== isMobile) {
      isMobile = newIsMobile;
      activeSrcPattern = isMobile ? mobileSrc : desktopSrc;
      totalFrames = isMobile ? mobileFrames : desktopFrames;
      frames = new Array(totalFrames).fill(null);
      hasStartedLoading = false;
      startLoading();
    }
    const currentFrame = getNearestLoadedFrame(Math.round(smoothedProgress * (totalFrames - 1)));
    if (currentFrame) drawFrame(currentFrame);
  }

  window.addEventListener('resize', handleResize, { passive: true });

  // Start animation loop
  rafId = requestAnimationFrame(tick);

  return function cleanup() {
    observer.disconnect();
    window.removeEventListener('resize', handleResize);
    if (rafId) cancelAnimationFrame(rafId);
  };
}
