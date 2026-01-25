let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let isRunning = false;
let timerInterval;
let currentMode = 'focus';
let sessions = 0;
let totalMinutes = 0;
let autoStart = true;
let soundEnabled = true;
let notificationsEnabled = true;

let modes = {
    focus: { time: 25 * 60, label: 'Focus Time' },
    short: { time: 5 * 60, label: 'Short Break' },
    long: { time: 15 * 60, label: 'Long Break' }
};

const circle = document.querySelector('.progress-ring-circle');
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = 0;

function createRipple(e, button) {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple-effect');

    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
}

function showNotification(message) {
    if (!notificationsEnabled) return;
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
}

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.querySelector('.timer-display').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const percent = ((totalTime - timeLeft) / totalTime) * 100;
    setProgress(percent);

    document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - Pomodoro`;
}

function updateTotalTime() {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    document.getElementById('totalTime').textContent = `${hours}h ${mins}m`;
}

function playSound() {
    if (!soundEnabled) return;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    [0, 0.15, 0.3].forEach((delay, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800 - (i * 100);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.3);

        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + 0.3);
    });
}

function toggleTimer(e) {
    if (e) createRipple(e, e.currentTarget);

    const btn = document.getElementById('startBtn');
    const timerCircle = document.getElementById('timerCircle');

    if (isRunning) {
        clearInterval(timerInterval);
        btn.textContent = 'Start';
        isRunning = false;
        showNotification('Timer paused');
    } else {
        timerCircle.classList.add('pulse');
        setTimeout(() => timerCircle.classList.remove('pulse'), 600);

        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                if (timeLeft % 60 === 0 && currentMode === 'focus') {
                    totalMinutes++;
                    updateTotalTime();
                }
                updateDisplay();
            } else {
                clearInterval(timerInterval);
                isRunning = false;
                btn.textContent = 'Start';

                if (currentMode === 'focus') {
                    sessions++;
                    document.getElementById('sessionCount').textContent = sessions;
                    showNotification('🎉 Focus session complete! Great work!');
                } else {
                    showNotification('✅ Break finished! Ready to focus?');
                }

                playSound();

                if (autoStart) {
                    setTimeout(() => {
                        if (currentMode === 'focus') {
                            setMode(sessions % 4 === 0 ? 'long' : 'short');
                        } else {
                            setMode('focus');
                        }
                        toggleTimer();
                    }, 2000);
                }
            }
        }, 1000);
        btn.textContent = 'Pause';
        isRunning = true;
        showNotification('Timer started!');
    }
}

function resetTimer(e) {
    if (e) createRipple(e, e.currentTarget);

    clearInterval(timerInterval);
    isRunning = false;
    document.getElementById('startBtn').textContent = 'Start';
    timeLeft = totalTime;
    updateDisplay();
    showNotification('Timer reset');
}

function setMode(mode, e) {
    if (e) createRipple(e, e.currentTarget);
    if (isRunning && !autoStart) return;

    currentMode = mode;
    totalTime = modes[mode].time;
    timeLeft = totalTime;

    document.querySelector('.mode').textContent = modes[mode].label;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));

    if (e) {
        e.currentTarget.classList.add('active');
    } else {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            if (btn.textContent.toLowerCase().includes(mode === 'short' ? 'short' : mode === 'long' ? 'long' : 'focus')) {
                btn.classList.add('active');
            }
        });
    }

    updateDisplay();
}

function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('active');
}

function saveSettings() {
    const focusTime = parseInt(document.getElementById('focusTime').value);
    const shortBreak = parseInt(document.getElementById('shortBreak').value);
    const longBreak = parseInt(document.getElementById('longBreak').value);

    modes.focus.time = focusTime * 60;
    modes.short.time = shortBreak * 60;
    modes.long.time = longBreak * 60;

    autoStart = document.getElementById('autoStart').checked;
    soundEnabled = document.getElementById('soundEnabled').checked;
    notificationsEnabled = document.getElementById('notificationsEnabled').checked;

    if (currentMode === 'focus') {
        totalTime = modes.focus.time;
    } else if (currentMode === 'short') {
        totalTime = modes.short.time;
    } else {
        totalTime = modes.long.time;
    }

    timeLeft = totalTime;
    updateDisplay();

    toggleSettings();
    showNotification('⚙️ Settings saved successfully!');
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.getElementById('settingsPanel').classList.contains('active') === false) {
        e.preventDefault();
        toggleTimer();
    }
});

updateDisplay();
updateTotalTime();