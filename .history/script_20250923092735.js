// Fish movement prototype: slow downward drift, space = up/forward, 3 speeds (←/→)
(function () {
  const fish = document.getElementById('fish');
  const sprite = fish ? fish.querySelector('.sprite') : null;
  const boat = document.querySelector('.boat');
  const lineEl = boat ? boat.querySelector('.line') : null;
  const hookEl = boat ? boat.querySelector('.hook') : null;
  const plantsGroup = document.querySelector('#aquarium-bg #plants');
  // (reverted) no rod group rotation
  const armPath = boat ? boat.querySelector('#arm') : null;
  const rodPath = boat ? boat.querySelector('#rod') : null;
  if (!fish) return;

  // Ensure fish faces right
  // using CSS flip on child span; no need to set text here

  const BASE_SPEEDS = [1, 3, 6];
  let speedIndex = 0;
  let dir = 1; // 1 = left→right, -1 = right→left
  let speed = BASE_SPEEDS[speedIndex]; // signed pixels/frame after scaling

  let x = 24;
  let y = window.innerHeight * 0.5;
  let vy = 0;
  let spacePressed = false;
  let paused = false;
  function getFishHalfHeight() {
    try {
      const rect = (sprite || fish).getBoundingClientRect();
      return Math.max(8, (rect.height || 32) / 2);
    } catch (_) {
      return 16; // fallback for early frames
    }
  }

  // Tunables
  function scale() { return Math.max(0.8, Math.min(2.0, window.innerWidth / 1200)); }
  function gravity() { return 0.12 * scale(); } // slow drift downward
  function maxFall() { return 3.0 * scale(); }
  function maxRise() { return -4.0 * scale(); }

  function wrapX(nx) {
    const w = window.innerWidth;
    if (nx > w) return nx - w;
    if (nx < 0) return nx + w;
    return nx;
  }

  function updateSpeed() {
    speed = dir * (BASE_SPEEDS[speedIndex] * scale());
    // Update facing based on direction
    if (sprite) {
      if (dir === 1) {
        sprite.classList.remove('face-left');
        sprite.classList.add('face-right');
      } else {
        sprite.classList.remove('face-right');
        sprite.classList.add('face-left');
      }
    }
  }

  function loop() {
    if (paused) { requestAnimationFrame(loop); return; }
    // Horizontal progress
    x = wrapX(x + speed);

    // Vertical physics
    if (spacePressed) {
      vy = Math.max(maxRise(), vy - 0.45 * scale());
    } else {
      vy = Math.min(maxFall(), vy + gravity());
    }
    // Compute waterline as top at 1/6 viewport height
    const waterlineY = window.innerHeight / 6;
    // Keep the fish's center at least one pixel below the waterline + half its height
    const halfH = getFishHalfHeight();
    const topClamp = Math.max(0, waterlineY + halfH + 1);
    const bottomClamp = window.innerHeight - 40;
    y = Math.max(topClamp, Math.min(bottomClamp, y + vy));

    // Render
    fish.style.left = x + 'px';
    fish.style.top = y + 'px';

    // Simple jig animation for hook: hold near bottom, then hop upward irregularly
    animateHook();

    requestAnimationFrame(loop);
  }

  // --- Populate plant clusters to fill width ---
  function createUse(href, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    // Prefer modern href; some engines still look for xlink:href
    el.setAttribute('href', href);
    try { el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href); } catch (_) {}
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  }
  function addCluster(x) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${x},0)`);
    // Slight randomization for natural look
    const jitter = () => (Math.random() * 10 - 5).toFixed(1);
    // Randomly pick a vibrant accent leaf for variety
    const accents = ['#leafRedSym', '#leafPurple', '#leafYellowSym', '#leafOrangeSym'];
    const accent = accents[Math.floor(Math.random() * accents.length)];
    g.appendChild(createUse('#plantBlade', { x: 0 + Number(jitter()), y: 396, class: 'sway' }));
    g.appendChild(createUse('#leafBroad', { x: 28 + Number(jitter()), y: 388, class: 'sway fast' }));
    g.appendChild(createUse(accent, { x: 60 + Number(jitter()), y: 388, class: 'sway' }));
    g.appendChild(createUse('#plantBlade', { x: 88 + Number(jitter()), y: 402, class: 'sway slow' }));
    plantsGroup.appendChild(g);
  }
  function layoutPlants() {
    if (!plantsGroup) return;
    while (plantsGroup.firstChild) plantsGroup.removeChild(plantsGroup.firstChild);
    // Wider spacing and rock-aware gaps
    const viewWidth = 1200;
    const clusterW = 120; // moderately spaced for full coverage
    const start = -2 * clusterW;
    const end = viewWidth + 2 * clusterW;
    // Rock centers from SVG: [130,360,820,1080] with approximate radii
    const rocks = [
      {x:130, r:90}, {x:360, r:110}, {x:820, r:130}, {x:1080, r:100}
    ];
    for (let x = start; x <= end; x += clusterW) {
      const center = x + clusterW/2;
      const overRock = rocks.some(r => Math.abs(center - r.x) < r.r * 0.45);
      if (overRock) continue; // leave more space so rocks are visible
      addCluster(x);
    }
  }

  // --- Fishing line + hook motion ---
  let hookState = { phase: 'drop', targetY: 0, lastChange: 0 };
  // (reverted) no cast state
  const FEATURES = {
    casting: (new URL(location.href).searchParams.get('cast') === '1') ||
             (localStorage.getItem('fd_casting') === '1')
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'C') {
      FEATURES.casting = !FEATURES.casting;
      localStorage.setItem('fd_casting', FEATURES.casting ? '1' : '0');
      location.reload();
    }
  });

  // Dynamic grouping for casting when flag is ON
  let rodGroup = null;
  if (boat && FEATURES.casting && armPath && rodPath) {
    try {
      const svg = boat.querySelector('svg');
      rodGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      rodGroup.setAttribute('id', 'rodGroup');
      rodGroup.appendChild(armPath);
      rodGroup.appendChild(rodPath);
      svg.insertBefore(rodGroup, svg.firstChild.nextSibling);
      rodGroup.style.transformOrigin = '75px 32px';
    } catch (_) { rodGroup = null; }
  }
  function animateHook() {
    if (!lineEl || !hookEl) return;
    const now = performance.now();
    const waterTop = window.innerHeight / 6;
    const bottom = window.innerHeight - 4;
    // Anchor positions at rod tip in page coords
    const boatRect = boat.getBoundingClientRect();
    const rodTip = { x: boatRect.left + 110, y: boatRect.top + 14 };
    // Hook SVG geometry (viewBox 0 0 24 36): eye at roughly (16, 2)
    const HOOK_EYE_X = 16; // px within SVG
    const HOOK_EYE_Y = 2;  // px within SVG
    if (hookState.phase === 'drop') {
      // Ensure line spans to bottom and hook sits near bottom
      lineEl.style.height = (bottom - rodTip.y) + 'px';
      // Position hook so its eye aligns with the line X and starts at bottom
      hookEl.style.left = (rodTip.x - boatRect.left - HOOK_EYE_X) + 'px';
      hookEl.style.top = (rodTip.y - boatRect.top + (bottom - rodTip.y) - (HOOK_EYE_Y + 2)) + 'px';
      hookState.phase = 'jig';
      hookState.lastChange = now;
      hookState.targetY = bottom - 30;
      // Trigger a one-time cast animation when flag is ON
      if (FEATURES.casting) startCast(now);
      return;
    }
    // Jigging: random small upward hops, then fall back
    const hookRect = hookEl.getBoundingClientRect();
    const hookY = hookRect.top + hookRect.height / 2;
    if (now - hookState.lastChange > 600 + Math.random() * 600) {
      hookState.targetY = Math.max(waterTop + 60, hookY - (30 + Math.random() * 60));
      hookState.lastChange = now;
    }
    // Move toward targetY smoothly
    const dy = (hookState.targetY - hookY) * 0.14;
    const newTop = hookY + dy;
    const maxTop = bottom - 12;
    const clampedTop = Math.min(maxTop, Math.max(waterTop + 40, newTop));
    // Position hook (absolute within boat) using page→boat coordinates
    const newHookTop = clampedTop - hookRect.height / 2;
    // Keep hook horizontally anchored so the eye stays on the line
    hookEl.style.left = (rodTip.x - boatRect.left - HOOK_EYE_X) + 'px';
    hookEl.style.top = (newHookTop - boatRect.top) + 'px';

    // Reel-in effect: simply shorten the line element height to the hook
    const hookEyePageY = (newHookTop + HOOK_EYE_Y); // page Y for hook eye
    const visibleHeight = Math.max(0, hookEyePageY - rodTip.y);
    lineEl.style.height = visibleHeight + 'px';

    if (FEATURES.casting) stepCast(now);
  }
  // --- Casting (guarded by feature flag) ---
  let hasCastOnce = false;
  let castPhase = 'idle';
  let castStartAt = 0;
  function getBoatSectionIndex() {
    const sections = 10;
    const boatRect = boat.getBoundingClientRect();
    const centerX = boatRect.left + boatRect.width / 2;
    const w = window.innerWidth;
    return Math.min(sections - 1, Math.max(0, Math.floor((centerX / w) * sections)));
  }
  function startCast(now) {
    if (hasCastOnce || !rodGroup) return;
    const section = getBoatSectionIndex();
    if (section >= 8) return;
    hasCastOnce = true;
    castPhase = 'windup';
    castStartAt = now;
  }
  function stepCast(now) {
    if (castPhase === 'idle' || !rodGroup) return;
    const t = now - castStartAt;
    if (castPhase === 'windup') {
      const dur = 380, k = Math.min(1, t / dur);
      const angle = -35 * (1 - Math.pow(1 - k, 3));
      rodGroup.style.transform = `rotate(${angle}deg)`;
      if (k >= 1) { castPhase = 'forward'; castStartAt = now; }
    } else if (castPhase === 'forward') {
      const dur = 240, k = Math.min(1, t / dur);
      const angle = (-35) + 50 * (1 - Math.pow(1 - k, 3));
      rodGroup.style.transform = `rotate(${angle}deg)`;
      const section = getBoatSectionIndex();
      const w = window.innerWidth, sectionW = w / 10;
      const targetX = Math.min((section + 2 + 0.5) * sectionW, w - 20);
      const boatRect = boat.getBoundingClientRect();
      const curr = hookEl.getBoundingClientRect();
      const nx = (curr.left + (targetX - curr.left) * (1 - Math.pow(1 - k, 3))) - boatRect.left - 16;
      hookEl.style.left = `${nx}px`;
      if (k >= 1) { castPhase = 'settle'; castStartAt = now; }
    } else if (castPhase === 'settle') {
      const dur = 280, k = Math.min(1, t / dur);
      const angle = 15 - 15 * (1 - Math.pow(1 - k, 3));
      rodGroup.style.transform = `rotate(${angle}deg)`;
      if (k >= 1) { castPhase = 'idle'; rodGroup.style.transform = 'rotate(0deg)'; }
    }
  }

  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case ' ': // surge
        if (!spacePressed) {
          spacePressed = true;
          vy = Math.max(maxRise(), vy - 2.2 * scale());
          fish.style.transform = 'translateY(-50%) scale(1.04) rotate(-3deg)';
        }
        break;
      case 'p':
        paused = !paused;
        break;
      case 'ArrowRight':
        if (dir === 1) {
          // Already moving right: speed up until max
          speedIndex = Math.min(BASE_SPEEDS.length - 1, speedIndex + 1);
        } else {
          // Moving left: step down speed; if already at slowest, flip to right slow
          if (speedIndex > 0) {
            speedIndex -= 1;
          } else {
            dir = 1; // flip direction
            speedIndex = 0; // start at slowest in new direction
          }
        }
        updateSpeed();
        break;
      case 'ArrowLeft':
        if (dir === -1) {
          // Already moving left: speed up until max
          speedIndex = Math.min(BASE_SPEEDS.length - 1, speedIndex + 1);
        } else {
          // Moving right: step down speed; if already at slowest, flip to left slow
          if (speedIndex > 0) {
            speedIndex -= 1;
          } else {
            dir = -1; // flip direction
            speedIndex = 0; // start at slowest in new direction
          }
        }
        updateSpeed();
        break;
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
      spacePressed = false;
      fish.style.transform = 'translateY(-50%)';
    }
  });

  window.addEventListener('resize', () => {
    x = Math.min(x, window.innerWidth - 40);
    // Re-apply clamp relative to new waterline and fish size
    const waterlineY = window.innerHeight / 6;
    const halfH = getFishHalfHeight();
    const topClamp = Math.max(0, waterlineY + halfH + 1);
    const bottomClamp = window.innerHeight - 40;
    y = Math.max(topClamp, Math.min(bottomClamp, y));
    updateSpeed();
    // Recompute line length on resize
    if (lineEl && boat) {
      const bottom = window.innerHeight - 4;
      const boatRect = boat.getBoundingClientRect();
      const rodTipY = boatRect.top + 14;
      lineEl.style.height = (bottom - rodTipY) + 'px';
    }
    // Relayout plants in case SVG scales differently across sizes
    layoutPlants();
  });

  // Init
  updateSpeed();
  layoutPlants();
  // Ensure initial facing matches starting direction (right)
  if (sprite) { sprite.classList.add('face-right'); }
  loop();
})();