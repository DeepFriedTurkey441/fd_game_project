// Fish movement prototype: slow downward drift, space = up/forward, 3 speeds (←/→)
(function () {
  const fish = document.getElementById('fish');
  const sprite = fish ? fish.querySelector('.sprite') : null;
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
    y = Math.max(0, Math.min(window.innerHeight - 40, y + vy));

    // Render
    fish.style.left = x + 'px';
    fish.style.top = y + 'px';

    requestAnimationFrame(loop);
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
    y = Math.min(y, window.innerHeight - 40);
    updateSpeed();
  });

  // Init
  updateSpeed();
  // Ensure initial facing matches starting direction (right)
  if (sprite) { sprite.classList.add('face-right'); }
  loop();
})();