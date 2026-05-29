(() => {
  const TOTAL_FRAMES = 144;
  const PRELOAD_RADIUS = 3;
  const OFFSETS = [0, 12, -12];

  const section = document.getElementById('portfolio');
  const images = document.querySelectorAll('.turntable-img');
  if (!section || !images.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  if (prefersReducedMotion || smallScreen) return;

  const turntables = Array.from(images).map((img, index) => ({
    img,
    folder: img.dataset.folder,
    frames: new Map(),
    currentFrame: -1,
    targetFrame: -1,
    offset: OFFSETS[index] || 0,
  }));

  function normaliseIndex(index) {
    return ((index % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
  }

  function getFrame(t, index) {
    const frameIndex = normaliseIndex(index);
    if (!t.frames.has(frameIndex)) {
      const frame = new Image();
      frame.src = `img/${t.folder}/frame_${String(frameIndex + 1).padStart(3, '0')}.webp`;
      t.frames.set(frameIndex, frame);
    }
    return t.frames.get(frameIndex);
  }

  function preloadNearbyFrames(t, index) {
    for (let offset = -PRELOAD_RADIUS; offset <= PRELOAD_RADIUS; offset++) {
      getFrame(t, index + offset);
    }
  }

  function showFrame(t, index) {
    const frameIndex = normaliseIndex(index);
    const frame = getFrame(t, frameIndex);
    t.targetFrame = frameIndex;
    preloadNearbyFrames(t, frameIndex);

    if (frameIndex === t.currentFrame) return;

    if (frame.complete) {
      t.currentFrame = frameIndex;
      t.img.src = frame.src;
      return;
    }

    frame.onload = () => {
      if (frameIndex !== t.targetFrame || frameIndex === t.currentFrame) return;
      t.currentFrame = frameIndex;
      t.img.src = frame.src;
    };
  }

  function onScroll() {
    const rect = section.getBoundingClientRect();
    const windowH = window.innerHeight;
    const progress = 1 - (rect.bottom / (windowH + rect.height));
    const clamped = Math.max(0, Math.min(1, progress));
    const frameIndex = Math.floor(clamped * (TOTAL_FRAMES - 1));

    turntables.forEach((t) => showFrame(t, frameIndex + t.offset));
  }

  function start() {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        start();
        observer.disconnect();
      }
    }, { rootMargin: '500px 0px' });
    observer.observe(section);
  } else {
    start();
  }
})();
