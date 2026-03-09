(() => {
  // =============================================
  // SHARED STATE
  // =============================================
  let holderColour = '#bdb8ae';
  let detailColour = '#2a2a2a';
  let primaryText = 'JANE';
  let secondaryText = 'DOE';
  let logoImage = null;
  let logoTrimBounds = null;
  let removeWhiteBg = true;

  // Holder shape constants (shared between 2D texture + 3D geometry)
  const HOLDER_W = 300;
  const HOLDER_H = 480;
  const CORNER_R = 40;
  const HEADER_H = 70;
  const SLOT_W = 120;
  const SLOT_H = 18;
  const HOLE_R = 10;
  const HOLE_INSET = 50;
  const THICKNESS = 12;

  // =============================================
  // DOM REFS
  // =============================================
  const colourInput = document.getElementById('holder-colour');
  const colourHex = document.getElementById('colour-hex');
  const detailColourInput = document.getElementById('detail-colour');
  const detailColourHex = document.getElementById('detail-colour-hex');
  const primaryInput = document.getElementById('primary-text');
  const secondaryInput = document.getElementById('secondary-text');
  const dropzone = document.getElementById('logo-dropzone');
  const fileInput = document.getElementById('logo-upload');
  const logoInfo = document.getElementById('logo-info');
  const logoRemove = document.getElementById('logo-remove');
  const whiteBgToggle = document.getElementById('remove-white-bg');
  const downloadBtn = document.getElementById('download-preview');
  const quoteBtn = document.getElementById('get-quote');

  // =============================================
  // UTILITIES
  // =============================================
  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    };
  }

  // =============================================
  // 2D TEXTURE CANVAS (offscreen — generates the front-face texture)
  // =============================================
  const texCanvas = document.createElement('canvas');
  const ctx = texCanvas.getContext('2d');
  texCanvas.width = HOLDER_W * 2;
  texCanvas.height = HOLDER_H * 2;

  function roundRectPath(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function getTrimmedImageBounds(img) {
    const tc = document.createElement('canvas');
    const tCtx = tc.getContext('2d');
    tc.width = img.width;
    tc.height = img.height;
    tCtx.drawImage(img, 0, 0);
    const { data, width, height } = tCtx.getImageData(0, 0, img.width, img.height);
    let top = height, left = width, right = 0, bottom = 0, found = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 10) {
          found = true;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }
    if (!found) return { sx: 0, sy: 0, sw: width, sh: height };
    return { sx: left, sy: top, sw: right - left + 1, sh: bottom - top + 1 };
  }

  function createWhiteRemovedImage(img, threshold) {
    threshold = threshold === undefined ? 245 : threshold;
    const tc = document.createElement('canvas');
    const tCtx = tc.getContext('2d');
    tc.width = img.width;
    tc.height = img.height;
    tCtx.drawImage(img, 0, 0);
    const imageData = tCtx.getImageData(0, 0, img.width, img.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > threshold && d[i + 1] > threshold && d[i + 2] > threshold) d[i + 3] = 0;
    }
    tCtx.putImageData(imageData, 0, 0);
    const cleaned = new Image();
    cleaned.src = tc.toDataURL('image/png');
    return cleaned;
  }

  function drawTexture() {
    const s = 2; // scale factor for crisp texture
    const w = HOLDER_W * s;
    const h = HOLDER_H * s;
    ctx.clearRect(0, 0, w, h);

    // Fill with holder colour (base)
    ctx.fillStyle = holderColour;
    ctx.fillRect(0, 0, w, h);

    // Subtle gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(255,255,255,0.04)');
    grad.addColorStop(0.4, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.04)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Logo (engraved using detail colour)
    const logoAreaTop = (HEADER_H + 20) * s;
    const textAreaH = 100 * s;
    const logoAreaBottom = h - 25 * s - textAreaH;
    const logoMaxW = (HOLDER_W - 50) * s;
    const logoMaxH = logoAreaBottom - logoAreaTop;

    if (logoImage && logoTrimBounds && logoMaxH > 20) {
      const bounds = logoTrimBounds;
      const aspect = bounds.sw / bounds.sh;
      let drawW, drawH;
      if (aspect > logoMaxW / Math.max(logoMaxH, 1)) {
        drawW = Math.min(logoMaxW, 220 * s);
        drawH = drawW / aspect;
      } else {
        drawH = Math.min(logoMaxH, 200 * s);
        drawW = drawH * aspect;
      }

      const logoX = w / 2 - drawW / 2;
      const logoY = logoAreaTop + (logoMaxH - drawH) / 2;

      // Draw tinted logo
      const off = document.createElement('canvas');
      const offCtx = off.getContext('2d');
      off.width = drawW;
      off.height = drawH;
      offCtx.drawImage(logoImage, bounds.sx, bounds.sy, bounds.sw, bounds.sh, 0, 0, drawW, drawH);
      offCtx.globalCompositeOperation = 'source-atop';
      offCtx.fillStyle = detailColour;
      offCtx.globalAlpha = 0.9;
      offCtx.fillRect(0, 0, drawW, drawH);

      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(off, logoX, logoY, drawW, drawH);
      ctx.restore();
    }

    // Text (engraved using detail colour)
    const textX = 28 * s;
    const textBaseY = h - 60 * s;
    const fontSize = 36 * s;

    ctx.save();
    ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'left';

    function drawEngravedText(text, x, y) {
      // Outline stroke
      ctx.lineWidth = 1.5 * s;
      ctx.strokeStyle = detailColour;
      ctx.strokeText(text, x, y);
      // Fill
      ctx.fillStyle = detailColour;
      ctx.globalAlpha = 0.85;
      ctx.fillText(text, x, y);
      ctx.globalAlpha = 1;
    }

    if (secondaryText.trim()) {
      drawEngravedText(secondaryText.toUpperCase(), textX, textBaseY);
    }
    if (primaryText.trim()) {
      const lineGap = secondaryText.trim() ? (fontSize + 8 * s) : 0;
      drawEngravedText(primaryText.toUpperCase(), textX, textBaseY - lineGap);
    }
    ctx.restore();
  }

  // =============================================
  // THREE.JS 3D SCENE
  // =============================================
  const container = document.getElementById('three-container');
  if (!container || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(40, 400 / 560, 0.1, 2000);
  camera.position.set(0, 0, 700);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(400, 560);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(200, 300, 500);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-200, -100, 300);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
  rimLight.position.set(0, 0, -400);
  scene.add(rimLight);

  // OrbitControls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = true;
  controls.minDistance = 400;
  controls.maxDistance = 1000;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;
  controls.target.set(0, 0, 0);

  controls.addEventListener('start', () => { controls.autoRotate = false; });

  // --- Build 3D holder shape ---
  function buildHolderShape() {
    const w = HOLDER_W;
    const h = HOLDER_H;
    const r = CORNER_R;

    // Outer rounded rectangle (Y-up: bottom-left is origin)
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

    // Lanyard slot hole (rounded rect)
    const slotCY = h / 2 - HEADER_H / 2;
    const slotPath = new THREE.Path();
    const sr = SLOT_H / 2;
    slotPath.moveTo(-SLOT_W / 2 + sr, slotCY - SLOT_H / 2);
    slotPath.lineTo(SLOT_W / 2 - sr, slotCY - SLOT_H / 2);
    slotPath.quadraticCurveTo(SLOT_W / 2, slotCY - SLOT_H / 2, SLOT_W / 2, slotCY - SLOT_H / 2 + sr);
    slotPath.lineTo(SLOT_W / 2, slotCY + SLOT_H / 2 - sr);
    slotPath.quadraticCurveTo(SLOT_W / 2, slotCY + SLOT_H / 2, SLOT_W / 2 - sr, slotCY + SLOT_H / 2);
    slotPath.lineTo(-SLOT_W / 2 + sr, slotCY + SLOT_H / 2);
    slotPath.quadraticCurveTo(-SLOT_W / 2, slotCY + SLOT_H / 2, -SLOT_W / 2, slotCY + SLOT_H / 2 - sr);
    slotPath.lineTo(-SLOT_W / 2, slotCY - SLOT_H / 2 + sr);
    slotPath.quadraticCurveTo(-SLOT_W / 2, slotCY - SLOT_H / 2, -SLOT_W / 2 + sr, slotCY - SLOT_H / 2);
    shape.holes.push(slotPath);

    // Corner holes (circles)
    const holeCY = slotCY;
    const segments = 32;

    const leftHole = new THREE.Path();
    leftHole.absarc(-w / 2 + HOLE_INSET, holeCY, HOLE_R, 0, Math.PI * 2, false);
    shape.holes.push(leftHole);

    const rightHole = new THREE.Path();
    rightHole.absarc(w / 2 - HOLE_INSET, holeCY, HOLE_R, 0, Math.PI * 2, false);
    shape.holes.push(rightHole);

    return shape;
  }

  // Materials and mesh
  const frontTexture = new THREE.CanvasTexture(texCanvas);
  frontTexture.encoding = THREE.sRGBEncoding;

  let frontMaterial = new THREE.MeshStandardMaterial({
    map: frontTexture,
    roughness: 0.6,
    metalness: 0.1,
  });

  let backMaterial = new THREE.MeshStandardMaterial({
    color: holderColour,
    roughness: 0.6,
    metalness: 0.1,
  });

  let sideMaterial = new THREE.MeshStandardMaterial({
    color: holderColour,
    roughness: 0.5,
    metalness: 0.1,
  });

  let holderMesh = null;

  function buildMesh() {
    if (holderMesh) scene.remove(holderMesh);

    const shape = buildHolderShape();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: THICKNESS,
      bevelEnabled: true,
      bevelThickness: 2,
      bevelSize: 2,
      bevelSegments: 3,
      curveSegments: 32,
    });

    // Fix UV mapping for front face to map to our texture canvas
    const posAttr = geometry.attributes.position;
    const uvAttr = geometry.attributes.uv;
    const normalAttr = geometry.attributes.normal;

    for (let i = 0; i < posAttr.count; i++) {
      const nz = normalAttr.getZ(i);
      // Front face (normal pointing towards +Z)
      if (nz > 0.9) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);
        // Map from shape coords to 0-1 UV
        // Shape goes from -HOLDER_W/2 to HOLDER_W/2 in X
        // and -HOLDER_H/2 to HOLDER_H/2 in Y
        const u = (px + HOLDER_W / 2) / HOLDER_W;
        const v = (py + HOLDER_H / 2) / HOLDER_H;
        uvAttr.setXY(i, u, v);
      }
    }
    uvAttr.needsUpdate = true;

    // Assign material groups: ExtrudeGeometry creates groups [0]=front, [1]=back, [2]=sides
    holderMesh = new THREE.Mesh(geometry, [frontMaterial, sideMaterial, sideMaterial]);
    holderMesh.position.set(0, 0, -THICKNESS / 2);
    scene.add(holderMesh);
  }

  // --- Update everything ---
  function update() {
    drawTexture();
    frontTexture.needsUpdate = true;
    backMaterial.color.set(holderColour);
    sideMaterial.color.set(holderColour);
  }

  // --- Render loop ---
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  // =============================================
  // EVENT HANDLING
  // =============================================
  function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }

  colourInput.addEventListener('input', (e) => {
    holderColour = e.target.value;
    colourHex.textContent = e.target.value.toUpperCase();
    update();
  });

  detailColourInput.addEventListener('input', (e) => {
    detailColour = e.target.value;
    detailColourHex.textContent = e.target.value.toUpperCase();
    update();
  });

  primaryInput.addEventListener('input', debounce((e) => {
    primaryText = e.target.value;
    update();
  }, 150));

  secondaryInput.addEventListener('input', debounce((e) => {
    secondaryText = e.target.value;
    update();
  }, 150));

  whiteBgToggle.addEventListener('change', () => {
    removeWhiteBg = whiteBgToggle.checked;
    if (fileInput.files && fileInput.files[0]) processUploadedImage(fileInput.files[0]);
  });

  // --- Logo upload ---
  function processUploadedImage(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = new Image();
      raw.onload = () => {
        if (removeWhiteBg) {
          const cleaned = createWhiteRemovedImage(raw);
          cleaned.onload = () => {
            logoImage = cleaned;
            logoTrimBounds = getTrimmedImageBounds(cleaned);
            update();
          };
          if (cleaned.complete && cleaned.naturalWidth > 0) {
            logoImage = cleaned;
            logoTrimBounds = getTrimmedImageBounds(cleaned);
            update();
          }
        } else {
          logoImage = raw;
          logoTrimBounds = getTrimmedImageBounds(raw);
          update();
        }
      };
      raw.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('Logo must be under 5MB.'); return; }
    logoInfo.textContent = file.name;
    logoRemove.classList.remove('hidden');
    dropzone.classList.add('has-logo');
    processUploadedImage(file);
  }

  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
  });

  logoRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    logoImage = null;
    logoTrimBounds = null;
    fileInput.value = '';
    logoInfo.textContent = 'Click or drag to upload';
    logoRemove.classList.add('hidden');
    dropzone.classList.remove('has-logo');
    update();
  });

  // Download (captures the 3D view)
  downloadBtn.addEventListener('click', () => {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = 'fusion-creations-preview.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
  });

  // Get a quote
  quoteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const msg = document.getElementById('message');
    if (msg) {
      const text = [primaryText, secondaryText].filter(Boolean).join(' ');
      msg.value = `Hi, I'd like a quote for custom ID card holders.\n\nText: ${text}\nHolder colour: ${holderColour.toUpperCase()}\nDetail colour: ${detailColour.toUpperCase()}\n\nLooking forward to hearing from you!`;
    }
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
  });

  // --- Init ---
  document.fonts.ready.then(() => {
    buildMesh();
    update();
    animate();
  });
})();
