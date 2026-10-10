https://ai-interview-yxih.onrender.com/
# InterviewForge — AI Mock Interview Studio

InterviewForge is a local-first mock interview practice app built with React, Vite, and a small Node.js backend. It provides role-based questions, a virtual interview room, webcam recording, verbatim speech transcription, answer review, and an AI coaching report.

## Interview privacy and captions

- The camera preview is live only; the app does not record or save interview video.
- Each answer is captured as temporary audio in browser memory so it can be transcribed, then used for the transcript/review flow. It is not written to a video file or a database.
- Interviewer captions stay in a fixed Meet-style overlay. A separate fixed “Your transcript” panel keeps the latest candidate answer visible while the next question is spoken and while the page scrolls.
- Interview controls remain fixed at the bottom of the viewport.
- If Gemini TTS hits its quota, the app falls back to an available English browser voice so the interview can continue. Browser voice availability and gender labels vary by operating system/browser.


## What it does

- Generates role- and resume-aware interview questions using Gemini 3.1 Flash-Lite.
- Uses the configured Gemini TTS interviewer voice (`Kore`) when available. If Gemini TTS is rate-limited or unavailable, it falls back to a consistent English voice selected from the browser's installed speech voices; voice gender and quality depend on the operating system/browser.
- Captures microphone audio with `MediaRecorder` and detects pauses locally. You can press **Stop mic** to end recording manually.
- Transcribes the captured audio using Gemini 3.5 Transcribe in verbatim mode, including repetitions, filler words, technical terms, and false starts where audible.
- Shows live captions in the interview stage instead of a typing box. Browser speech recognition provides live candidate captions where supported; Gemini transcription replaces them with the final full transcript after capture.
- Preserves the last captured audio if transcription fails and offers **Retry transcription**.
- Records camera and microphone locally in the browser, with playback and download.
- Produces an AI coaching review only when there is enough transcript data. If transcription or evaluation fails, it does not invent an overall score.
- Shows word count, filler-word matches, answer count, and question completion as separate transcript statistics. It does not claim to measure facial expression, eye contact, vocal emotion, or confidence.

## Windows setup

1. Install Node.js LTS from https://nodejs.org/.
2. Create a Gemini API key at https://aistudio.google.com/apikey.
3. Extract this ZIP and open PowerShell in the `ai-mock-interview` folder.
4. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

5. Open `.env` and replace `replace_with_your_gemini_api_key` with your key. Never share the key or put it in frontend code.
6. Install dependencies and start the app:

   ```powershell
   npm install
   npm run dev
   ```

7. Open `http://127.0.0.1:5173` in Chrome or Edge. Allow camera and microphone access, then start a session.

## Interview flow

1. Choose a role, optionally upload a PDF/TXT/MD resume, and optionally paste custom questions.
2. Enable the camera and microphone, then start the interview.
3. The interviewer speaks using the configured female AI voice. After playback, the mic starts automatically.
4. Captions appear as the interviewer audio plays. When your microphone activates, live candidate captions appear while you speak where browser speech recognition is supported.
5. A pause of about 5.5 seconds ends capture automatically, or press **Stop mic**. Gemini then transcribes the captured audio in verbatim mode and replaces the live caption text with the final transcript.
6. Press **Submit** to continue once the final transcript is ready. If transcription fails, the captured audio is retained for **Retry**.
7. After enough usable answers, the AI creates a coaching report. If there are fewer than two usable answers or fewer than 25 transcript words, the session is marked **Not Scored**.

## Privacy and data handling

- Webcam video remains in the browser unless you download or share it.
- The captured answer audio is uploaded temporarily to Google's Gemini Files API for transcription, then the app requests deletion after the transcription request finishes. Google-side deletion can fail; do not include highly sensitive information.
- Resume text and answer transcripts are sent to Gemini for question generation, follow-ups, and evaluation.
- The Gemini API key is read by the Node backend from `.env` and is not exposed to the frontend bundle.
- No application database is required.

## Troubleshooting

- **Port 3001 already in use:** stop the old Node process or close the other terminal running InterviewForge, then run `npm run dev` again.
- **Gemini API key missing:** confirm `.env` contains `GEMINI_API_KEY=...`, then stop and restart the app.
- **Transcription error:** the app displays the error and keeps the captured audio for retry. Check API key access/quota, network connection, and browser microphone permissions.
- **Gemini voice quota exhausted:** the app falls back to a browser-provided English voice. The available voice depends on Chrome/Edge and installed operating-system voices; use **Repeat question** to try again.
- **Camera/microphone blocked:** allow both in browser site settings for `127.0.0.1`, and check Windows Settings → Privacy & security → Microphone.
- **Wrong microphone selected:** connect the intended headset before enabling camera/microphone, then reconnect the devices in the browser.

## Scoring note

The overall coaching score is calculated from Gemini's transcript-based ratings for technical content, explanation structure, clarity, relevance, and communication. It is a practice aid, not an objective measurement of employability. The app does not use invented baseline scores when the transcript is missing or the evaluator fails.

## Meet-inspired interview room controls

The interview room uses a full-window call layout inspired by common video meeting apps. During a session, the app hides the setup navigation and footer to keep the call stage focused. The bottom dock includes microphone mute/unmute, camera on/off, captions toggle, Present now (browser screen sharing), repeat question, skip, continue after transcription, and End call. Screen sharing uses the browser's native `getDisplayMedia` permission picker; stop sharing from the app control or the browser's native sharing UI. Live candidate captions use the browser's SpeechRecognition implementation when available; the complete answer transcript is finalized separately through the configured Gemini transcription endpoint.

For the best live-caption support, use a current version of Chrome or Edge on `localhost`. Browser speech recognition is an interim caption stream and may differ slightly from the final audio transcription. Captions can be turned on/off using the CC control. The application is a Meet-inspired practice interface, not an official Google Meet client.

## Resume-first setup and live captions update

The setup screen now asks for only two inputs: a readable resume file (PDF, TXT, or Markdown) and the target role. Camera and microphone permissions are requested after selecting **Enter interview room**. The app attempts to infer the candidate name from the first plausible line of the extracted resume and uses up to 25,000 characters of extracted resume text when generating role-specific questions. Scanned/image-only PDFs need OCR before their contents can be used.

During the call, candidate captions use the browser's Web Speech API interim results so text can appear while the candidate is speaking; Gemini transcription remains the final transcript used for answer review. The caption surface stays pinned above the call controls, remains visible while the page scrolls, and can scroll internally when the transcript is long. The last interviewer question remains visible while the candidate begins answering; candidate live words replace it as they arrive. Chrome or Edge on localhost is recommended; live interim captions depend on browser speech-recognition availability and may differ from the final Gemini transcript.

## Live captions and call-room behavior (deep fix)

- Candidate live captions use the browser Web Speech recognition API only during an active candidate answer recording. Recognition is not started before camera/microphone permission is granted or while the interviewer audio is playing.
- The caption recognizer is stopped when that answer recording stops; the complete recorded answer is then transcribed by Gemini and replaces the interim browser captions for review.
- If Chrome cannot provide interim recognition (for example, speech recognition is disabled, blocked by permissions, or unavailable offline), the call UI displays a caption status/error. The final Gemini transcript remains available after recording, but cannot provide true live captions because it is a request/response transcription endpoint.
- The interview call view uses a Meet-inspired meeting layout with a floating self-view, persistent stage captions, sticky meeting controls, screen sharing, and an end-call action. It is Meet-inspired and does not use Google's branding or claim to be the Google Meet product.
