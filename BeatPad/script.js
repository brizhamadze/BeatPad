/* Beat Pad – 5x5 with per-pad pitch using Web Audio */
(function() {
  const NUM_ROWS = 5;
  const NUM_COLS = 5;
  const NUM_PADS = NUM_ROWS * NUM_COLS;
  // Tenor range requested: 131 Hz – 494 Hz (approx C3 to B4)
  const MIN_FREQUENCY = 131;
  const MAX_FREQUENCY = 494;
  const gridEl = document.getElementById('grid');
  const pads = [];

  // Map pads left-to-right, top-to-bottom to QWERTY order (25 keys)
  // Row 1: Q W E R T
  // Row 2: Y U I O P
  // Row 3: A S D F G
  // Row 4: H J K L (4 keys) + Z (first from Row 5) = 5 keys
  // Row 5: X C V B N (remaining 5 keys from Row 5 list)
  const KEYS = [
    'Q','W','E','R','T',        // Row 1: 5 keys
    'Y','U','I','O','P',        // Row 2: 5 keys
    'A','S','D','F','G',        // Row 3: 5 keys
    'H','J','K','L','Z',        // Row 4: 4 keys + Z = 5 keys
    'X','C','V','B','N'         // Row 5: remaining 5 keys = 5 keys
  ];
  const keyIndexByKey = new Map(KEYS.map((k, i) => [k.toUpperCase(), i]));

  // Exponential growth config for hold-to-grow
  const EXP_RATE_PER_SEC = Math.log(2) * 2.5; // faster than 2x/sec
  const EXP_ACCEL_POWER = 1.6; // accelerates over time (t^power)
  const EXP_SCALE = 1; // starting increment scale
  const MAX_TRIGGERS_PER_TICK = 12; // safety cap
  const STEP_INCREMENT = 1; // default step per click
  const holds = new Map(); // index -> { startTime, baseCount, rafId, lastEmittedCount }
  const pressedKeys = new Set();

  /**
   * Web Audio setup. Lazily created on first user gesture
   * to comply with browser autoplay policies.
   */
  let audioContext = null;
  let masterCompressor = null;
  let masterGain = null;

  // Precompute frequencies for all 25 pads
  const frequencies = [];
  for (let i = 0; i < NUM_PADS; i++) {
    frequencies.push(frequencyForIndex(i));
  }

  function ensureAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Master chain to allow louder output without harsh clipping
      masterCompressor = audioContext.createDynamicsCompressor();
      masterCompressor.threshold.setValueAtTime(-12, audioContext.currentTime);
      masterCompressor.knee.setValueAtTime(24, audioContext.currentTime);
      masterCompressor.ratio.setValueAtTime(3, audioContext.currentTime);
      masterCompressor.attack.setValueAtTime(0.003, audioContext.currentTime);
      masterCompressor.release.setValueAtTime(0.25, audioContext.currentTime);

      masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(1.0, audioContext.currentTime);

      masterCompressor.connect(masterGain);
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  function frequencyForIndex(index) {
    // Map 0..(NUM_PADS-1) to geometric progression spanning MIN_FREQUENCY..MAX_FREQUENCY
    // Keeps steps musically proportional (semitone-like) and exact at the endpoints
    const t = index / (NUM_PADS - 1);
    const ratio = Math.pow(MAX_FREQUENCY / MIN_FREQUENCY, t);
    return MIN_FREQUENCY * ratio;
  }

  function playPad(index, padButton) {
    const ctx = ensureAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const ringGain = ctx.createGain();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const shaper = ctx.createWaveShaper();

    osc.type = 'square';
    const baseFreq = frequencies[index];
    // Slight downward chirp for a robotic blip
    osc.frequency.setValueAtTime(baseFreq * 1.06, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.03);

    // Percussive envelope: quick attack, short decay, no sustain
    const peak = 1.8;
    const attack = 0.005;
    const decay = 0.18;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);

    // Gentle filtering to keep it crisp
    filter.type = 'lowpass';
    filter.frequency.value = 4200;
    filter.Q.value = 0.7;

    // Add a little harmonic grit
    shaper.curve = makeDistortionCurve(40);
    shaper.oversample = '4x';

    // Ring modulation (robotic tone)
    // Vary ring modulation frequency by pad: 35-83 Hz
    const ringFreq = 35 + (index % 5) * 12; // vary by pad
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const dc = ctx.createConstantSource();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(ringFreq, now);
    lfoGain.gain.setValueAtTime(0.5, now); // depth
    dc.offset.setValueAtTime(0.5, now);    // center so gain oscillates 0..1
    lfo.connect(lfoGain);
    lfoGain.connect(ringGain.gain);
    dc.connect(ringGain.gain);

    // Subtle vibrato for additional robotic character
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.type = 'sine';
    vib.frequency.setValueAtTime(6, now);
    vibGain.gain.setValueAtTime(6, now); // +/- Hz
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    osc.connect(ringGain);
    ringGain.connect(shaper);
    shaper.connect(gain);
    gain.connect(filter);
    filter.connect(masterCompressor);

    osc.start(now);
    lfo.start(now);
    dc.start(now);
    vib.start(now);
    const stopAt = now + attack + decay + 0.04;
    osc.stop(stopAt);
    lfo.stop(stopAt);
    dc.stop(stopAt);
    vib.stop(stopAt);

    // Visual feedback
    padButton.classList.add('is-active');
    window.setTimeout(() => padButton.classList.remove('is-active'), 160);
  }

  function makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const num = 44100;
    const curve = new Float32Array(num);
    const deg = Math.PI / 180;
    for (let i = 0; i < num; i += 1) {
      const x = (i * 2) / num - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  function formatCount(value) {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  }

  function getCount(button) {
    const v = parseFloat(button.dataset.count || '0');
    return Number.isFinite(v) ? v : 0;
  }

  function setCount(button, value) {
    const label = button.querySelector('.pad__label');
    const clamped = Math.max(0, Math.min(100, value));
    button.dataset.count = String(clamped);
    if (label) label.textContent = formatCount(clamped);
    if (clamped > 0) {
      button.classList.add('is-touched');
      if (label) label.style.visibility = 'visible';
    }
    updateProgress(button);
  }

  function triggerPad(index) {
    const button = pads[index];
    if (!button) return;
    const current = getCount(button);
    if (current >= 100) { return; }
    const next = Math.min(current + STEP_INCREMENT, 100);
    playPad(index, button);
    setCount(button, next);
  }

  function startHold(index) {
    if (holds.has(index)) return;
    const button = pads[index];
    if (!button) return;
    const startTime = performance.now();
    const baseCount = getCount(button);
    if (baseCount >= 100) return; // already capped
    const label = button.querySelector('.pad__label');

    const tick = () => {
      // Hard cap guard during hold
      const currentCount = getCount(button);
      if (currentCount >= 100) { stopHold(index); return; }
      const elapsedSec = (performance.now() - startTime) / 1000;
      const growth = Math.exp(EXP_RATE_PER_SEC * Math.pow(elapsedSec, EXP_ACCEL_POWER)) - 1;
      const inc = Math.floor(EXP_SCALE * growth);
      let next = baseCount + inc * STEP_INCREMENT;
      if (next > 100) next = 100;
      const state = holds.get(index);
      if (state && inc > state.lastEmittedStep) {
        // Emit sounds for each new integer we crossed, with a safety cap per frame
        const fromStep = state.lastEmittedStep + 1;
        const toStep = inc;
        const limit = Math.min(MAX_TRIGGERS_PER_TICK, toStep - fromStep + 1);
        for (let i = 0; i < limit; i += 1) {
          playPad(index, button);
        }
        state.lastEmittedStep = inc;
        setCount(button, next);
      }
      if (next >= 100) { stopHold(index); return; }
      const currentState = holds.get(index);
      if (currentState) { currentState.rafId = requestAnimationFrame(tick); }
    };
    const rafId = requestAnimationFrame(tick);
    holds.set(index, { startTime, baseCount, rafId, lastEmittedStep: 0 });
  }

  function stopHold(index) {
    const state = holds.get(index);
    if (state && state.rafId) cancelAnimationFrame(state.rafId);
    holds.delete(index);
  }

  function createPad(index) {
    const button = document.createElement('button');
    button.role = 'gridcell';
    button.className = 'pad';
    const keyLabel = KEYS[index];
    button.setAttribute('aria-label', `Pad ${index + 1} (Key ${keyLabel})`);
    button.setAttribute('data-key', keyLabel);
    button.title = `Key: ${keyLabel}`;

    // Hue gradient across all pads for a colorful beat-pad look
    // Warm to cool: yellow/orange -> purple
    const hueStart = 40;   // warm yellow/orange
    const hueEnd = 300;    // purple
    const hue = hueStart + (hueEnd - hueStart) * (index / (NUM_PADS - 1));
    // Store just the hue (number in degrees). CSS will supply saturation/lightness.
    button.style.setProperty('--hue', String(Math.round(hue)));

    // Click counter label (hidden until first click)
    const label = document.createElement('span');
    label.className = 'pad__label';
    button.appendChild(label);
    button.dataset.count = '0';

    // Key overlay (top-left badge)
    const keySpan = document.createElement('span');
    keySpan.className = 'pad__key';
    keySpan.textContent = keyLabel;
    button.appendChild(keySpan);

    // SVG progress ring
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'pad__progress');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '100');

    const track = document.createElementNS(svgNS, 'rect');
    track.setAttribute('class', 'pad__track');
    track.setAttribute('x', '3');
    track.setAttribute('y', '3');
    track.setAttribute('width', '94');
    track.setAttribute('height', '94');
    track.setAttribute('rx', '10');
    track.setAttribute('ry', '10');

    const prog = document.createElementNS(svgNS, 'rect');
    prog.setAttribute('class', 'pad__progress-line');
    prog.setAttribute('x', '3');
    prog.setAttribute('y', '3');
    prog.setAttribute('width', '94');
    prog.setAttribute('height', '94');
    prog.setAttribute('rx', '10');
    prog.setAttribute('ry', '10');

    svg.appendChild(track);
    svg.appendChild(prog);
    button.appendChild(svg);

    const onTrigger = (e) => {
      e.preventDefault();
      triggerPad(index);
      // Start growth on pointer hold
      try { button.setPointerCapture(e.pointerId); } catch(_) {}
      startHold(index);
    };

    button.addEventListener('pointerdown', onTrigger);
    button.addEventListener('pointerup', () => stopHold(index));
    button.addEventListener('pointercancel', () => stopHold(index));
    button.addEventListener('pointerleave', () => stopHold(index));

    // Initialize progress dash array after in-DOM to compute length
    requestAnimationFrame(() => {
      try {
        const length = prog.getTotalLength();
        prog.style.strokeDasharray = `${length}`;
        prog.style.strokeDashoffset = `${length}`;
        button.dataset.pathLength = String(length);
      } catch (e) {
        // Fallback approximate length for 94x94 rounded rect with r=10
        const approx = 2 * (94 + 94 - 2 * 10) + 2 * Math.PI * 10;
        prog.style.strokeDasharray = `${approx}`;
        prog.style.strokeDashoffset = `${approx}`;
        button.dataset.pathLength = String(approx);
      }
    });

    return button;
  }

  function buildGrid() {
    // Clear if re-rendered
    gridEl.innerHTML = '';
    // Fixed-size grid columns to render ~100x100px pads consistently
    gridEl.style.gridTemplateColumns = `repeat(${NUM_COLS}, 100px)`;

    for (let i = 0; i < NUM_PADS; i += 1) {
      const pad = createPad(i);
      gridEl.appendChild(pad);
      pads.push(pad);
    }
  }

  // Initialize
  buildGrid();

  // Global keyboard handler: map keys to pads
  window.addEventListener('keydown', (e) => {
    const k = (e.key || '').toUpperCase();
    if (!k) return;
    const index = keyIndexByKey.get(k);
    if (index !== undefined) {
      e.preventDefault();
      if (!pressedKeys.has(index)) {
        pressedKeys.add(index);
        triggerPad(index);
        startHold(index);
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = (e.key || '').toUpperCase();
    const index = keyIndexByKey.get(k);
    if (index !== undefined) {
      pressedKeys.delete(index);
      stopHold(index);
    }
  });

  function updateProgress(button) {
    const length = parseFloat(button.dataset.pathLength || '0');
    if (!length) return;
    const count = parseFloat(button.dataset.count || '0') || 0;
    const pct = Math.min(count, 100) / 100; // stop at 100
    const offset = (1 - pct) * length;
    const prog = button.querySelector('.pad__progress-line');
    if (prog) {
      prog.style.strokeDashoffset = `${offset}`;
    }
  }
})();
