(() => {
  const TOTAL_FRAMES = 144;
  const section = document.getElementById('portfolio');
  const images = document.querySelectorAll('.turntable-img');
  if (!section || !images.length) return;

  // Preload frames for each turntable, with a frame offset per holder
  const FRAME_OFFSET = Math.round(TOTAL_FRAMES / 8); // 45° offset (144/8 = 18 frames)

  const turntables = Array.from(images).map((img, index) => {
    const folder = img.dataset.folder;
    const frames = [];
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const frame = new Image();
      frame.src = `img/${folder}/frame_${String(i).padStart(3, '0')}.webp`;
      frames.push(frame);
    }
    return { img, frames, currentFrame: -1, offset: index * FRAME_OFFSET };
  });

  function showFrame(t, index) {
    const clamped = ((index % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
    if (clamped !== t.currentFrame && t.frames[clamped].complete) {
      t.currentFrame = clamped;
      t.img.src = t.frames[clamped].src;
    }
  }

  function onScroll() {
    const rect = section.getBoundingClientRect();
    const windowH = window.innerHeight;
    const progress = 1 - (rect.bottom / (windowH + rect.height));
    const clamped = Math.max(0, Math.min(1, progress));
    const frameIndex = Math.floor(clamped * (TOTAL_FRAMES - 1));

    turntables.forEach((t) => showFrame(t, frameIndex + t.offset));
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
