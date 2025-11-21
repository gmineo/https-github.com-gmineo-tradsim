
// Simple synthesizer for game sound effects
// Using Web Audio API to avoid loading external assets

class AudioController {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Context is initialized lazily on user interaction
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // A subtle high-hat/tick sound for chart movement
  playTick() {
    if (this.isMuted || !this.ctx) return;
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Filtered noise simulation using high frequency triangle wave
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Rising tension sound while holding buy
  startTension() {
    if (this.isMuted || !this.ctx) return;
    // Prevent multiple oscillators
    if (this.osc) return; 

    const t = this.ctx.currentTime;
    this.osc = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();

    this.osc.type = 'sine';
    this.osc.frequency.setValueAtTime(200, t);
    this.osc.frequency.linearRampToValueAtTime(800, t + 4); // Pitch rises over 4 seconds

    this.gain.gain.setValueAtTime(0, t);
    this.gain.gain.linearRampToValueAtTime(0.1, t + 0.1); // Fade in

    this.osc.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.osc.start(t);
  }

  stopTension() {
    if (!this.ctx || !this.osc || !this.gain) return;
    
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setValueAtTime(this.gain.gain.value, t);
    this.gain.gain.linearRampToValueAtTime(0, t + 0.1);
    
    this.osc.stop(t + 0.1);
    this.osc = null;
    this.gain = null;
  }

  // "Mario Coin" style sound for profit
  playWin() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.setValueAtTime(1318.51, t + 0.1); // E6
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  // Low thud/dissonant sound for loss
  playLoss() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.3);
    
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}

export const audioService = new AudioController();
