import type { AudioFidelity, Track } from '../types/music';
import { getOfflineAudioBlob } from './offlineDb';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function createNoiseBuffer(ctx: BaseAudioContext, seconds: number, color: 'pink' | 'vinyl' | 'rain'): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      let sample = (b0 + b1 + b2 + white * 0.1848) * 0.04;

      if (color === 'vinyl' && Math.random() < 0.00045) {
        sample += (Math.random() * 2 - 1) * 0.12;
      } else if (color === 'rain') {
        sample *= 1.35;
      }
      data[i] = sample;
    }
  }
  return buffer;
}

export async function renderTrackAudioBuffer(track: Track, sampleRate = 48000): Promise<AudioBuffer> {
  const { bpm, rootMidi, chords, padWarmth, grooveDensity, texture } = track.synth;
  const beatSec = 60 / bpm;
  const barSec = beatSec * 4;
  const totalBars = chords.length * 2; // 8 bars seamless phrase
  const duration = barSec * totalBars;
  const frameCount = Math.floor(duration * sampleRate);

  const offline = new OfflineAudioContext(2, frameCount, sampleRate);
  const master = offline.createGain();
  master.gain.setValueAtTime(0.78, 0);

  const masterFilter = offline.createBiquadFilter();
  masterFilter.type = 'lowpass';
  masterFilter.frequency.setValueAtTime(4200 + (1 - padWarmth) * 4800, 0);
  masterFilter.Q.setValueAtTime(0.6, 0);

  master.connect(masterFilter);
  masterFilter.connect(offline.destination);

  // Subtle ambient texture layer
  const noiseColor = texture === 'vinyl' ? 'vinyl' : texture === 'rain' ? 'rain' : 'pink';
  const noiseSrc = offline.createBufferSource();
  noiseSrc.buffer = createNoiseBuffer(offline, duration, noiseColor);
  const noiseFilter = offline.createBiquadFilter();
  noiseFilter.type = texture === 'rain' ? 'bandpass' : 'lowpass';
  noiseFilter.frequency.setValueAtTime(texture === 'rain' ? 1600 : 2400, 0);
  const noiseGain = offline.createGain();
  noiseGain.gain.setValueAtTime(texture === 'air' ? 0.09 : 0.16, 0);
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noiseSrc.start(0);

  // Deterministic pseudo-random helper based on track id
  let seed = track.id.split('').reduce((acc, c) => acc + c.charCodeAt(0) * 17, 13);
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let bar = 0; bar < totalBars; bar++) {
    const chord = chords[bar % chords.length];
    const barStart = bar * barSec;

    // Warm electric piano / pad chord
    chord.forEach((interval, idx) => {
      const freq = midiToFreq(rootMidi + interval);
      const osc1 = offline.createOscillator();
      const osc2 = offline.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, barStart);
      osc2.frequency.setValueAtTime(freq * 1.0018, barStart);

      const pan = offline.createStereoPanner();
      pan.pan.setValueAtTime((idx % 2 === 0 ? -1 : 1) * 0.25, barStart);

      const voiceGain = offline.createGain();
      const peak = 0.11 / Math.sqrt(chord.length);
      voiceGain.gain.setValueAtTime(0.0001, barStart);
      voiceGain.gain.exponentialRampToValueAtTime(peak, barStart + 0.08);
      voiceGain.gain.exponentialRampToValueAtTime(peak * 0.55, barStart + barSec * 0.55);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, barStart + barSec - 0.03);

      osc1.connect(voiceGain);
      osc2.connect(voiceGain);
      voiceGain.connect(pan);
      pan.connect(master);

      osc1.start(barStart);
      osc2.start(barStart);
      osc1.stop(barStart + barSec);
      osc2.stop(barStart + barSec);
    });

    // Warm sub-bass note on beats 1 and 3
    const bassFreq = midiToFreq(rootMidi - 12 + chord[0]);
    [0, beatSec * 2.5].forEach((offset, bIdx) => {
      const start = barStart + offset;
      const len = bIdx === 0 ? beatSec * 2.1 : beatSec * 1.3;
      const bassOsc = offline.createOscillator();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(bassFreq, start);

      const bassGain = offline.createGain();
      bassGain.gain.setValueAtTime(0.0001, start);
      bassGain.gain.exponentialRampToValueAtTime(0.22, start + 0.04);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, start + len);

      bassOsc.connect(bassGain);
      bassGain.connect(master);
      bassOsc.start(start);
      bassOsc.stop(start + len);
    });

    // Gentle bell / Rhodes melody notes
    const melodySteps = grooveDensity === 'sparse' ? 2 : 4;
    for (let s = 0; s < melodySteps; s++) {
      if (nextRand() < 0.28) continue;
      const noteOffset = s * (barSec / melodySteps) + (grooveDensity === 'swing' && s % 2 === 1 ? 0.04 : 0);
      const start = barStart + noteOffset;
      const interval = chord[Math.floor(nextRand() * chord.length)] + 12;
      const mFreq = midiToFreq(rootMidi + interval);

      const mOsc = offline.createOscillator();
      mOsc.type = 'sine';
      mOsc.frequency.setValueAtTime(mFreq, start);

      const mPan = offline.createStereoPanner();
      mPan.pan.setValueAtTime((nextRand() - 0.5) * 0.65, start);

      const mGain = offline.createGain();
      mGain.gain.setValueAtTime(0.0001, start);
      mGain.gain.exponentialRampToValueAtTime(0.065, start + 0.015);
      mGain.gain.exponentialRampToValueAtTime(0.0001, start + beatSec * 1.4);

      mOsc.connect(mGain);
      mGain.connect(mPan);
      mPan.connect(master);
      mOsc.start(start);
      mOsc.stop(start + beatSec * 1.45);
    }

    // Soft lo-fi drums (skip for ultra-sparse ambient)
    if (grooveDensity !== 'sparse') {
      // Kick on 1 and 2.75
      [0, beatSec * 2.5].forEach((kOff) => {
        const t = barStart + kOff;
        const kOsc = offline.createOscillator();
        kOsc.type = 'sine';
        kOsc.frequency.setValueAtTime(115, t);
        kOsc.frequency.exponentialRampToValueAtTime(44, t + 0.14);

        const kGain = offline.createGain();
        kGain.gain.setValueAtTime(0.24, t);
        kGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

        kOsc.connect(kGain);
        kGain.connect(master);
        kOsc.start(t);
        kOsc.stop(t + 0.25);
      });

      // Soft rim/snare on beats 2 and 4
      [beatSec, beatSec * 3].forEach((sOff) => {
        const t = barStart + sOff + (grooveDensity === 'swing' ? 0.015 : 0);
        const sNoise = offline.createBufferSource();
        sNoise.buffer = createNoiseBuffer(offline, 0.14, 'pink');

        const sFilter = offline.createBiquadFilter();
        sFilter.type = 'bandpass';
        sFilter.frequency.setValueAtTime(1850, t);
        sFilter.Q.setValueAtTime(1.4, t);

        const sGain = offline.createGain();
        sGain.gain.setValueAtTime(0.14, t);
        sGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

        sNoise.connect(sFilter);
        sFilter.connect(sGain);
        sGain.connect(master);
        sNoise.start(t);
        sNoise.stop(t + 0.13);
      });

      // Soft brushed hi-hat 8ths
      for (let h = 0; h < 8; h++) {
        const t = barStart + h * (beatSec / 2) + (grooveDensity === 'swing' && h % 2 === 1 ? 0.032 : 0);
        const hNoise = offline.createBufferSource();
        hNoise.buffer = createNoiseBuffer(offline, 0.06, 'pink');
        const hFilter = offline.createBiquadFilter();
        hFilter.type = 'highpass';
        hFilter.frequency.setValueAtTime(5200, t);
        const hGain = offline.createGain();
        hGain.gain.setValueAtTime(h % 2 === 0 ? 0.045 : 0.025, t);
        hGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

        hNoise.connect(hFilter);
        hFilter.connect(hGain);
        hGain.connect(master);
        hNoise.start(t);
        hNoise.stop(t + 0.05);
      }
    }
  }

  return offline.startRendering();
}

export function encodeAudioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function renderTrackToOfflineWav(track: Track): Promise<Blob> {
  const buffer = await renderTrackAudioBuffer(track, 48000);
  return encodeAudioBufferToWav(buffer);
}

class ChillAudioPlayer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private qualityFilter: BiquadFilterNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private currentTrack: Track | null = null;
  private volume = 0.78;
  private fidelity: AudioFidelity = 'lossless';

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.qualityFilter = this.ctx.createBiquadFilter();
      this.qualityFilter.type = 'lowpass';
      this.qualityFilter.frequency.setValueAtTime(
        this.fidelity === 'lossless' ? 21000 : 14500,
        this.ctx.currentTime
      );

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.82;

      this.qualityFilter.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  public setFidelity(fidelity: AudioFidelity): void {
    this.fidelity = fidelity;
    if (this.ctx && this.qualityFilter) {
      this.qualityFilter.frequency.setTargetAtTime(
        fidelity === 'lossless' ? 21000 : 14500,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  public stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // already stopped
      }
      this.sourceNode = null;
    }
  }

  public async playTrack(track: Track, offsetSec = 0, preferOffline = false): Promise<'offline-cache' | 'stream'> {
    const ctx = this.ensureContext();
    this.stop();
    this.currentTrack = track;

    let audioBuffer = this.bufferCache.get(track.id);
    let sourceKind: 'offline-cache' | 'stream' = 'stream';

    const offlineBlob = await getOfflineAudioBlob(track.id);
    if (offlineBlob) {
      sourceKind = 'offline-cache';
      if (!audioBuffer) {
        const arr = await offlineBlob.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arr);
        this.bufferCache.set(track.id, audioBuffer);
      }
    } else {
      if (preferOffline) {
        throw new Error('Track is not downloaded in your Offline Vault.');
      }
      if (!audioBuffer) {
        audioBuffer = await renderTrackAudioBuffer(track, ctx.sampleRate);
        this.bufferCache.set(track.id, audioBuffer);
      }
    }

    // If user skipped quickly while rendering, abort stale playback
    if (this.currentTrack?.id !== track.id) {
      return sourceKind;
    }

    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.loop = true;
    const loopOffset = audioBuffer.duration > 0 ? offsetSec % audioBuffer.duration : 0;
    src.connect(this.qualityFilter!);
    src.start(0, loopOffset);
    this.sourceNode = src;
    return sourceKind;
  }

  public getFrequencyData(target: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(target);
    return true;
  }
}

export const chillAudioPlayer = new ChillAudioPlayer();
