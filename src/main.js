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
let recordingChunks = [];

function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000); }
function renderActivity(entries) { activityList.replaceChildren(...entries.map(entry => { const item = document.createElement('li'); item.innerHTML = `<time>${entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}</time><span class="activity-dot"></span><p></p>`; item.querySelector('p').textContent = entry.message; return item; })); }
function addActivity(message) { const item = document.createElement('li'); item.innerHTML = '<time>NOW</time><span class="activity-dot"></span><p></p>'; item.querySelector('p').textContent = message; activityList.prepend(item); }
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
async function request(path, options = {}) { const response = await fetch(path, options); if (!response.ok) throw new Error('Request failed'); return response.status === 204 ? null : response.json(); }

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
sendButton.addEventListener('click', async () => { const task = transcript.textContent.replace(/[“”]/g, ''); try { await request('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: task, agent: 'Jarvis' }) }); addActivity(`Command routed: ${task}`); showToast('Command saved to your local Jarvis inbox.'); sendButton.disabled = true; voiceTitle.textContent = 'Ready when you are.'; voiceCopy.textContent = 'Tap the signal to give Jarvis a task.'; } catch { showToast('Start the local backend with npm start first.'); } });

async function startCapture() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); camera.srcObject = stream; cameraPreview.classList.add('active');
    recordingChunks = []; recorder = new MediaRecorder(stream); recorder.ondataavailable = event => { if (event.data.size) recordingChunks.push(event.data); }; recorder.onstop = async () => { const recording = new Blob(recordingChunks, { type: recorder.mimeType }); try { await request('/api/recordings', { method: 'POST', headers: { 'content-type': recording.type }, body: recording }); addActivity(`Recording saved locally (${Math.ceil(recording.size / 1024)} KB).`); showToast('Recording saved to local storage.'); } catch { addActivity('Recording ended, but could not reach local storage.'); showToast('Recording was not saved. Start npm server and retry.'); } }; recorder.start(1000); startedAt = Date.now(); clock = setInterval(() => { timer.textContent = formatTime(Math.floor((Date.now() - startedAt) / 1000)); }, 1000);
    captureLabel.textContent = 'Stop capture'; captureButton.classList.add('recording'); stopCameraButton.disabled = false; recordingStatus.textContent = 'RECORDING'; recordChip.classList.add('visible'); addActivity('Secure local capture started.');
  } catch { showToast('Camera or microphone permission was not granted.'); }
}
function stopCapture() { if (recorder?.state !== 'inactive') recorder.stop(); stream?.getTracks().forEach(track => track.stop()); clearInterval(clock); stream = undefined; camera.srcObject = null; cameraPreview.classList.remove('active'); captureLabel.textContent = 'Start capture'; captureButton.classList.remove('recording'); stopCameraButton.disabled = true; recordingStatus.textContent = 'IDLE'; recordChip.classList.remove('visible'); timer.textContent = '00:00'; }
captureButton.addEventListener('click', () => stream ? stopCapture() : startCapture()); stopCameraButton.addEventListener('click', stopCapture);
document.querySelectorAll('.run-agent').forEach(button => button.addEventListener('click', async () => { try { await request('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: `New mission requested from ${button.dataset.agent}.`, agent: button.dataset.agent }) }); addActivity(`${button.dataset.agent} is preparing a new mission.`); showToast(`${button.dataset.agent} added to the local inbox.`); } catch { showToast('Start the local backend with npm start first.'); } }));
document.querySelector('#clearActivity').addEventListener('click', async () => { try { await request('/api/activity', { method: 'DELETE' }); activityList.innerHTML = ''; } catch { showToast('Could not clear local activity.'); } });
request('/api/activity').then(renderActivity).catch(() => showToast('Local backend unavailable. Run npm start.'));
