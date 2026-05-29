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
  let logoScale = 1.0;    // 0.3 – 2.0
  let fontScale = 1.0;    // 0.3 – 2.0

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
  const logoScaleInput = document.getElementById('logo-scale');
  const logoScaleValue = document.getElementById('logo-scale-value');
  const fontScaleInput = document.getElementById('font-scale');
  const fontScaleValue = document.getElementById('font-scale-value');
  const downloadBtn = document.getElementById('download-preview');
  const quoteBtn = document.getElementById('get-quote');

  // =============================================
  // UTILITIES
  // =============================================
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

  // =============================================
  // 2D OVERLAY TEXTURE (transparent canvas for logo + text)
  // =============================================
  const TEX_W = 600;
  const TEX_H = 960;
  const texCanvas = document.createElement('canvas');
  const ctx = texCanvas.getContext('2d');
  texCanvas.width = TEX_W;
  texCanvas.height = TEX_H;

  function drawOverlayTexture() {
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    // We'll measure layout relative to the holder face.
    // Top ~15% is header (lanyard area), logo goes in middle, text at bottom.
    const headerH = TEX_H * 0.15;
    const textAreaH = TEX_H * 0.2;
    const logoAreaTop = headerH + TEX_H * 0.04;
    const logoAreaBottom = TEX_H - textAreaH - TEX_H * 0.04;
    const logoMaxW = TEX_W * 0.75;
    const logoMaxH = logoAreaBottom - logoAreaTop;

    // Logo
    if (logoImage && logoTrimBounds && logoMaxH > 20) {
      const bounds = logoTrimBounds;
      const aspect = bounds.sw / bounds.sh;
      let drawW, drawH;
      if (aspect > logoMaxW / Math.max(logoMaxH, 1)) {
        drawW = Math.min(logoMaxW, TEX_W * 0.7);
        drawH = drawW / aspect;
      } else {
        drawH = Math.min(logoMaxH, TEX_H * 0.4);
        drawW = drawH * aspect;
      }
      drawW *= logoScale;
      drawH *= logoScale;

      const logoX = TEX_W / 2 - drawW / 2;
      const logoY = logoAreaTop + (logoMaxH - drawH) / 2;

      // Tint logo with detail colour
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

    // Text
    const fontSize = Math.round(72 * fontScale);
    const textX = TEX_W * 0.09;
    const textBaseY = TEX_H - TEX_H * 0.1;

    ctx.save();
    ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'left';

    function drawText(text, x, y) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = detailColour;
      ctx.strokeText(text, x, y);
      ctx.fillStyle = detailColour;
      ctx.globalAlpha = 0.85;
      ctx.fillText(text, x, y);
      ctx.globalAlpha = 1;
    }

    if (secondaryText.trim()) {
      drawText(secondaryText.toUpperCase(), textX, textBaseY);
    }
    if (primaryText.trim()) {
      const lineGap = secondaryText.trim() ? (fontSize + 12) : 0;
      drawText(primaryText.toUpperCase(), textX, textBaseY - lineGap);
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
  camera.position.set(0, 200, 500);

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
  controls.minDistance = 100;
  controls.maxDistance = 800;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;

  controls.addEventListener('start', () => { controls.autoRotate = false; });

  // =============================================
  // MATERIALS
  // =============================================
  const holderMaterial = new THREE.MeshStandardMaterial({
    color: holderColour,
    roughness: 0.45,
    metalness: 0.05,
  });

  // Overlay texture for custom logo + text
  const overlayTexture = new THREE.CanvasTexture(texCanvas);
  overlayTexture.encoding = THREE.sRGBEncoding;

  const overlayMaterial = new THREE.MeshBasicMaterial({
    map: overlayTexture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  // Track references
  let modelGroup = null;
  let overlayPlane = null;

  // =============================================
  // LOAD GLB MODEL
  // =============================================
  const loader = new THREE.GLTFLoader();

  loader.load('img/blank.glb', (gltf) => {
    modelGroup = gltf.scene;

    // Apply holder material to all meshes
    modelGroup.traverse((child) => {
      if (child.isMesh) {
        child.material = holderMaterial;
      }
    });

    // Centre and scale the model
    const box = new THREE.Box3().setFromObject(modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    modelGroup.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 300 / maxDim;
    modelGroup.scale.setScalar(scale);

    scene.add(modelGroup);

    // --- Create overlay plane for logo + text ---
    const scaledBox = new THREE.Box3().setFromObject(modelGroup);
    const sSize = scaledBox.getSize(new THREE.Vector3());
    const sCenter = scaledBox.getCenter(new THREE.Vector3());

    // Overlay covers the front face (XY plane at max Z)
    const planeW = sSize.x * 0.88;
    const planeH = sSize.y * 0.88;
    const planeGeo = new THREE.PlaneGeometry(planeW, planeH);
    overlayPlane = new THREE.Mesh(planeGeo, overlayMaterial);
    overlayPlane.position.set(sCenter.x, sCenter.y, scaledBox.max.z + 0.3);
    scene.add(overlayPlane);

    // Adjust camera and controls
    const dist = Math.max(sSize.x, sSize.y) * 1.8;
    camera.position.set(0, 0, dist);
    controls.target.set(0, 0, 0);
    controls.minDistance = dist * 0.5;
    controls.maxDistance = dist * 3;
    controls.update();

    // Initial draw
    update();
  });

  // =============================================
  // UPDATE
  // =============================================
  function update() {
    holderMaterial.color.set(holderColour);
    drawOverlayTexture();
    overlayTexture.needsUpdate = true;
  }

  // --- Render loop ---
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

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

  if (logoScaleInput) {
    logoScaleInput.addEventListener('input', (e) => {
      logoScale = parseFloat(e.target.value);
      logoScaleValue.textContent = Math.round(logoScale * 100) + '%';
      update();
    });
  }

  if (fontScaleInput) {
    fontScaleInput.addEventListener('input', (e) => {
      fontScale = parseFloat(e.target.value);
      fontScaleValue.textContent = Math.round(fontScale * 100) + '%';
      update();
    });
  }

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
    const personalisation = document.getElementById('personalisation');

    if (personalisation) personalisation.value = 'yes';

    if (msg) {
      const text = [primaryText, secondaryText].filter(Boolean).join(' ');
      const logoNote = logoImage ? 'Logo attached in preview' : 'No logo uploaded';
      msg.value = `Hi, I'd like a quote for custom ID card holders.\n\nText: ${text}\nHolder colour: ${holderColour.toUpperCase()}\nDetail colour: ${detailColour.toUpperCase()}\n${logoNote}\n\nLooking forward to hearing from you!`;
    }
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
  });
})();
