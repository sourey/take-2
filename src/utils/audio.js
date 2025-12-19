// Audio utility for card game sound effects
// Uses Web Audio API to generate programmatic sounds

let audioContext = null;
let masterGainNode = null;
let isAudioEnabled = true;

// Initialize audio context (needs user interaction first)
export const initAudio = () => {
  if (!audioContext && typeof window !== 'undefined') {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGainNode = audioContext.createGain();
      masterGainNode.connect(audioContext.destination);
      masterGainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Master volume
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      isAudioEnabled = false;
    }
  }
  return audioContext;
};

// Resume audio context (needed after user interaction)
export const resumeAudio = async () => {
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }
};

// Create a simple oscillator-based sound
const createOscillator = (frequency, type = 'sine', duration = 0.1) => {
  if (!audioContext || !isAudioEnabled) return null;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(masterGainNode);

  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.type = type;

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);

  return { oscillator, gainNode };
};

// Create a noise generator for card shuffling sounds
const createNoiseBuffer = (duration) => {
  const bufferSize = audioContext.sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  return buffer;
};

const playNoiseSound = (duration = 0.5, frequency = 1000) => {
  if (!audioContext || !isAudioEnabled) return;

  const buffer = createNoiseBuffer(duration);
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gainNode = audioContext.createGain();

  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(frequency, audioContext.currentTime);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGainNode);

  gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  source.start(audioContext.currentTime);
  source.stop(audioContext.currentTime + duration);
};

// ===== SOUND EFFECTS =====

// Card dealing sound - multiple quick taps
export const playCardDealSound = () => {
  if (!audioContext || !isAudioEnabled) return;

  // Play 4-7 quick card sounds with slight variations
  const numCards = Math.floor(Math.random() * 4) + 4; // 4-7 cards
  for (let i = 0; i < numCards; i++) {
    setTimeout(() => {
      const frequency = 800 + Math.random() * 400; // 800-1200 Hz
      createOscillator(frequency, 'square', 0.08);
    }, i * 120); // Stagger by 120ms
  }
};

// Card shuffle sound - rustling noise
export const playShuffleSound = () => {
  if (!audioContext || !isAudioEnabled) return;

  // Long rustling sound
  playNoiseSound(1.5, 2000);
};

// Single card placement sound
export const playCardPlaceSound = () => {
  if (!audioContext || !isAudioEnabled) return;

  const frequency = 600 + Math.random() * 200; // 600-800 Hz
  createOscillator(frequency, 'triangle', 0.1);
};

// Winning celebration sound
export const playWinningSound = () => {
  if (!audioContext || !isAudioEnabled) return;

  // Triumphant melody using multiple oscillators
  const notes = [523, 659, 784, 1047]; // C, E, G, C (C major chord)
  const duration = 0.8;

  notes.forEach((freq, index) => {
    setTimeout(() => {
      createOscillator(freq, 'sine', duration);
      createOscillator(freq * 2, 'sine', duration * 0.5); // Add octave for richness
    }, index * 100);
  });

  // Add some celebratory chimes at the end
  setTimeout(() => {
    createOscillator(1319, 'sine', 0.3); // High E
    setTimeout(() => createOscillator(1568, 'sine', 0.3), 100); // High G
  }, 600);
};

// Last call tension sound - urgent beeping
export const playLastCallSound = () => {
  if (!audioContext || !isAudioEnabled) return;

  // Urgent beeping pattern
  const beep = () => {
    createOscillator(1000, 'sawtooth', 0.15);
    setTimeout(() => createOscillator(1200, 'sawtooth', 0.15), 150);
  };

  // Play 3 quick beeps
  beep();
  setTimeout(beep, 400);
  setTimeout(beep, 800);
};

// Penalty/draw sound - disappointing tone
export const playPenaltySound = () => {
  if (!audioContext || !isAudioEnabled) return;

  // Descending sad tone
  const frequencies = [440, 392, 349, 330]; // A, G, F, E
  frequencies.forEach((freq, index) => {
    setTimeout(() => {
      createOscillator(freq, 'sawtooth', 0.2);
    }, index * 150);
  });
};

// Skip sound - quick alert
export const playSkipSound = () => {
  if (!audioContext || !isAudioEnabled) return;

  createOscillator(800, 'square', 0.1);
  setTimeout(() => createOscillator(1000, 'square', 0.1), 100);
};

// Ace color change sound - magical
export const playAceSound = () => {
  if (!audioContext || !isAudioEnabled) return;

  // Magical ascending notes
  const notes = [523, 659, 784]; // C, E, G
  notes.forEach((freq, index) => {
    setTimeout(() => {
      createOscillator(freq, 'triangle', 0.15);
    }, index * 80);
  });
};

// Queen pair sound - special combo
export const playQueenPairSound = () => {
  if (!audioContext || !isAudioEnabled) return;

  // Special harmonic sound
  createOscillator(523, 'triangle', 0.1);
  createOscillator(659, 'triangle', 0.1);
  setTimeout(() => {
    createOscillator(784, 'triangle', 0.2);
  }, 50);
};

// Game start sound
export const playGameStartSound = () => {
  if (!audioContext || !isAudioEnabled) return;

  // Ascending fanfare
  const notes = [262, 330, 392, 523]; // C, E, G, C
  notes.forEach((freq, index) => {
    setTimeout(() => {
      createOscillator(freq, 'sine', 0.15);
    }, index * 100);
  });
};

// Enable/disable audio
export const setAudioEnabled = (enabled) => {
  isAudioEnabled = enabled;
  if (masterGainNode) {
    masterGainNode.gain.setValueAtTime(enabled ? 0.3 : 0, audioContext.currentTime);
  }
};

export const getAudioEnabled = () => isAudioEnabled;