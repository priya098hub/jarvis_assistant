# Jarvis local voice agent

This is a **zero-cost local starter**: it requires only a recent Node.js runtime and a browser. No API key, paid AI model, cloud database, or tracking service is included.

## Included features

- Voice-to-text commands using the browser's Web Speech API (when supported).
- Camera + microphone recording using browser permissions and `MediaRecorder`.
- A local Node backend to save task requests, activity, and submitted recordings under `data/` (which is ignored by Git).
- Coding, authorized security-research, and research-memory task routing. These create safe local task records; they do **not** execute shell commands, scan systems, or submit data to a third party.
- Responsive command-center UI, live local activity feed, recording timer, and permission/error feedback.

## Run

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). Camera/microphone access generally requires `localhost` or HTTPS. Recordings are limited only by the device/browser and disk; they are **not claimed to be unlimited**.

## Free API / service policy

The implementation intentionally uses browser capabilities and Node standard-library APIs only. This avoids hidden paid APIs. A production AI agent needs a chosen model provider or self-hosted model, user authentication, encrypted storage, retention/deletion controls, and explicit authorization checks for every security-testing target.
