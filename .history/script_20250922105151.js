// Fish Dodge — core movement prototype
// Controls:
// - Space: surge forward and up (impulse)
// - Left/Right: change forward speed (three speeds)
// - Up/Down: adjust buoyancy (affects vertical drift)

(function () {
  const aquarium = document.getElementById('aquarium');
  const fish = document.getElementById('fish');
  const hudSpeed = document.getElementById('hud-speed');
  const hudBuoy = document.getElementById('hud-buoyancy');

  if (!aquarium || !fish) {
    console.warn('Aquarium or fish element missing.');
    return;
  }

  // World constants
  const SURFACE_RATIO = 0.15; // top 15% is air; water surface ~85% down from top
  const BASE_SPEED_LEVELS = [1, 3, 6];
  let speedIndex = 0;
  let speed = BASE_SPEED_LEVELS[speedIndex];

  // Physics state
  let x = 40; // start slightly in from the left
  let y = window.innerHeight * 0.5;
  let vy = 0;
  let spacePressed = false;
  let buoyancy = 0.0; // positive = more upward tendency; negative = more downward

  // Tunables (scaled by screen size a bit)
  function scale() { return Math.max(0.8, Math.min(2.0, window.innerWidth / 1200)); }
  function gravity() { return (0.20 - Math.min(0.12, buoyancy)) * scale(); }
  function maxFall() { return 5.0 * scale(); }
  function maxRise() { return -5.0 * scale(); }

  function updateHUD() {
    if (hudSpeed) hudSpeed.textContent = `Speed: ${BASE_SPEED_LEVELS[speedIndex]}`;
    if (hudBuoy) hudBuoy.textContent = `Buoyancy: ${buoyancy.toFixed(2)}`;
  }

  function wrapX(nx) {
    const w = window.innerWidth;
    if (nx > w) return nx - w; // seamless wrap right→left
    if (nx < 0) return nx + w; // left→right (rare)
    return nx;
  }

  function tick() {
    // Horizontal motion (continuous aquarium wrap)
    x = wrapX(x + speed);

    // Vertical motion
    if (spacePressed) {
      vy = Math.max(maxRise(), vy - 0.5 * scale());
    } else {
      vy = Math.min(maxFall(), vy + gravity());
    }

    // Apply
    y = Math.max(0, Math.min(window.innerHeight - 40, y + vy));

    // Render
    fish.style.left = x + 'px';
    fish.style.top = y + 'px';

    requestAnimationFrame(tick);
  }

  // Input
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case ' ': // surge
        if (!spacePressed) {
          spacePressed = true;
          // Impulse upward and small visual nudge
          vy = Math.max(maxRise(), vy - 2.5 * scale());
          fish.style.transform = 'scale(1.05) rotate(-4deg)';
        }
        break;
      case 'ArrowRight':
        speedIndex = Math.min(BASE_SPEED_LEVELS.length - 1, speedIndex + 1);
        speed = BASE_SPEED_LEVELS[speedIndex] * scale();
        updateHUD();
        break;
      case 'ArrowLeft':
        speedIndex = Math.max(0, speedIndex - 1);
        speed = BASE_SPEED_LEVELS[speedIndex] * scale();
        updateHUD();
        break;
      case 'ArrowUp':
        buoyancy = Math.min(0.12, buoyancy + 0.02); // more buoyant → less gravity, eventually updrift
        updateHUD();
        break;
      case 'ArrowDown':
        buoyancy = Math.max(-0.12, buoyancy - 0.02); // less buoyant → more downward drift
        updateHUD();
        break;
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
      spacePressed = false;
      fish.style.transform = 'scale(1) rotate(0deg)';
    }
  });

  // Resize safety: keep fish onscreen
  window.addEventListener('resize', () => {
    x = Math.min(x, window.innerWidth - 40);
    y = Math.min(y, window.innerHeight - 40);
  });

  // Init state
  speed = BASE_SPEED_LEVELS[speedIndex] * scale();
  updateHUD();
  tick();
})();