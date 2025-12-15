// screensaver.js

// -----------------------------
// Canvas setup
// -----------------------------
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// -----------------------------
// Image assets (preloaded in index.html)
// -----------------------------
const bgImage = document.getElementById('bgImage');     // assets/background.png
const skullImage = document.getElementById('skullImage'); // assets/skull.png

// -----------------------------
// Utilities
// -----------------------------
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// clamp helper
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// -----------------------------
// Matrix Rain System
// -----------------------------
class MatrixColumn {
  constructor(x, height) {
    this.x = x;
    this.y = Math.random() * -height;
    this.speed = 50 + Math.random() * 150;
  }
  update(dt, height) {
    this.y += this.speed * dt;
    if (this.y > height + 100) this.y = Math.random() * -height;
  }
  draw(ctx, height) {
    const charHeight = 16;
    const count = Math.ceil(height / charHeight) + 5;
    ctx.font = '16px monospace';
    for (let i = 0; i < count; i++) {
      const ch = Math.random() > 0.5 ? '1' : '0';
      const y = this.y - i * charHeight;
      const alpha = 1 - i / count;
      ctx.fillStyle = `rgba(0, 255, 120, ${Math.max(alpha, 0)})`;
      ctx.fillText(ch, this.x, y);
    }
  }
}

class MatrixRainSystem {
  constructor(width, height) {
    this.columns = [];
    this.spacing = 16;
    this.reset(width, height);
  }
  reset(width, height) {
    this.columns = [];
    for (let x = 0; x < width; x += this.spacing) {
      this.columns.push(new MatrixColumn(x, height));
    }
  }
  update(dt, width, height) {
    this.columns.forEach(col => col.update(dt, height));
  }
  draw(ctx, height) {
    this.columns.forEach(col => col.draw(ctx, height));
  }
}

const matrix = new MatrixRainSystem(canvas.width, canvas.height);
window.addEventListener('resize', () => matrix.reset(canvas.width, canvas.height));

// -----------------------------
// Code Chunk System
// -----------------------------
class CodeChunk {
  constructor(width, height, textLines, direction) {
    this.direction = direction; // 1 = left->right, -1 = right->left
    this.speed = 20 + Math.random() * 40;
    this.alpha = 0;
    this.state = 'fadeIn';
    this.y = 50 + Math.random() * (height - 100);
    this.x = direction === 1 ? -300 : width + 300;
    this.textLines = textLines;
  }
  update(dt) {
    this.x += this.direction * this.speed * dt;
    if (this.state === 'fadeIn') {
      this.alpha += dt * 0.5;
      if (this.alpha >= 0.8) {
        this.alpha = 0.8;
        this.state = 'hold';
        this.holdTime = 2 + Math.random() * 3;
      }
    } else if (this.state === 'hold') {
      this.holdTime -= dt;
      if (this.holdTime <= 0) this.state = 'fadeOut';
    } else if (this.state === 'fadeOut') {
      this.alpha -= dt * 0.3;
    }
  }
  isDead(width) {
    return this.alpha <= 0 && (this.x < -400 || this.x > width + 400);
  }
  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.font = '14px monospace';
    ctx.fillStyle = '#00ff99';
    let offsetY = 0;
    this.textLines.forEach(line => {
      ctx.fillText(line, this.x, this.y + offsetY);
      offsetY += 16;
    });
    ctx.restore();
  }
}

class CodeChunkSystem {
  constructor() {
    this.chunks = [];
    this.timer = 0;
  }
  randomSnippet() {
    const snippets = [
      ['for (let i = 0; i < nodes.length; i++) {', '  sendPacket(hacker, nodes[i]);', '}'],
      ['def exploit(target):', '    payload = build_payload(target)', '    send(payload)', '    return get_shell()'],
      ['<div class="node hacked">', '  <span>&#9760; root access</span>', '</div>'],
      ['0x48 0x45 0x4C 0x4C 0x4F', '0x52 0x4F 0x4F 0x54']
    ];
    return snippets[Math.floor(Math.random() * snippets.length)];
  }
  update(dt, width, height) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 5 + Math.random() * 5;
      const dir = Math.random() > 0.5 ? 1 : -1;
      this.chunks.push(new CodeChunk(width, height, this.randomSnippet(), dir));
    }
    this.chunks.forEach(c => c.update(dt));
    this.chunks = this.chunks.filter(c => !c.isDead(width));
  }
  draw(ctx) {
    this.chunks.forEach(c => c.draw(ctx));
  }
}

const codeChunks = new CodeChunkSystem();

// -----------------------------
// Node Network System
// -----------------------------
class Node {
  constructor(id, x, y, type) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.hackedAlpha = 0; // skull overlay alpha
  }
  update(dt) {
    if (this.hackedAlpha > 0) {
      this.hackedAlpha -= dt * 0.2;
      if (this.hackedAlpha < 0) this.hackedAlpha = 0;
    }
  }
  draw(ctx) {
    ctx.save();
    // base glow
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // skull overlay if hacked
    if (this.hackedAlpha > 0 && skullImage.complete) {
      ctx.globalAlpha = clamp(this.hackedAlpha, 0, 1);
      ctx.drawImage(skullImage, this.x - 12, this.y - 12, 24, 24);
    }
    ctx.restore();
  }
}

class Link {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,255,120,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(this.to.x, this.to.y);
    ctx.stroke();
    ctx.restore();
  }
}

class Packet {
  constructor(link, color, speed = 120) {
    this.link = link;
    this.t = 0;
    this.speed = speed;
    this.color = color;
  }
  update(dt) {
    // speed is pixels per second roughly; normalize by link length
    this.t += (this.speed * dt) / 1000;
  }
  isDone() {
    return this.t >= 1;
  }
  draw(ctx) {
    const x = lerp(this.link.from.x, this.link.to.x, this.t);
    const y = lerp(this.link.from.y, this.link.to.y, this.t);
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class NodeNetworkSystem {
  constructor(width, height) {
    this.nodes = [];
    this.links = [];
    this.packets = [];
    this.normalTrafficTimer = 0;
    this.setupLayout(width, height);
  }

  setupLayout(width, height) {
    // layout roughly matching the background composition
    const cx = width * 0.45;
    const cy = height * 0.35;
    const sx = width * 0.25;
    const sy = height * 0.25;

    const hacker = new Node('hacker', width * 0.72, height * 0.65, 'hacker');

    const nodes = [
      hacker,
      new Node('server', cx - sx * 0.4, cy - sy * 0.4, 'server'),
      new Node('desktop1', cx, cy - sy * 0.6, 'desktop'),
      new Node('desktop2', cx + sx * 0.4, cy - sy * 0.3, 'desktop'),
      new Node('router', cx, cy, 'router'),
      new Node('laptop1', cx - sx * 0.5, cy + sy * 0.2, 'laptop'),
      new Node('phone', cx + sx * 0.3, cy + sy * 0.3, 'phone'),
      new Node('iot', cx - sx * 0.1, cy + sy * 0.5, 'iot'),
      new Node('cloud', cx + sx * 0.5, cy - sy * 0.7, 'cloud')
    ];

    this.nodes = nodes;

    const get = id => this.nodes.find(n => n.id === id);

    this.links = [
      new Link(get('router'), get('server')),
      new Link(get('router'), get('desktop1')),
      new Link(get('router'), get('desktop2')),
      new Link(get('router'), get('laptop1')),
      new Link(get('router'), get('phone')),
      new Link(get('router'), get('iot')),
      new Link(get('router'), get('cloud')),
      new Link(get('hacker'), get('router'))
    ];
  }

  sendPacket(fromId, toId, color = '#00ff88', speed = 180) {
    const from = this.nodes.find(n => n.id === fromId);
    const to = this.nodes.find(n => n.id === toId);
    if (!from || !to) return;
    const link = new Link(from, to);
    this.packets.push(new Packet(link, color, speed));
  }

  update(dt, width, height) {
    this.nodes.forEach(n => n.update(dt));

    // Normal background traffic: router <-> random node
    this.normalTrafficTimer -= dt;
    if (this.normalTrafficTimer <= 0) {
      this.normalTrafficTimer = 0.3 + Math.random() * 0.7;
      const router = this.nodes.find(n => n.id === 'router');
      const others = this.nodes.filter(n => n.id !== 'router' && n.id !== 'hacker');
      if (router && others.length) {
        const target = others[Math.floor(Math.random() * others.length)];
        this.sendPacket(router.id, target.id, '#00ff88', 120 + Math.random() * 120);
        this.sendPacket(target.id, router.id, '#00ff88', 120 + Math.random() * 120);
      }
    }

    // update packets
    this.packets.forEach(p => p.update(dt));
    this.packets = this.packets.filter(p => !p.isDone());
  }

  draw(ctx) {
    // draw links
    this.links.forEach(l => l.draw(ctx));
    // draw packets
    this.packets.forEach(p => p.draw(ctx));
    // draw nodes
    this.nodes.forEach(n => n.draw(ctx));
  }
}

let network = new NodeNetworkSystem(canvas.width, canvas.height);
window.addEventListener('resize', () => {
  network.setupLayout(canvas.width, canvas.height);
});

// -----------------------------
// Hack System (orchestrates hack events)
// -----------------------------
class HackEvent {
  constructor(network) {
    this.network = network;
    this.state = 'prepare'; // prepare -> launch -> inFlight -> impact -> done
    this.timer = 0;

    this.hacker = this.network.nodes.find(n => n.id === 'hacker');
    this.targets = this.network.nodes.filter(n => n.id !== 'hacker' && n.id !== 'router');
    this.target = this.targets[Math.floor(Math.random() * this.targets.length)];
    this.packet = null;
  }

  update(dt) {
    this.timer += dt;
    if (this.state === 'prepare') {
      if (this.hacker) this.hacker.hackedAlpha = 1.0; // skull on hacker
      if (this.timer > 0.5) {
        this.state = 'launch';
        this.timer = 0;
      }
    } else if (this.state === 'launch') {
      // create a red packet from hacker to target
      this.packet = new Packet(new Link(this.hacker, this.target), '#ff0066', 260);
      this.network.packets.push(this.packet);
      this.state = 'inFlight';
    } else if (this.state === 'inFlight') {
      if (this.packet && this.packet.isDone()) {
        // impact: show skull on target
        this.target.hackedAlpha = 1.0;
        this.state = 'impact';
        this.timer = 0;
      }
    } else if (this.state === 'impact') {
      if (this.timer > 1.5) {
        this.state = 'done';
      }
    }
  }

  isDone() {
    return this.state === 'done';
  }
}

class HackSystem {
  constructor(network) {
    this.network = network;
    this.events = [];
    this.cooldown = 0;
  }

  update(dt) {
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      this.cooldown = 5 + Math.random() * 10;
      this.events.push(new HackEvent(this.network));
    }
    this.events.forEach(e => e.update(dt));
    this.events = this.events.filter(e => !e.isDone());
  }
}

let hacks = new HackSystem(network);

// -----------------------------
// Background drawing & alignment
// -----------------------------
function drawBackground(ctx) {
  // draw the background image stretched to canvas
  if (bgImage && bgImage.complete) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else {
    // fallback: solid black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// -----------------------------
// Main loop
// -----------------------------
let lastTime = 0;

function update(dt) {
  matrix.update(dt, canvas.width, canvas.height);
  codeChunks.update(dt, canvas.width, canvas.height);
  network.update(dt, canvas.width, canvas.height);
  hacks.update(dt);
}

function draw() {
  // subtle translucent overlay to create trailing effect
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // draw background image first (so everything else overlays)
  drawBackground(ctx);

  // draw matrix rain (semi-transparent so background shows)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  matrix.draw(ctx, canvas.height);
  ctx.restore();

  // draw code chunks and network on top
  codeChunks.draw(ctx);
  network.draw(ctx);

  // optional: draw a faint ASCII "INTERNET" banner at top if you want
  // ctx.font = '28px monospace';
  // ctx.fillStyle = 'rgba(0,255,120,0.08)';
  // ctx.fillText('INTERNET', 40, 60);
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// wait for images to load (if present) then start
function startWhenReady() {
  const imgs = [bgImage, skullImage];
  let remaining = imgs.filter(i => i).length;
  if (remaining === 0) {
    requestAnimationFrame(loop);
    return;
  }
  imgs.forEach(img => {
    if (!img) return;
    if (img.complete) {
      remaining--;
      if (remaining === 0) requestAnimationFrame(loop);
    } else {
      img.addEventListener('load', () => {
        remaining--;
        if (remaining === 0) requestAnimationFrame(loop);
      });
      img.addEventListener('error', () => {
        // continue even if an image fails
        remaining--;
        if (remaining === 0) requestAnimationFrame(loop);
      });
    }
  });
}

startWhenReady();

// -----------------------------
// Optional: expose some debug hooks on window for tuning
// -----------------------------
window.__screensaver = {
  matrix,
  codeChunks,
  network,
  hacks
};
