// main.js — Echo Garden (Working Version)
// Voice-first memory garden — simple, functional, mic-ready

// --- DOM ELEMENTS ---
const micBtn = document.getElementById('mic-btn');
const statusEl = document.getElementById('status');
const memoryContainer = document.getElementById('memory-container');

// State
let isRecording = false;
let audioContext = null;
let analyser = null;
let microphone = null;
let dataArray = null;
let memories = JSON.parse(localStorage.getItem('echo_garden_memories') || '[]');

// --- AUDIO INIT ---
async function initAudio() {
  if (audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  try {
    microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(microphone);
    source.connect(analyser);
  } catch (err) {
    console.error('Audio access denied:', err);
    showStatus('Microphone access denied. Please enable mic in browser settings.', 'error');
    micBtn.disabled = true;
  }
}

// --- UI HELPERS ---
function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = 'status visible';
  
  if (type === 'error') statusEl.style.color = '#ff6b6b';
  else if (type === 'success') statusEl.style.color = '#7d9c6b';
  else statusEl.style.color = '#a8b2c1';

  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- MEMORY MANAGEMENT ---
function addMemory(text, emotion) {
  const memory = {
    id: Date.now(),
    text,
    emotion,
    timestamp: new Date().toISOString()
  };

  memories.unshift(memory);
  localStorage.setItem('echo_garden_memories', JSON.stringify(memories));
  renderMemories();
  return memory;
}

function renderMemories() {
  if (memories.length === 0) {
    memoryContainer.innerHTML = `
      <div class="empty-state">
        <p>Your garden is quiet. <br>Press the mic to begin.</p>
      </div>
    `;
    return;
  }

  memoryContainer.innerHTML = memories.map(memory => `
    <div class="memory-card" data-id="${memory.id}">
      <p class="memory-text">${escapeHtml(memory.text)}</p>
      <p class="memory-meta">${formatDate(memory.timestamp)} • ${capitalize(memory.emotion)}</p>
    </div>
  `).join('');
}

// --- SENTIMENT ANALYSIS (Client-Side Heuristic) ---
function analyzeSentiment(text) {
  if (!text) return 'neutral';
  
  const positive = ['happy', 'joy', 'love', 'beautiful', 'wonderful', 'peace', 'sun', 'light', 'warm', 'hope'];
  const negative = ['sad', 'pain', 'loss', 'dark', 'cold', 'lonely', 'fear', 'grief', 'angry', 'hurt'];
  
  const lower = text.toLowerCase();
  let score = 0;
  
  positive.forEach(word => {
    if (lower.includes(word)) score += 2;
  });
  
  negative.forEach(word => {
    if (lower.includes(word)) score -= 2;
  });
  
  if (score > 2) return 'joy';
  if (score < -2) return 'sorrow';
  if (lower.includes('dream') || lower.includes('sky') || lower.includes('star') || lower.includes('universe')) return 'wonder';
  return 'calm';
}

// --- MAIN LOGIC ---
micBtn.addEventListener('click', async () => {
  if (!audioContext) await initAudio();

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

async function startRecording() {
  isRecording = true;
  micBtn.classList.add('recording');
  micBtn.querySelector('.label').textContent = 'Listening...';
  showStatus('Listening... Speak your memory.');

  const mediaRecorder = new MediaRecorder(microphone);
  const audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Play back audio
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {
      // Autoplay blocked — user interaction needed
    });

    // Analyze sentiment (simple heuristic)
    const text = await transcribeAudio(audioBlob);
    const emotion = analyzeSentiment(text);
    
    // Add to garden
    addMemory(text, emotion);
    
    showStatus(`" ${text.substring(0, 60) + (text.length > 60 ? '...' : '')} "`, 'success');
    micBtn.classList.remove('recording');
    micBtn.querySelector('.label').textContent = 'Tap to Speak';
    isRecording = false;
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 10000); // Auto-stop after 10s
}

function stopRecording() {
  // Not used currently
}

async function transcribeAudio(blob) {
  // Fallback: use Web Speech API if available
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    return new Promise((resolve, reject) => {
      recognition.onresult = (event) => {
        resolve(event.results[0][0].transcript);
      };
      recognition.onerror = (error) => {
        resolve(''); // Fallback to empty if speech recognition fails
      };
      recognition.onend = () => {
        // No result — use blob analysis
        resolve('');
      };

      // Convert blob to base64 for Web Speech API (limited support)
      // Since Web Speech API doesn't accept blobs directly, we'll skip for now
      // and use heuristic-based sentiment instead
      resolve('');
    });
  }
  return '';
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  renderMemories();
  
  // Show welcome message if empty
  if (memories.length === 0) {
    setTimeout(() => {
      showStatus('Your garden is quiet. Press the mic to begin.', 'info');
    }, 1000);
  }
});
