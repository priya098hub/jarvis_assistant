import './style.css';

const listenButton = document.querySelector('#listenButton');
const voiceTitle = document.querySelector('#voiceTitle');
const voiceCopy = document.querySelector('#voiceCopy');
const transcript = document.querySelector('#transcript');
const sendButton = document.querySelector('#sendButton');
const sampleButton = document.querySelector('#sampleButton');
const captureButton = document.querySelector('#captureButton');
const captureLabel = document.querySelector('#captureLabel');
const stopCameraButton = document.querySelector('#stopCameraButton');
const camera = document.querySelector('#camera');
const cameraPreview = document.querySelector('#cameraPreview');
const recordingStatus = document.querySelector('#recordingStatus');
const recordChip = document.querySelector('#recordChip');
const timer = document.querySelector('#timer');
const activityList = document.querySelector('#activityList');
const toast = document.querySelector('#toast');

let recognition;
let stream;
let recorder;
let startedAt;
let clock;

function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000); }
function addActivity(message) { const item = document.createElement('li'); item.innerHTML = `<time>NOW</time><span class="activity-dot"></span><p>${message}</p>`; activityList.prepend(item); }
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }

function setupRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { showToast('Voice recognition is not supported in this browser.'); return; }
  recognition = new Recognition(); recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-US';
  recognition.onstart = () => { listenButton.classList.add('listening'); voiceTitle.textContent = 'Listening…'; voiceCopy.textContent = 'Speak naturally — I’m capturing your request.'; transcript.textContent = '“…”'; };
  recognition.onresult = event => { const text = Array.from(event.results).map(result => result[0].transcript).join(''); transcript.textContent = `“${text}”`; sendButton.disabled = !text.trim(); };
  recognition.onerror = () => { voiceTitle.textContent = 'Couldn’t hear that.'; voiceCopy.textContent = 'Try again or use an example command.'; };
  recognition.onend = () => { listenButton.classList.remove('listening'); if (sendButton.disabled) { voiceTitle.textContent = 'Ready when you are.'; } else { voiceTitle.textContent = 'Command captured.'; voiceCopy.textContent = 'Review it, then send it to your agent crew.'; } };
  recognition.start();
}

listenButton.addEventListener('click', () => recognition ? recognition.start() : setupRecognition());
sampleButton.addEventListener('click', () => { transcript.textContent = '“Review my pull request for authentication bypasses and suggest a fix.”'; voiceTitle.textContent = 'Command captured.'; voiceCopy.textContent = 'Ready to route to your Security scout.'; sendButton.disabled = false; });
sendButton.addEventListener('click', () => { const task = transcript.textContent.replace(/[“”]/g, ''); addActivity(`Command routed: ${task}`); showToast('Command sent to Jarvis.'); sendButton.disabled = true; voiceTitle.textContent = 'Ready when you are.'; voiceCopy.textContent = 'Tap the signal to give Jarvis a task.'; });

async function startCapture() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); camera.srcObject = stream; cameraPreview.classList.add('active');
    recorder = new MediaRecorder(stream); recorder.start(); startedAt = Date.now(); clock = setInterval(() => { timer.textContent = formatTime(Math.floor((Date.now() - startedAt) / 1000)); }, 1000);
    captureLabel.textContent = 'Stop capture'; captureButton.classList.add('recording'); stopCameraButton.disabled = false; recordingStatus.textContent = 'RECORDING'; recordChip.classList.add('visible'); addActivity('Secure local capture started.');
  } catch { showToast('Camera or microphone permission was not granted.'); }
}
function stopCapture() { if (recorder?.state !== 'inactive') recorder.stop(); stream?.getTracks().forEach(track => track.stop()); clearInterval(clock); stream = undefined; camera.srcObject = null; cameraPreview.classList.remove('active'); captureLabel.textContent = 'Start capture'; captureButton.classList.remove('recording'); stopCameraButton.disabled = true; recordingStatus.textContent = 'IDLE'; recordChip.classList.remove('visible'); addActivity(`Capture saved locally (${timer.textContent}).`); timer.textContent = '00:00'; }
captureButton.addEventListener('click', () => stream ? stopCapture() : startCapture()); stopCameraButton.addEventListener('click', stopCapture);
document.querySelectorAll('.run-agent').forEach(button => button.addEventListener('click', () => { addActivity(`${button.dataset.agent} is preparing a new mission.`); showToast(`${button.dataset.agent} activated.`); }));
document.querySelector('#clearActivity').addEventListener('click', () => { activityList.innerHTML = ''; });
