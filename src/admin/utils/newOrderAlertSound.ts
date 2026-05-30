let audioCtx: AudioContext | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;

export function isAdminAudioUnlocked() {
  return sessionStorage.getItem('admin-audio-unlocked') === '1';
}

export function unlockAdminAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  sessionStorage.setItem('admin-audio-unlocked', '1');
}

function playAlarmBurst() {
  if (!audioCtx) return;
  const ctx = audioCtx;
  const t = ctx.currentTime;
  const pattern = [880, 1100, 880, 1100, 880];

  pattern.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    const start = t + i * 0.14;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.85, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
    osc.start(start);
    osc.stop(start + 0.14);
  });
}

export function startNewOrderAlarm() {
  unlockAdminAudio();
  playAlarmBurst();
  stopNewOrderAlarm();
  alarmInterval = setInterval(playAlarmBurst, 2000);
}

export function stopNewOrderAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}
