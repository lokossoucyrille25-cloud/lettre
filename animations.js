// animations.js

export function startAnimation1(canvas, postDrawCallback) {
  const ctx = canvas.getContext("2d");
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  let isRunning = true;

  const handleResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", handleResize);

  function heartPosition(rad) {
    return [
      Math.pow(Math.sin(rad), 3),
      -(15 * Math.cos(rad) - 5 * Math.cos(2 * rad) - 2 * Math.cos(3 * rad) - Math.cos(4 * rad))
    ];
  }

  function scaleAndTranslate(pos, sx, sy, dx, dy) {
    return [dx + pos[0] * sx, dy + pos[1] * sy];
  }

  const pointsOrigin = [];
  const dr = 0.1;
  for (let i = 0; i < Math.PI * 2; i += dr) {
    pointsOrigin.push(scaleAndTranslate(heartPosition(i), 210, 13, 0, 0));
  }
  for (let i = 0; i < Math.PI * 2; i += dr) {
    pointsOrigin.push(scaleAndTranslate(heartPosition(i), 150, 9, 0, 0));
  }
  for (let i = 0; i < Math.PI * 2; i += dr) {
    pointsOrigin.push(scaleAndTranslate(heartPosition(i), 90, 5, 0, 0));
  }

  const heartPointsCount = pointsOrigin.length;
  const targetPoints = [];

  function pulse(kx, ky) {
    for (let i = 0; i < pointsOrigin.length; i++) {
      targetPoints[i] = [
        kx * pointsOrigin[i][0] + width / 2,
        ky * pointsOrigin[i][1] + height / 2
      ];
    }
  }

  const particles = [];
  for (let i = 0; i < heartPointsCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    particles[i] = {
      vx: 0,
      vy: 0,
      R: 2,
      speed: Math.random() + 5,
      q: ~~(Math.random() * heartPointsCount),
      D: 2 * (i % 2) - 1,
      force: 0.2 * Math.random() + 0.7,
      f: "rgba(255, 20, 70, 0.3)",
      trace: Array.from({ length: 30 }, () => ({ x, y }))
    };
  }

  let time = 0;
  function loop() {
    if (!isRunning) return;
    
    // Pour ne pas complètement masquer le fond, on utilise rgba(0,0,0,0.1) qui efface progressivement
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(0, 0, width, height);

    time += 0.05;
    const k = 1 + 0.15 * Math.sin(time * 3);
    pulse(k, k);

    ctx.globalCompositeOperation = "lighter";

    for (let i = particles.length - 1; i >= 0; i--) {
      const u = particles[i];
      const q = targetPoints[u.q];
      const dx = u.trace[0].x - q[0];
      const dy = u.trace[0].y - q[1];
      const length = Math.sqrt(dx * dx + dy * dy);

      if (10 > length) {
        if (0.95 < Math.random()) {
          u.q = ~~(Math.random() * heartPointsCount);
        } else {
          if (0.99 < Math.random()) u.D *= -1;
          u.q += u.D;
          u.q %= heartPointsCount;
          if (0 > u.q) u.q += heartPointsCount;
        }
      }

      u.vx += (-dx / length) * u.speed;
      u.vy += (-dy / length) * u.speed;
      u.trace[0].x += u.vx;
      u.trace[0].y += u.vy;
      u.vx *= u.force;
      u.vy *= u.force;

      for (let k = 0; k < u.trace.length - 1;) {
        const T = u.trace[k];
        const N = u.trace[++k];
        N.x -= 0.4 * (N.x - T.x);
        N.y -= 0.4 * (N.y - T.y);
      }

      ctx.fillStyle = u.f;
      for (let k = 0; k < u.trace.length; k++) {
        ctx.fillRect(u.trace[k].x, u.trace[k].y, 1, 1);
      }
    }
    
    ctx.globalCompositeOperation = "source-over";
    if (postDrawCallback) postDrawCallback(ctx, width, height);
    requestAnimationFrame(loop);
  }
  loop();

  return () => {
    isRunning = false;
    window.removeEventListener("resize", handleResize);
    ctx.clearRect(0, 0, width, height);
  };
}

export function startAnimation2(canvas, postDrawCallback) {
  const ctx = canvas.getContext("2d");
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  let isRunning = true;

  const handleResize = () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", handleResize);

  const BLUE_SHADES = ["#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#bfdbfe"];
  const particles = [];
  const COUNT = 350;

  function getHeartPoint(angle) {
    const x = 16 * Math.pow(Math.sin(angle), 3);
    const y = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));
    return { x: x * 10, y: y * 10 };
  }

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.angle = Math.random() * Math.PI * 2;
      const target = getHeartPoint(this.angle);
      this.targetX = W / 2 + target.x + (Math.random() - 0.5) * 35;
      this.targetY = H / 2 + target.y + (Math.random() - 0.5) * 35;
      
      this.x = W / 2 + (Math.random() - 0.5) * 120;
      this.y = H / 2 + 200 + Math.random() * 20;
      this.color = BLUE_SHADES[Math.floor(Math.random() * BLUE_SHADES.length)];
      this.size = Math.random() * 2 + 1;
      this.speed = Math.random() * 0.04 + 0.02;
      this.alpha = Math.random() * 0.8 + 0.2;
    }
    update() {
      this.x += (this.targetX - this.x) * this.speed;
      this.y += (this.targetY - this.y) * this.speed;
      this.x += (Math.random() - 0.5) * 0.8;
      this.y += (Math.random() - 0.5) * 0.8;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < COUNT; i++) particles.push(new Particle());

  function drawPedestal() {
    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#38bdf8";
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.ellipse(W / 2, H / 2 + 200, 110, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    if (!isRunning) return;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, W, H);
    drawPedestal();
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    if (postDrawCallback) postDrawCallback(ctx, W, H);
    requestAnimationFrame(render);
  }
  render();

  return () => {
    isRunning = false;
    window.removeEventListener("resize", handleResize);
    ctx.clearRect(0, 0, W, H);
  };
}

export function startAnimation3(canvas, postDrawCallback) {
  const ctx = canvas.getContext("2d");
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  let isRunning = true;

  const handleResize = () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", handleResize);

  const flies = [];

  for (let i = 0; i < 25; i++) {
    flies.push({
      x: Math.random() * W,
      y: Math.random() * H,
      s: Math.random() * 1.0 + 0.7,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.3,
      ph: Math.random() * 6.28,
      c: Math.random() > 0.4 ? "#a0e6ff" : "#ffd2d5"
    });
  }

  function drawButterfly(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.s, f.s);
    
    const wingScale = Math.sin(Date.now() * 0.01 + f.ph);

    ctx.fillStyle = f.c;
    ctx.shadowBlur = 12;
    ctx.shadowColor = f.c;

    ctx.save();
    ctx.scale(wingScale, 1);
    ctx.beginPath();
    ctx.ellipse(-10, 0, 10, 18, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.scale(-wingScale, 1);
    ctx.beginPath();
    ctx.ellipse(-10, 0, 10, 18, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function anim() {
    if (!isRunning) return;
    
    ctx.fillStyle = "rgba(5, 2, 10, 0.2)"; // Radial gradient like color
    ctx.fillRect(0, 0, W, H);

    flies.forEach(f => {
      f.x += f.vx;
      f.y += f.vy;

      if (f.x < 0) f.x = W;
      if (f.x > W) f.x = 0;
      if (f.y < 0) f.y = H;
      if (f.y > H) f.y = 0;

      drawButterfly(f);
    });
    
    if (postDrawCallback) postDrawCallback(ctx, W, H);
    requestAnimationFrame(anim);
  }
  anim();

  return () => {
    isRunning = false;
    window.removeEventListener("resize", handleResize);
    ctx.clearRect(0, 0, W, H);
  };
}
