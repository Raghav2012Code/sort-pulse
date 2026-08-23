/**
 * Web Audio synthesizer for the Sorting Visualizer ("Sound of Sorting").
 * Produces crisp, non-fatiguing auditory feedback mapped to array values.
 */

class SoundEngine {
  private ctx: AudioContext | null = null
  private enabled: boolean = false
  private activeVoices: number = 0
  private readonly maxVoices: number = 3

  public isSupported(): boolean {
    return typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public setEnabled(val: boolean): void {
    this.enabled = val
    if (val && !this.ctx) {
      this.initContext()
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled)
    return this.enabled
  }

  private initContext(): void {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    } catch {
      this.enabled = false
    }
  }

  public playTone(value: number, maxValue: number = 100, type: 'compare' | 'swap' | 'overwrite' | 'sorted' = 'compare'): void {
    if (!this.enabled) return
    if (!this.ctx) {
      this.initContext()
    }
    if (!this.ctx) return

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }

    if (this.activeVoices >= this.maxVoices) return

    try {
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      // Map value proportionally from 150 Hz to 1050 Hz
      const normalized = Math.max(0, Math.min(1, value / Math.max(maxValue, 1)))
      const freq = 150 + Math.pow(normalized, 1.2) * 900
      osc.frequency.setValueAtTime(freq, now)

      // Choose waveform based on action
      if (type === 'compare') {
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.04, now)
      } else if (type === 'swap' || type === 'overwrite') {
        osc.type = 'triangle'
        gain.gain.setValueAtTime(0.06, now)
      } else {
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.03, now)
      }

      const duration = type === 'sorted' ? 0.04 : 0.025
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      this.activeVoices++
      osc.start(now)
      osc.stop(now + duration)

      osc.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1)
        osc.disconnect()
        gain.disconnect()
      }
    } catch {
      // Gracefully ignore audio scheduling exceptions
    }
  }
}

export const soundEngine = new SoundEngine()
