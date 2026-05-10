let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function resume() {
  const c = getCtx();
  if (c.state === "suspended") c.resume();
}

export function shutterSound() {
  resume();
  const c   = getCtx();
  const now = c.currentTime;

  // noise burst
  const bufSize = c.sampleRate * 0.08;
  const buffer  = c.createBuffer(1, bufSize, c.sampleRate);
  const data    = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const noise  = c.createBufferSource();
  noise.buffer = buffer;

  const filter           = c.createBiquadFilter();
  filter.type            = "bandpass";
  filter.frequency.value = 1200;
  filter.Q.value         = 0.8;

  const gn = c.createGain();
  gn.gain.setValueAtTime(0.6, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  noise.connect(filter);
  filter.connect(gn);
  gn.connect(c.destination);
  noise.start(now);
  noise.stop(now + 0.08);

  // thud
  const osc = c.createOscillator();
  const og  = c.createGain();
  osc.type  = "sine";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);
  og.gain.setValueAtTime(0.4, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(og);
  og.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

export function filterClickSound() {
  resume();
  const c   = getCtx();
  const now = c.currentTime;

  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.type  = "sine";
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
  g.gain.setValueAtTime(0.15, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

export function sliderTickSound() {
  resume();
  const c   = getCtx();
  const now = c.currentTime;

  const osc           = c.createOscillator();
  const g             = c.createGain();
  osc.type            = "square";
  osc.frequency.value = 440;
  g.gain.setValueAtTime(0.07, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.025);
}

export function startupSound() {
  resume();
  const c   = getCtx();
  const now = c.currentTime;

  [120, 180, 240].forEach((freq, i) => {
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type  = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + i * 0.12);
    g.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.4);
  });
}