import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './styles.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


function MeetIcon({ name }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    mic: <><rect {...p} x="9" y="3" width="6" height="12" rx="3"/><path {...p} d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/></>,
    micOff: <><path {...p} d="M9 9V6a3 3 0 0 1 5.8-1M15 10v2a3 3 0 0 1-.7 1.9M5.5 11.5a6.5 6.5 0 0 0 10.9 4.8M12 18v3M9 21h6M3 3l18 18"/></>,
    camera: <><rect {...p} x="3" y="6" width="13" height="12" rx="2"/><path {...p} d="m16 10 5-3v10l-5-3z"/></>,
    cameraOff: <><path {...p} d="M3 7.5A1.5 1.5 0 0 1 4.5 6H13M16 10l5-3v10l-5-3M3 3l18 18M3 10v6a2 2 0 0 0 2 2h9"/></>,
    captions: <><rect {...p} x="3" y="5" width="18" height="14" rx="2"/><path {...p} d="M10 10H8a2 2 0 0 0 0 4h2M17 10h-2a2 2 0 0 0 0 4h2"/></>,
    present: <><rect {...p} x="3" y="4" width="18" height="13" rx="2"/><path {...p} d="M12 17v4M8 21h8M12 13V7m-3 3 3-3 3 3"/></>,
    more: <><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></>,
    repeat: <><path {...p} d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/></>,
    skip: <><path {...p} d="m5 5 10 7-10 7zM19 5v14"/></>,
    retry: <><path {...p} d="M20 7v5h-5M4 17v-5h5"/><path {...p} d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/></>,
    continue: <><path {...p} d="m5 12 4 4L19 6"/></>,
    phone: <path {...p} d="M7 3h3l2 5-2.2 1.8a15 15 0 0 0 4.4 4.4L16 12l5 2v3c0 1.1-.9 2-2 2C10 19 5 14 4 5c0-1.1.9-2 2-2z"/>
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">{paths[name] || paths.more}</svg>;
}

const ROLE_QUESTIONS = {
  'Software Engineer (SDE)': [
    'Please introduce yourself and tell me about the technical skills most relevant to this role.',
    'Explain the four pillars of object-oriented programming, with a practical example.',
    'Walk me through a project on your resume. What problem did it solve, and what did you personally build?',
    'How would you find the second-largest distinct number in an integer array? Explain your approach and edge cases.',
    'What is the difference between an INNER JOIN and a LEFT JOIN in SQL?',
    'Tell me about a time you were stuck on a technical problem. How did you work through it?',
    'How would you debug an API that suddenly became slow in production?',
    'What would you do if you disagreed with a teammate about a technical decision?'
  ],
  'Full Stack Developer': [
    'Please introduce yourself and describe your full-stack development experience.',
    'Explain how a request travels from a React UI to an Express API and then to a database.',
    'How do you manage state in React, and when would you use a context or external store?',
    'How would you design authentication for a web application?',
    'Explain database relations and how you would model users and job applications.',
    'Walk me through a project you built, including a difficult bug you fixed.',
    'How would you investigate a slow page or API endpoint?',
    'Tell me about a time you had to learn a new tool quickly.'
  ],
  'Java Developer': [
    'Please introduce yourself and explain why you are interested in a Java developer role.',
    'Explain encapsulation, inheritance, polymorphism, and abstraction with examples.',
    'What is the difference between method overloading and method overriding?',
    'How do HashMap and HashSet work at a high level?',
    'How would you handle exceptions in a service layer?',
    'Explain the project on your resume where you used Java or backend concepts.',
    'How would you test a method that processes a list of records?',
    'Tell me about a time you received feedback and changed your approach.'
  ],
  'Data Analyst': [
    'Please introduce yourself and describe your experience working with data.',
    'Explain the difference between WHERE and HAVING in SQL.',
    'How would you investigate a sudden drop in a business KPI?',
    'How would you handle missing or duplicate data?',
    'Describe a project where you used data to answer a question.',
    'How would you explain a technical finding to a non-technical stakeholder?',
    'How do you validate that a report is accurate?',
    'Tell me about a time you had to work with an ambiguous request.'
  ],
  'HR / Behavioural': [
    'Please introduce yourself and tell me what kind of role you are looking for.',
    'Why are you interested in this role and this company?',
    'Tell me about a challenge you faced and how you handled it.',
    'Describe a time you worked with someone whose approach differed from yours.',
    'What is one skill you are actively improving, and how are you improving it?',
    'Tell me about a mistake you made and what you learned from it.',
    'How do you prioritize when several tasks have the same deadline?',
    'What questions do you have for the interviewer?'
  ]
};

const FOLLOW_UPS = [
  'Could you walk me through that step by step?',
  'What trade-offs did you consider, and why?',
  'What would you change if you had another week to improve it?',
  'How did you verify that your solution worked?'
];

function App() {
  const [role, setRole] = useState('Software Engineer (SDE)');
  const [resumeName, setResumeName] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [customQuestions, setCustomQuestions] = useState('');
  const [questionCount, setQuestionCount] = useState('8');
  const [candidateName, setCandidateName] = useState('');
  const [status, setStatus] = useState('setup');
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('Waiting for interviewer');
  const [liveCaption, setLiveCaption] = useState('');
  const [captionSpeaker, setCaptionSpeaker] = useState('');
  const [captionHint, setCaptionHint] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [canRetryTranscription, setCanRetryTranscription] = useState(false);
  const [voiceMode, setVoiceMode] = useState('Checking microphone');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [candidateTranscript, setCandidateTranscript] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('question');
  const [followUpCount, setFollowUpCount] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const captionsEnabledRef = useRef(true);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showMoreControls, setShowMoreControls] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState(null);
  const [privacyConsent, setPrivacyConsent] = useState(true);
  const [aiStatus, setAiStatus] = useState({ state: 'checking', message: 'Checking Gemini API configuration…' });
  const [isThinking, setIsThinking] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const videoRef = useRef(null);
  const screenShareVideoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const questionStartedAtRef = useRef(Date.now());
  const voiceInputRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const activeInterviewRef = useRef(false);
  const autoSubmitLockRef = useRef(false);
  const startListeningRef = useRef(null);
  const submitAnswerRef = useRef(null);
  const speakingRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const levelTimerRef = useRef(null);
  const answerRecorderRef = useRef(null);
  const answerChunksRef = useRef([]);
  const lastAnswerBlobRef = useRef(null);
  const answerHasVoiceRef = useRef(false);
  const silenceStartedAtRef = useRef(0);
  const transcribingRef = useRef(false);
  const answerStartedAtRef = useRef(0);
  const lastAnswerDurationRef = useRef(0);
  const captionRecognitionRef = useRef(null);
  const captionRecognitionActiveRef = useRef(false);
  const captionFinalRef = useRef('');
  const captionRestartTimerRef = useRef(null);
  const browserVoiceRef = useRef(null);

  const currentQuestion = questions[questionIndex] || '';
  const supportSpeechRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
    if (screenShareVideoRef.current && screenShareStream) screenShareVideoRef.current.srcObject = screenShareStream;
  }, [status, cameraReady, screenSharing, screenShareStream]);

  useEffect(() => {
    checkGeminiAPI();
  }, []);

  async function checkGeminiAPI() {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('InterviewForge backend is not running');
      const data = await response.json();
      if (!data.configured) {
        setAiStatus({ state: 'missing-key', message: 'Gemini API key not configured' });
        return;
      }
      setAiStatus({ state: 'ready', message: 'Gemini 3.1 Flash-Lite connected' });
    } catch {
      setAiStatus({ state: 'offline', message: 'AI backend is not running. Start the app with npm run dev.' });
    }
  }

  async function askGemini(messages) {
    const response = await fetch('/api/gemini', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Gemini API request failed (${response.status}).`);
    const content = data.text;
    if (!content) throw new Error('Gemini returned an empty response. Please retry.');
    try { return JSON.parse(content); } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Gemini returned an unreadable response. Please retry.');
    }
  }

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript]);

  useEffect(() => () => {
    activeInterviewRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    stopRecognition();
    window.speechSynthesis?.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (screenShareStream) screenShareStream.getTracks().forEach(t => t.stop());
  }, []);

  function stopLiveCaptions() {
    captionRecognitionActiveRef.current = false;
    if (captionRestartTimerRef.current) clearTimeout(captionRestartTimerRef.current);
    captionRestartTimerRef.current = null;
    const recognition = captionRecognitionRef.current;
    captionRecognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      try { recognition.stop(); } catch { try { recognition.abort(); } catch {} }
    }
  }

  function startLiveCaptions() {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setCaptionHint('Live captions are unavailable in this browser. The answer transcript will appear after microphone capture finishes.');
      return;
    }
    stopLiveCaptions();
    captionRecognitionActiveRef.current = true;
    setCaptionHint('Starting live captions…');
    const launch = () => {
      if (!captionRecognitionActiveRef.current) return;
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = 'en-IN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => {
          if (activeInterviewRef.current && answerRecorderRef.current && !speakingRef.current) setCaptionHint('LIVE · LISTENING');
        };
        recognition.onresult = event => {
          // Recognition is started for the candidate answer window only, not during interviewer playback.
          // Keep interim results visible immediately; Gemini supplies the final transcript after recording.
          if (!answerRecorderRef.current || speakingRef.current || !activeInterviewRef.current) return;
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const phrase = String(event.results[i][0]?.transcript || '').trim();
            if (!phrase) continue;
            if (event.results[i].isFinal) captionFinalRef.current = `${captionFinalRef.current} ${phrase}`.trim();
            else interim = `${interim} ${phrase}`.trim();
          }
          const caption = `${captionFinalRef.current} ${interim}`.trim();
          if (caption) setCandidateTranscript(caption);
          if (caption && captionsEnabledRef.current) { setCaptionSpeaker('candidate'); setLiveCaption(caption); setCaptionHint('LIVE · YOU'); }
        };
        recognition.onerror = event => {
          if (event.error && !['no-speech', 'aborted'].includes(event.error)) {
            setCaptionHint(`LIVE CAPTIONS · ${event.error}`);
            if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
              captionRecognitionActiveRef.current = false;
              setNotice(`Live captions could not access the browser speech service (${event.error}). Check Chrome microphone permissions. Your answer audio will still be transcribed by Gemini after capture finishes.`);
            }
          }
        };
        recognition.onend = () => {
          if (captionRecognitionActiveRef.current) captionRestartTimerRef.current = setTimeout(launch, 250);
        };
        captionRecognitionRef.current = recognition;
        recognition.start();
      } catch {
        if (captionRecognitionActiveRef.current) captionRestartTimerRef.current = setTimeout(launch, 500);
      }
    };
    launch();
  }

  function stopRecognition() {
    stopLiveCaptions();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    levelTimerRef.current = null;
    const recorder = answerRecorderRef.current;
    answerRecorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      // This is a deliberate cancel/reset path. Manual Stop mic uses finishListening() below
      // so the recorder's onstop handler can flush the final chunk and transcribe it.
      recorder.onstop = null;
      try { recorder.stop(); } catch {}
    }
    setIsListening(false); setMicLevel(0);
  }

  function finishListening() {
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    levelTimerRef.current = null;
    const recorder = answerRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      setSpeechStatus('Finishing answer capture…');
      try { recorder.stop(); } catch (error) {
        setError(`Could not finish microphone capture: ${error.message || 'unknown error'}`);
      }
    }
  }

  function inferResumeName(text) {
    const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    for (const line of lines.slice(0, 8)) {
      if (line.length < 3 || line.length > 60) continue;
      if (/@|https?:|www\.|\d{4,}|resume|curriculum vitae|portfolio|linkedin/i.test(line)) continue;
      if (/^[A-Za-z][A-Za-z .'-]+$/.test(line) && line.split(/\s+/).length <= 5) return line;
    }
    return '';
  }

  async function handleResume(file) {
    setError('');
    setNotice('');
    if (!file) return;
    setResumeName(file.name);
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const data = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        let text = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }
        setResumeText(text.trim());
        const inferredName = inferResumeName(text); if (inferredName) setCandidateName(inferredName);
        setNotice(text.trim() ? `Resume ready · ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'} extracted. Your interview will be personalized from the resume.` : 'The PDF has no selectable text. Try an exported text PDF or a TXT resume.');
      } else if (file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name)) {
        const text = await file.text();
        setResumeText(text);
        const inferredName = inferResumeName(text); if (inferredName) setCandidateName(inferredName);
        setNotice('Resume ready. Questions will be grounded in the information extracted from your resume.');
      } else {
        setResumeText('');
        setNotice('Please upload a text-based PDF or TXT/MD resume. DOCX files are not supported in this version.');
      }
    } catch (e) {
      setError(`Could not read this resume: ${e.message || 'unknown error'}`);
    }
  }

  async function buildQuestions() {
    const count = 8;
    const resume = resumeText.trim().slice(0, 25000);
    const result = await askGemini([
      { role: 'system', content: 'You are a careful technical and behavioural interviewer. Create realistic, role-relevant interview questions. Use the candidate resume when provided. Do not invent resume facts. Return only valid JSON.' },
      { role: 'user', content: `Create exactly ${count} interview questions for the role: ${role}. Treat the uploaded resume as the source of truth. Read all supplied resume text and use its actual skills, project names, work history, education, tools, achievements, and stated responsibilities to personalize questions wherever relevant. Do not invent facts or ask the candidate to confirm details already clearly stated. Include a mix of resume-deep-dive, role fundamentals, problem solving, and behavioural questions. Start with a concise introduction question and avoid generic filler questions. Candidate name inferred from resume if available: ${candidateName || 'not identified'}. Full extracted resume text: ${resume || 'No resume provided'}. Return JSON only in this schema: {"questions":["question 1", "question 2"]}.` }
    ]);
    if (!Array.isArray(result.questions) || !result.questions.length) throw new Error('Gemini could not generate interview questions. Check your API key and try again.');
    return result.questions.map(q => String(q).trim()).filter(Boolean).slice(0, count);
  }

  async function enableCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not available in this browser/context. Open the app on localhost or HTTPS and try again.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: true });
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (screenShareStream) screenShareStream.getTracks().forEach(t => t.stop());
      streamRef.current = stream;
      setCameraReady(true);
      setNotice('Camera and microphone are ready. Video is live only; it is not recorded or stored.');
      if (videoRef.current) videoRef.current.srcObject = stream;
      return true;
    } catch (e) {
      setError(`Camera/microphone permission failed: ${e.message}. Allow camera and microphone access, then try again.`);
      return false;
    }
  }

  function speakWithBrowserVoice(text) {
    const synth = window.speechSynthesis;
    if (!synth || typeof window.SpeechSynthesisUtterance === 'undefined') {
      speakingRef.current = false;
      setIsSpeaking(false);
      setVoiceMode('Voice unavailable');
      setSpeechStatus('Interviewer voice unavailable · read the question on screen');
      setError('Gemini voice is rate-limited and this browser does not provide speech synthesis. The question remains visible; use the mic controls to answer.');
      if (activeInterviewRef.current && autoMode) setTimeout(() => startListeningRef.current?.(), 500);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    const voices = synth.getVoices();
    const femaleNames = /female|samantha|zira|aria|jenny|susan|karen|hazel|sonia|libby|natasha|google uk english female/i;
    const englishVoices = voices.filter(voice => /^en([_-]|$)/i.test(voice.lang || ''));
    const preferred = browserVoiceRef.current || voices.find(voice => femaleNames.test(voice.name || '') && /^en([_-]|$)/i.test(voice.lang || '')) || englishVoices[0] || voices[0];
    if (preferred) {
      utterance.voice = preferred;
      browserVoiceRef.current = preferred;
      utterance.lang = preferred.lang || 'en-IN';
    } else utterance.lang = 'en-IN';
    utterance.rate = 0.96;
    utterance.pitch = 1.04;
    utterance.onstart = () => {
      speakingRef.current = true;
      setIsSpeaking(true);
      setSpeechStatus('Interviewer speaking · browser voice');
      setVoiceMode('Browser voice fallback');
      if (captionsEnabledRef.current) {
        setCaptionSpeaker('interviewer');
        setLiveCaption(String(text).trim());
        setCaptionHint('INTERVIEWER');
      }
    };
    utterance.onboundary = event => {
      if (!captionsEnabledRef.current || !String(text).trim()) return;
      const index = Number(event.charIndex || 0);
      const length = Number(event.charLength || 18);
      const visible = String(text).slice(0, Math.min(String(text).length, index + Math.max(length, 1))).trim();
      if (visible) { setCaptionSpeaker('interviewer'); setLiveCaption(visible); }
    };
    utterance.onend = () => {
      speakingRef.current = false;
      setIsSpeaking(false);
      setVoiceMode('Browser voice fallback');
      setSpeechStatus('Interviewer finished · your turn');
      if (captionsEnabledRef.current) { setCaptionSpeaker('interviewer'); setLiveCaption(String(text).trim()); setCaptionHint('INTERVIEWER'); }
      if (activeInterviewRef.current) {
        questionStartedAtRef.current = Date.now();
        autoSubmitLockRef.current = false;
        if (autoMode) setTimeout(() => startListeningRef.current?.(), 300);
      }
    };
    utterance.onerror = event => {
      speakingRef.current = false;
      setIsSpeaking(false);
      setVoiceMode('Browser voice playback failed');
      setSpeechStatus('Read the question on screen');
      setNotice(`Browser speech could not play (${event.error || 'unknown error'}). The question is still shown on screen.`);
      if (activeInterviewRef.current && autoMode) setTimeout(() => startListeningRef.current?.(), 500);
    };
    setNotice('Gemini voice quota is exhausted, so InterviewForge is using the same browser voice for the remaining questions.');
    try { synth.speak(utterance); }
    catch (error) {
      speakingRef.current = false;
      setIsSpeaking(false);
      setError(`Browser voice could not start: ${error.message || 'unknown error'}. The question remains visible.`);
      if (activeInterviewRef.current && autoMode) setTimeout(() => startListeningRef.current?.(), 500);
    }
  }

  async function speak(text) {
    if (!text) return;
    window.speechSynthesis?.cancel();
    speakingRef.current = true;
    setIsSpeaking(false);
    setSpeechStatus('Preparing interviewer audio…');
    setVoiceMode('Preparing female AI voice');
    try {
      const response = await fetch('/api/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.audio) throw new Error(data.error || 'The selected female AI voice is unavailable.');
      const bytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
      let blob;
      if ((data.mimeType || '').includes('L16') || (data.mimeType || '').toLowerCase().includes('pcm')) {
        const rate = Number((data.mimeType.match(/rate=(\d+)/i) || [])[1]) || 24000;
        const wav = new ArrayBuffer(44 + bytes.length);
        const view = new DataView(wav);
        const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
        write(0, 'RIFF'); view.setUint32(4, 36 + bytes.length, true); write(8, 'WAVE'); write(12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
        view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
        write(36, 'data'); view.setUint32(40, bytes.length, true); new Uint8Array(wav, 44).set(bytes);
        blob = new Blob([wav], { type: 'audio/wav' });
      } else blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      const captionWords = String(text).trim().split(/\s+/).filter(Boolean);
      audio.onplay = () => {
        speakingRef.current = true;
        setIsSpeaking(true);
        setSpeechStatus('Interviewer speaking');
        if (captionsEnabledRef.current) { setCaptionSpeaker('interviewer'); setLiveCaption(''); setCaptionHint('LIVE · INTERVIEWER'); }
      };
      audio.ontimeupdate = () => {
        if (!captionWords.length) return;
        const duration = Number(audio.duration);
        const ratio = Number.isFinite(duration) && duration > 0 ? Math.min(1, audio.currentTime / duration) : Math.min(1, audio.currentTime / Math.max(2, captionWords.length * 0.34));
        const visibleWords = Math.max(1, Math.min(captionWords.length, Math.ceil(captionWords.length * ratio)));
        if (captionsEnabledRef.current) { setCaptionSpeaker('interviewer'); setLiveCaption(captionWords.slice(0, visibleWords).join(' ')); }
      };
      audio.onended = () => {
        if (captionsEnabledRef.current) setLiveCaption(String(text).trim());

        URL.revokeObjectURL(audioUrl);
        speakingRef.current = false; setIsSpeaking(false); setVoiceMode('Female AI voice · Kore');
        if (activeInterviewRef.current) {
          questionStartedAtRef.current = Date.now(); autoSubmitLockRef.current = false;
          if (autoMode) setTimeout(() => startListeningRef.current?.(), 300);
        }
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        speakingRef.current = false; setIsSpeaking(false); setVoiceMode('Voice playback failed');
        setSpeechStatus('Voice playback failed');
        setError('The selected female AI voice could not play. Check the Gemini API key/quota, then use Repeat to try again. The app will not switch to a different voice.');
      };
      await audio.play();
    } catch (error) {
      speakingRef.current = false;
      setIsSpeaking(false);
      setVoiceMode('Gemini voice unavailable · using browser voice');
      setSpeechStatus('Switching to browser voice…');
      speakWithBrowserVoice(text);
    }
  }

  // The app deliberately does not record or store interview video. This timer only tracks call duration.
  function startRecorder() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(v => v + 1), 1000);
  }

  function stopRecorder() {
    stopRecognition();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
  }

  async function startInterview() {
    setError(''); setNotice(''); setReport(null); setTranscript([]); setDraftAnswer(''); setCandidateTranscript(''); setFollowUpCount(0); setQuestionIndex(0); setLiveCaption(''); setCaptionSpeaker(''); setCaptionHint(''); setCaptionsEnabled(true); captionsEnabledRef.current = true; setMicMuted(false); setCameraOff(false);
    if (aiStatus.state !== 'ready') { setError('Connect the Gemini API first. Add your key to the .env file and restart the app.'); return; }
    if (!resumeText.trim()) { setError('Upload a readable PDF, TXT, or MD resume first so the interview can be personalized.'); return; }
    // Live speech recognition starts only after getUserMedia has granted microphone access
    // and the candidate recorder is active. Starting it before permission caused silent caption sessions.
    setIsThinking(true);
    try {
      if (!cameraReady || !streamRef.current) {
        const mediaReady = await enableCamera();
        if (!mediaReady || !streamRef.current) throw new Error('Camera and microphone permission is required to begin the interview.');
      }
      const built = await buildQuestions();
      if (!built.length) throw new Error('No questions were generated.');
      setQuestions(built);
      questionStartedAtRef.current = Date.now();
      voiceInputRef.current = false;
      setSpeechStatus('Interviewer speaking');
      setNotice('');
      setStatus('interview');
      activeInterviewRef.current = true;
      autoSubmitLockRef.current = false;
      startRecorder();
      setTimeout(() => speak(`Hello${candidateName.trim() ? ` ${candidateName.trim()}` : ''}. Welcome to your ${role} mock interview. I will ask one question at a time. When I finish speaking, your microphone will activate automatically. When you pause for five seconds, I will transcribe your answer and automatically continue to the next question. ${built[0]}`), 350);
    } catch (e) {
      stopLiveCaptions();
      setError(e.message || 'Could not start the interview.');
    } finally { setIsThinking(false); }
  }

  async function transcribeAnswerBlob(blob, mimeType = 'audio/webm', autoAdvance = false) {
    if (!blob || blob.size < 300) {
      setSpeechStatus('Recording too short — try again');
      setError('The captured audio was too short to transcribe. Record the answer again and speak for a moment before stopping.');
      setCanRetryTranscription(false);
      return;
    }
    transcribingRef.current = true;
    setIsListening(false);
    setSpeechStatus('Transcribing your answer…');
    setVoiceMode('Transcribing with Gemini 3.5 Transcribe');
    setCanRetryTranscription(false);
    try {
      const base64 = await blobToBase64(blob);
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, mimeType: (blob.type || mimeType || 'audio/webm').split(';')[0] })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Audio transcription failed (${response.status}).`);
      const answer = String(data.text || '').trim();
      if (!answer) throw new Error('The transcription model returned no words. Your recording is preserved; retry transcription or record again.');
      setDraftAnswer(answer);
      setCandidateTranscript(answer);
      setCaptionSpeaker('candidate'); setLiveCaption(answer); setCaptionHint('Final transcript · Gemini');
      voiceInputRef.current = true;
      setSpeechStatus(autoAdvance ? 'Transcript ready · moving to next question…' : 'Transcript ready · review before submitting');
      setVoiceMode('Microphone ready');
      setError('');
      // On the automatic silence-stop path, submit Gemini's final transcript and continue.
      if (autoAdvance) {
        await new Promise(resolve => setTimeout(resolve, 350));
        await submitAnswer(answer);
      }
    } catch (error) {
      setSpeechStatus('Transcription failed — retry recording');
      setError(`Your microphone audio was captured temporarily, but transcription failed: ${error.message}`);
      setCaptionHint('TRANSCRIPTION FAILED · RETRY AVAILABLE');
      setCanRetryTranscription(Boolean(lastAnswerBlobRef.current));
      if (captionFinalRef.current.trim()) { setCandidateTranscript(captionFinalRef.current.trim()); setCaptionSpeaker('candidate'); setLiveCaption(captionFinalRef.current.trim()); }
    } finally {
      transcribingRef.current = false;
    }
  }

  function startListening() {
    if (!activeInterviewRef.current || speakingRef.current || transcribingRef.current) return;
    setError('');
    const stream = streamRef.current;
    if (!stream || !stream.getAudioTracks().some(track => track.readyState === 'live' && track.enabled)) {
      setSpeechStatus('Microphone unavailable'); setVoiceMode('Microphone permission required');
      setError('The microphone track is not active. Click the microphone control to retry, or return to setup and reconnect the camera/microphone.');
      return;
    }
    try {
      const previousRecorder = answerRecorderRef.current;
      if (previousRecorder && previousRecorder.state !== 'inactive') {
        previousRecorder.onstop = null;
        try { previousRecorder.stop(); } catch {}
      }
      answerRecorderRef.current = null;
      captionFinalRef.current = '';
      autoSubmitLockRef.current = false; answerHasVoiceRef.current = false; silenceStartedAtRef.current = 0;
      answerChunksRef.current = []; lastAnswerBlobRef.current = null; lastAnswerDurationRef.current = 0; setCanRetryTranscription(false); setDraftAnswer(''); setMicLevel(0);
      const audioTrackStream = new MediaStream(stream.getAudioTracks());
      const audioType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(audioTrackStream, audioType ? { mimeType: audioType } : undefined);
      answerRecorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data?.size) answerChunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        if (answerRecorderRef.current !== recorder) return;
        answerRecorderRef.current = null;
        stopLiveCaptions();
        if (!activeInterviewRef.current || autoSubmitLockRef.current) {
          setIsListening(false); setMicLevel(0);
          return;
        }
        const blob = new Blob(answerChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        answerChunksRef.current = [];
        lastAnswerBlobRef.current = blob;
        lastAnswerDurationRef.current = Math.max(1, Math.round((Date.now() - answerStartedAtRef.current) / 1000));
        await transcribeAnswerBlob(blob, recorder.mimeType || 'audio/webm', true);
      };
      recorder.start(250);
      setIsListening(true); setSpeechStatus('Microphone active — speak now'); setVoiceMode('Listening to microphone');
      setCaptionHint('Starting live captions…');
      answerStartedAtRef.current = Date.now();
      // Start only after microphone permission exists and MediaRecorder is actively capturing.
      startLiveCaptions();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Audio input monitoring is not supported in this browser.');
      const audioContext = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') audioContext.resume();
      const source = audioContext.createMediaStreamSource(audioTrackStream);
      const analyser = audioContext.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser); analyserRef.current = analyser;
      const samples = new Uint8Array(analyser.fftSize);
      levelTimerRef.current = setInterval(() => {
        if (!answerRecorderRef.current || recorder.state !== 'recording') return;
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) { const value = (samples[i] - 128) / 128; sum += value * value; }
        const rms = Math.sqrt(sum / samples.length);
        const level = Math.min(100, Math.round(rms * 360)); setMicLevel(level);
        if (rms > 0.0075) {
          answerHasVoiceRef.current = true; silenceStartedAtRef.current = 0;
          setSpeechStatus('Hearing your voice');
        } else if (answerHasVoiceRef.current) {
          if (!silenceStartedAtRef.current) silenceStartedAtRef.current = Date.now();
          if (Date.now() - silenceStartedAtRef.current > 5000 && Date.now() - answerStartedAtRef.current > 1800) {
            clearInterval(levelTimerRef.current); levelTimerRef.current = null;
            try { if (recorder.state === 'recording') recorder.stop(); } catch {}
          }
        }
        if (!answerHasVoiceRef.current && Date.now() - answerStartedAtRef.current > 75000) {
          clearInterval(levelTimerRef.current); levelTimerRef.current = null;
          try { if (recorder.state === 'recording') recorder.stop(); } catch {}
        }
      }, 100);
    } catch (error) {
      setIsListening(false); setSpeechStatus('Could not start microphone');
      setError(`Could not start microphone capture: ${error.message}. Check Windows microphone permissions and reconnect the microphone.`);
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(new Error('Could not read the microphone recording.'));
      reader.readAsDataURL(blob);
    });
  }

  async function submitAnswer(answerOverride) {
    if (autoSubmitLockRef.current) return;
    const answer = (typeof answerOverride === 'string' ? answerOverride : draftAnswer).trim();
    if (!answer) return;
    autoSubmitLockRef.current = true;
    // Candidate live captions stop with each recording; the next answer window starts a fresh recognizer.
    setSpeechStatus('Answer captured');
    const answerDuration = Math.max(1, Math.round((Date.now() - questionStartedAtRef.current) / 1000));
    const entry = { question: currentQuestion, answer, seconds: elapsed, durationSeconds: voiceInputRef.current && lastAnswerDurationRef.current ? lastAnswerDurationRef.current : answerDuration, source: voiceInputRef.current ? 'voice' : 'typed', timestamp: new Date().toISOString(), kind: 'answer' };
    voiceInputRef.current = false; lastAnswerDurationRef.current = 0;
    const updatedTranscript = [...transcript, entry];
    setTranscript(updatedTranscript);
    setDraftAnswer(''); setError(''); setActiveTab('transcript');
    const wasFollowUp = followUpCount > 0;
    const nextIndex = questionIndex + 1;
    if (wasFollowUp) {
      setFollowUpCount(0);
      if (nextIndex < questions.length) {
        setQuestionIndex(nextIndex);
        questionStartedAtRef.current = Date.now();
        setTimeout(() => speak(`Thank you. ${questions[nextIndex]}`), 250);
      } else setNotice('You have reached the end of the question queue. Finish the interview to generate your report.');
      return;
    }
    if (nextIndex >= questions.length) {
      setNotice('That was the final question. Preparing your interview review…');
      activeInterviewRef.current = false;
      setTimeout(() => finishInterview(updatedTranscript), 700);
      return;
    }
    setIsThinking(true);
    try {
      const result = await askGemini([
        { role: 'system', content: 'You are conducting a professional mock interview. Decide whether one concise follow-up question would meaningfully probe the candidate answer. Ask a follow-up only if it reveals a gap, needs clarification, or merits a deeper example. If the answer is adequate, return null. Do not be repetitive. Return JSON only.' },
        { role: 'user', content: `Role: ${role}. Resume context: ${resumeText.slice(0, 3000) || 'Not provided'}. Main question: ${currentQuestion}. Candidate answer: ${answer}. Return {"follow_up": "one concise follow-up question"} or {"follow_up": null}.` }
      ]);
      const follow = typeof result.follow_up === 'string' ? result.follow_up.trim() : '';
      if (follow) {
        setQuestions(prev => { const next = [...prev]; next.splice(questionIndex + 1, 0, follow); return next; });
        setFollowUpCount(1);
        setQuestionIndex(questionIndex + 1);
        questionStartedAtRef.current = Date.now();
        setTimeout(() => speak(`Thank you. I have one follow-up question. ${follow}`), 250);
      } else {
        setQuestionIndex(nextIndex);
        questionStartedAtRef.current = Date.now();
        setTimeout(() => speak(`Thank you. ${questions[nextIndex]}`), 250);
      }
    } catch (e) {
      setQuestionIndex(nextIndex);
      questionStartedAtRef.current = Date.now();
      setNotice(`Could not generate a follow-up, so we moved to the next question. ${e.message}`);
      setTimeout(() => speak(`Thank you. ${questions[nextIndex]}`), 250);
    } finally { setIsThinking(false); }
  }

  function toggleMic() {
    const track = streamRef.current?.getAudioTracks()?.[0];
    if (!track) { setError('Microphone is not connected. Return to setup and enable your camera/microphone.'); return; }
    const nextMuted = !micMuted;
    track.enabled = !nextMuted;
    setMicMuted(nextMuted);
    if (nextMuted && isListening) finishListening();
    else if (!nextMuted && activeInterviewRef.current && !speakingRef.current && !transcribingRef.current) startListeningRef.current?.();
  }

  function toggleCamera() {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) { setError('Camera is not connected. Return to setup and enable your camera.'); return; }
    const nextOff = !cameraOff;
    track.enabled = !nextOff;
    setCameraOff(nextOff);
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      screenShareStream?.getTracks().forEach(track => track.stop());
      setScreenShareStream(null);
      setScreenSharing(false);
      setNotice('Screen sharing stopped.');
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen sharing is not supported in this browser. Use the latest Chrome or Edge on localhost.');
      return;
    }
    try {
      const share = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15, max: 30 } }, audio: false });
      const track = share.getVideoTracks()[0];
      if (track) track.onended = () => { setScreenSharing(false); setScreenShareStream(null); };
      setScreenShareStream(share);
      setScreenSharing(true);
      setNotice('You are presenting your screen. Browser sharing indicators remain visible.');
    } catch (error) {
      if (error?.name !== 'NotAllowedError') setError(`Could not start screen sharing: ${error.message || 'unknown error'}`);
    }
  }

  function toggleCaptions() {
    setCaptionsEnabled(enabled => {
      const next = !enabled;
      captionsEnabledRef.current = next;
      if (!next) { setLiveCaption(''); setCaptionHint('Captions off'); }
      else { setCaptionHint('Live captions'); }
      return next;
    });
  }

  function skipQuestion() {
    stopLiveCaptions();
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    levelTimerRef.current = null;
    const activeRecorder = answerRecorderRef.current;
    answerRecorderRef.current = null;
    if (activeRecorder && activeRecorder.state !== 'inactive') { activeRecorder.onstop = null; try { activeRecorder.stop(); } catch {} }
    answerChunksRef.current = [];
    setIsListening(false); setMicLevel(0); setDraftAnswer(''); setError(''); setFollowUpCount(0);
    if (questionIndex + 1 < questions.length) {
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      questionStartedAtRef.current = Date.now();
      speak(`Let's move on. ${questions[nextIndex]}`);
    } else {
      setNotice('That was the last question. Preparing your interview review…');
      activeInterviewRef.current = false;
      setTimeout(() => finishInterview(transcript), 500);
    }
  }

  function scoreInterview(entries) {
    const answers = entries.filter(e => e.kind === 'answer');
    const allText = answers.map(e => e.answer).join(' ').toLowerCase();
    const words = allText.match(/[\w'-]+/g) || [];
    const fillerCount = (allText.match(/\b(um|uh|like|you know|basically|actually|literally)\b/g) || []).length;
    const avgWords = answers.length ? Math.round(words.length / answers.length) : 0;
    const voiceAnswers = answers.filter(a => a.source === 'voice' && a.durationSeconds > 0);
    const avgWpm = voiceAnswers.length ? Math.round(voiceAnswers.reduce((sum, a) => sum + ((a.answer.match(/[\w'-]+/g) || []).length * 60 / a.durationSeconds), 0) / voiceAnswers.length) : null;
    const completeness = Math.min(100, Math.round((answers.length / Math.max(1, questions.length)) * 100));
    const feedback = [];
    if (answers.length < questions.length) feedback.push(`You submitted ${answers.length} of ${questions.length} questions. Unanswered questions are not treated as incorrect answers.`);
    if (avgWords < 35) feedback.push('Your answers were brief on average. Consider adding context, your specific action, and the result when the question calls for it.');
    else if (avgWords > 130) feedback.push('Your answers were long on average. Try leading with the main point, then add only the details that support it.');
    else feedback.push('Your average answer length is workable. Keep using a clear point → explanation → example structure.');
    if (fillerCount > 4) feedback.push(`The transcript contains about ${fillerCount} common filler-word matches. This is a transcript count, not a voice-quality judgment.`);
    else feedback.push('Few common filler-word matches appeared in the transcript. This count can miss or misidentify spoken fillers.');
    feedback.push('Content ratings come from the AI review of the transcript. Word count, filler matches, and completion are separate transcript statistics; facial expression, vocal emotion, and confidence are not scored.');
    return { overall: null, content: null, structure: null, clarity: null, pace: null, avgWpm, voiceAnswers: voiceAnswers.length, relevance: null, completeness, communication: null, fillerCount, avgWords, totalWords: words.length, answerCount: answers.length, questionCount: questions.length, feedback, generatedAt: new Date().toISOString() };
  }

  async function finishInterview(entriesOverride) {
    activeInterviewRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    stopRecognition(); stopRecorder(); streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setCameraReady(false); screenShareStream?.getTracks().forEach(track => track.stop()); setScreenShareStream(null); setScreenSharing(false); window.speechSynthesis?.cancel(); speakingRef.current = false; setIsSpeaking(false); setSpeechStatus('Call ended');
    setIsThinking(true); setError('');
    const entries = Array.isArray(entriesOverride) ? entriesOverride : transcript;
    // Never manufacture a score when the interview contains no meaningful candidate answer.
    const validEntries = entries.filter(entry => entry.kind === 'answer' && String(entry.answer || '').trim().split(/\s+/).filter(Boolean).length >= 3);
    const usableWordCount = validEntries.reduce((sum, entry) => sum + (String(entry.answer || '').match(/[\w'-]+/g) || []).length, 0);
    if (validEntries.length < 2 || usableWordCount < 25) {
      setReport({ overall: null, content: null, structure: null, clarity: null, pace: null, avgWpm: null, voiceAnswers: 0, relevance: null, completeness: null, fillerCount: 0, avgWords: 0, totalWords: usableWordCount, answerCount: validEntries.length, questionCount: questions.length, feedback: ['There was not enough usable answer text to score this session fairly. This is not a failing score.', 'Check the microphone input selected in Windows and your browser permissions. Try one answer, then verify that the words appear in the answer box before continuing.', 'If the recording contains your voice but the transcript remains empty, check the error message shown by the app; transcription needs a working Gemini API key and a supported audio request.'], answerFeedback: [], evaluationMode: 'insufficient-data' });
      setIsThinking(false); setStatus('report'); setActiveTab('report');
      return;
    }
    const entriesToEvaluate = validEntries;
    const transcriptStats = scoreInterview(entriesToEvaluate);
    try {
      const result = await askGemini([
        { role: 'system', content: 'You are a rigorous but constructive interview coach. Evaluate only evidence in the transcript. Do not infer facial expression, vocal emotion, eye contact, or technical facts not supported by the answer. Give specific actionable feedback. Return valid JSON only.' },
        { role: 'user', content: `Evaluate this mock interview for role ${role}. Resume context: ${resumeText.slice(0, 3500) || 'Not provided'}. Interview transcript (only captured candidate answers; ignore empty or unusable answers): ${JSON.stringify(entriesToEvaluate.map(t => ({ question: t.question, answer: t.answer })))}. Give 0-100 scores for technical_content, explanation_structure, clarity, relevance, and communication. Include overall_feedback as 4-6 concise actionable observations and answer_feedback as an array of objects {question, strength, improvement}. Be fair to a junior candidate and explain what is missing rather than guessing. Return JSON schema: {"technical_content": 0, "explanation_structure": 0, "clarity": 0, "relevance": 0, "communication": 0, "overall_feedback": ["..."], "answer_feedback": [{"question":"...", "strength":"...", "improvement":"..."}]}.` }
      ]);
      const scoreFields = [result.technical_content, result.explanation_structure, result.clarity, result.relevance, result.communication];
      if (scoreFields.some(value => !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) throw new Error('The AI evaluator returned incomplete or invalid score fields. No score has been assigned.');
      const content = Number(result.technical_content);
      const structure = Number(result.explanation_structure);
      const clarity = Number(result.clarity);
      const relevance = Number(result.relevance);
      const communication = Number(result.communication);
      const overall = Math.round(content * .30 + structure * .20 + clarity * .15 + relevance * .20 + communication * .15);
      setReport({ ...transcriptStats, answerCount: entriesToEvaluate.length, overall, content, structure, clarity, relevance, communication, feedback: Array.isArray(result.overall_feedback) && result.overall_feedback.length ? result.overall_feedback : ['The AI review returned no coaching observations. Review the answer-by-answer notes and transcript manually.'], answerFeedback: Array.isArray(result.answer_feedback) ? result.answer_feedback : [], evaluationMode: 'gemini' });
    } catch (e) {
      // If AI evaluation fails, show transcript statistics and the failure reason, not a made-up overall score.
      setReport({ ...transcriptStats, overall: null, content: null, structure: null, clarity: null, pace: null, relevance: null, communication: null, evaluationMode: 'evaluation-unavailable', feedback: ['Your transcript was captured, but the AI evaluator did not return a valid review. No overall score has been assigned.', `Evaluation error: ${e.message}`, 'Check your Gemini API key, quota, and network connection, then run another practice session.'] });
    } finally {
      setIsThinking(false); setStatus('report'); setActiveTab('report');
    }
  }

  function resetInterview() {
    activeInterviewRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    stopRecognition(); stopRecorder(); streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setCameraReady(false); screenShareStream?.getTracks().forEach(track => track.stop()); setScreenShareStream(null); setScreenSharing(false); window.speechSynthesis?.cancel(); speakingRef.current = false;
    setStatus('setup'); setQuestions([]); setQuestionIndex(0); setTranscript([]); setDraftAnswer(''); setLiveCaption(''); setCaptionSpeaker(''); setCaptionHint(''); setCanRetryTranscription(false); lastAnswerBlobRef.current = null; lastAnswerDurationRef.current = 0; setReport(null); setElapsed(0); setFollowUpCount(0); setError(''); setNotice('');
  }

  function downloadTranscript() {
    const body = transcript.map((entry, i) => `Q${i + 1}: ${entry.question}\nAnswer: ${entry.answer}\n`).join('\n');
    const blob = new Blob([`InterviewForge transcript\nRole: ${role}\nCandidate: ${candidateName || 'Candidate'}\n\n${body}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'interview-transcript.txt'; a.click(); URL.revokeObjectURL(url);
  }

  startListeningRef.current = startListening;
  submitAnswerRef.current = submitAnswer;

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const progress = questions.length ? Math.min(100, Math.round(((questionIndex + (status === 'report' ? 1 : 0)) / questions.length) * 100)) : 0;

  return <div className={`app-shell ${status === 'setup' ? 'setup-mode' : ''}`}>
    {status !== 'interview' && <header className="topbar">
      <div className="brand"><div className="brand-mark">IF</div><div><div className="brand-title">InterviewForge</div><div className="brand-subtitle">Practice. Improve. Get hired.</div></div></div>
      <div className="steps"><span className={status === 'setup' ? 'step active' : 'step done'}>01 <b>Setup</b></span><i /> <span className={status === 'interview' ? 'step active' : status === 'report' ? 'step done' : 'step'}>02 <b>Interview</b></span><i /> <span className={status === 'report' ? 'step active' : 'step'}>03 <b>Review</b></span></div>
      <button className="btn btn-ghost" onClick={resetInterview}>↻ New interview</button>
    </header>}

    {status !== 'interview' && error && <div className="alert error"><span>⚠</span><div>{error}</div><button onClick={() => setError('')}>×</button></div>}
    {status !== 'interview' && notice && <div className="alert info"><span>ⓘ</span><div>{notice}</div><button onClick={() => setNotice('')}>×</button></div>}
    {status === 'interview' && error && <div className="meet-live-toast error-toast" role="alert"><span>⚠</span>{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}

    {status === 'setup' && <main className="setup-layout setup-minimal">
      <section className="setup-intro setup-hero">
        <div className="eyebrow"><span className="pulse-dot"/> YOUR PERSONAL INTERVIEW STUDIO</div>
        <h1>Walk in prepared.<br/><em>Speak with confidence.</em></h1>
        <p>Upload your resume, choose the role, and step into a realistic spoken interview. Questions are built from your actual experience—not a generic template.</p>
        <div className="setup-visual-card" aria-hidden="true">
          <div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/>
          <div className="hero-avatar"><span/></div>
          <div className="hero-caption"><i/> Interviewer is ready <b>●</b></div>
          <div className="hero-mini-stat"><strong>01</strong><span>Upload resume</span></div>
          <div className="hero-mini-stat second"><strong>02</strong><span>Choose role</span></div>
        </div>
        <div className="setup-trust-row"><span>✓ Resume-based questions</span><span>✓ Live captions</span><span>✓ Honest feedback</span></div>
      </section>
      <section className="setup-card setup-card-minimal">
        <div className="card-heading"><div><div className="eyebrow">READY WHEN YOU ARE</div><h2>Set up your interview</h2><p>Just two things. We'll handle the rest.</p></div><div className="setup-step-badge">2 steps</div></div>
        <div className={`ai-status-card ${aiStatus.state}`}><span className={`status-light ${aiStatus.state === 'ready' ? 'green' : ''}`}/><div><b>{aiStatus.message}</b><p>Your API key stays on the backend.</p></div><button className="text-button" onClick={checkGeminiAPI}>Recheck</button></div>
        {aiStatus.state !== 'ready' && <div className="ai-install-note"><b>One-time setup:</b> add <code>GEMINI_API_KEY</code> to the project's <code>.env</code> file, then restart.</div>}
        <label className="field-label">1. Upload your resume <span>PDF, TXT, or MD</span></label>
        <label className={`upload-zone upload-zone-large ${resumeText ? 'upload-ready' : ''}`}><input type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" onChange={e => handleResume(e.target.files?.[0])}/><div className="upload-icon">{resumeText ? '✓' : '↑'}</div><div className="upload-copy"><b>{resumeName || 'Drop your resume here'}</b><p>{resumeText ? `${resumeText.length.toLocaleString()} characters extracted · ready to personalize` : 'or click to browse files · your experience powers the interview'}</p></div><span className="upload-action">{resumeText ? 'Change file' : 'Choose file'}</span></label>
        <label className="field-label role-field-label">2. Choose your target role</label>
        <select className="text-input role-select-large" value={role} onChange={e => setRole(e.target.value)}>{Object.keys(ROLE_QUESTIONS).map(r => <option key={r}>{r}</option>)}</select>
        {resumeText && <div className="resume-ready-note"><span>✓</span><div><b>Resume parsed successfully</b><small>{candidateName ? `Candidate detected: ${candidateName}` : 'Your resume details will be used to tailor questions'} · no manual details needed</small></div></div>}
        <button className="btn btn-primary btn-large start-interview-cta" onClick={startInterview} disabled={isThinking || aiStatus.state !== 'ready' || !resumeText.trim()}>{isThinking ? 'Preparing your interview…' : 'Enter interview room'} <span>→</span></button>
        <div className="setup-privacy-note"><span>▣</span> Camera and microphone permission will be requested when you enter the room. Answers are transcribed and submitted automatically after five seconds of silence.</div>
      </section>
    </main>}

    {status === 'interview' && <main className="meet-layout">
      <div className="meeting-toolbar"><div className="meet-room-title"><span className="meeting-live-dot"/><div><b>{candidateName ? `${candidateName}'s interview` : 'Interview call'}</b><small>{role} · {fmtTime(elapsed)} elapsed</small></div></div><div className="meeting-toolbar-meta"><span className="meeting-secure">{Math.min(questionIndex + 1, questions.length)} / {questions.length} questions</span><span className="meet-progress"><i style={{ width: `${progress}%` }}/></span></div></div>
      <section className="meet-stage">
        {screenSharing ? <div className="meet-shared-stage">
          <video ref={screenShareVideoRef} autoPlay playsInline className="meet-shared-video" />
          <div className="meet-shared-label"><span className="share-indicator"/> You are presenting</div>
          <div className={`meet-presenter-tile ${isSpeaking ? 'speaking' : ''}`}>
            <div className={`meet-avatar ${isSpeaking ? 'voice-active' : ''}`}><span className="interviewer-orb"/><span className="meet-avatar-pulse"/></div>
            <div className="meet-person-name">Hiring Manager</div>
            <div className={isSpeaking ? 'audio-bars active' : 'audio-bars'}><i/><i/><i/><i/><i/></div>
          </div>
        </div> : <div className={`meet-primary-tile ${isSpeaking ? 'speaking' : ''}`}>
          <div className="meet-tile-label"><span className="status-light green"/> INTERVIEWER</div>
          <div className={`meet-avatar ${isSpeaking ? 'voice-active' : ''}`}><span className="interviewer-orb"/><span className="meet-avatar-pulse"/></div>
          <div className="meet-person-name">Hiring Manager</div><div className="meet-person-role">AI interviewer · {role}</div>
          <div className={isSpeaking ? 'audio-bars active' : 'audio-bars'}><i/><i/><i/><i/><i/><i/><i/></div>
          <div className="meet-speaking-status">{isSpeaking ? 'Speaking' : isThinking ? 'Thinking…' : speechStatus}</div>
        </div>}
        <div className="meet-self-tile">
          {cameraReady && !cameraOff ? <video ref={videoRef} autoPlay muted playsInline className="meet-self-video"/> : <div className="meet-self-placeholder">{candidateName || 'You'}<small>{cameraOff ? 'Camera off' : ''}</small></div>}
          <div className="meet-self-label"><span className={isListening ? 'self-mic-on' : 'self-mic-off'}>{isListening ? '🎙' : '🎙̸'}</span> You</div>
        </div>
        {captionsEnabled && <div className={`meet-caption-area ${liveCaption ? 'has-caption' : ''}`} aria-live="polite" aria-atomic="false">
          {liveCaption ? <><div className={`caption-speaker ${captionSpeaker === 'candidate' ? 'candidate-caption-speaker' : ''}`}>{captionSpeaker === 'interviewer' ? 'Hiring Manager' : 'You'} <span>{captionSpeaker === 'candidate' && isListening ? 'LIVE · YOUR VOICE' : captionHint || 'CAPTIONS'}</span></div><div className="caption-text">{liveCaption}</div></> : <div className="caption-placeholder"><b>{isListening ? 'You' : isSpeaking ? 'Hiring Manager' : 'Captions'}</b><span>{isListening ? (captionHint || 'Listening for your words…') : isSpeaking ? 'Interviewer captions appear as she speaks' : 'Live captions will appear here during the call'}</span></div>}
        </div>}
      </section>
      <div className="meet-control-dock">
        <div className="meet-control-status"><span className={isListening ? 'status-light green' : 'status-light'}/><div><b>{isListening ? 'Microphone on' : transcribingRef.current ? 'Transcribing answer…' : speechStatus}</b><small>{recording ? `In call · ${fmtTime(elapsed)}` : 'Practice session'}</small></div></div>
        <div className="call-controls meet-native-controls">
          <button className={`meet-icon-control ${micMuted ? 'is-off' : ''}`} onClick={toggleMic} title={micMuted ? 'Turn microphone on' : 'Turn microphone off'}><span><MeetIcon name={micMuted ? 'micOff' : 'mic'}/></span><small>{micMuted ? 'Unmute' : 'Mute'}</small></button>
          <button className={`meet-icon-control ${cameraOff ? 'is-off' : ''}`} onClick={toggleCamera} title={cameraOff ? 'Turn camera on' : 'Turn camera off'}><span><MeetIcon name={cameraOff ? 'cameraOff' : 'camera'}/></span><small>{cameraOff ? 'Start video' : 'Stop video'}</small></button>
          <button className={`meet-icon-control ${captionsEnabled ? 'is-selected' : ''}`} onClick={toggleCaptions} title={captionsEnabled ? 'Turn captions off' : 'Turn captions on'}><span><MeetIcon name="captions"/></span><small>Captions</small></button>
          <button className={`meet-icon-control ${screenSharing ? 'is-selected' : ''}`} onClick={toggleScreenShare} title={screenSharing ? 'Stop presenting' : 'Present now'}><span><MeetIcon name="present"/></span><small>{screenSharing ? 'Stop sharing' : 'Present now'}</small></button>
          <div className="meet-more-wrap"><button className={`meet-icon-control ${showMoreControls ? 'is-selected' : ''}`} onClick={() => setShowMoreControls(v => !v)} title="More call options" aria-expanded={showMoreControls}><span><MeetIcon name="more"/></span><small>More</small></button>
            {showMoreControls && <div className="meet-more-menu" role="menu">
              <button onClick={() => { setShowMoreControls(false); speak(currentQuestion); }}><MeetIcon name="repeat"/> Repeat question</button>
              <button onClick={() => { setShowMoreControls(false); skipQuestion(); }}><MeetIcon name="skip"/> Skip question</button>
              {canRetryTranscription && <button onClick={() => { setShowMoreControls(false); lastAnswerBlobRef.current && transcribeAnswerBlob(lastAnswerBlobRef.current, lastAnswerBlobRef.current.type); }}><MeetIcon name="retry"/> Retry transcription</button>}
              {draftAnswer.trim() && !isListening && !transcribingRef.current && <button onClick={() => { setShowMoreControls(false); submitAnswer(); }}><MeetIcon name="continue"/> Continue interview</button>}
            </div>}
          </div>
          <button className="meet-end-call" onClick={() => finishInterview()} disabled={isThinking} title="End call"><span><MeetIcon name="phone"/></span><small>End call</small></button>
        </div>
        <div className="meet-progress-text"><span>{transcript.length} answers submitted</span><span>{progress}% complete</span></div>
      </div>
      {candidateTranscript && <aside className="meet-transcript-pod" aria-live="polite"><div className="meet-transcript-pod-heading"><span className="transcript-live-dot"/> YOUR TRANSCRIPT <span>latest answer</span></div><p>{candidateTranscript}</p></aside>}
      {notice && <div className="meet-notice" role="status">{notice}</div>}
    </main>}

    {status === 'report' && <main className="report-layout"><div className="report-heading"><div><div className="eyebrow">SESSION COMPLETE</div><h1>Your interview <em>debrief.</em></h1><p>A practical review of your transcript and speaking patterns. Scores are estimates, not a verdict on your ability.</p></div><div className="report-actions"><button className="btn btn-outline" onClick={downloadTranscript}>↓ Transcript</button><button className="btn btn-primary" onClick={resetInterview}>New interview →</button></div></div>
      <div className="report-summary-grid"><div className="overall-card"><div className="eyebrow">{report?.evaluationMode === 'insufficient-data' || report?.evaluationMode === 'evaluation-unavailable' ? 'NOT SCORED' : report?.evaluationMode === 'gemini' ? 'GEMINI AI REVIEW SCORE' : 'TRANSCRIPT METRICS SCORE'}</div><div className="score-ring" style={{ '--score': `${report?.overall || 0}%` }}><div><strong>{report?.overall == null ? '—' : report.overall}</strong><span>{report?.overall == null ? 'N/A' : '/100'}</span></div></div><h3>{report?.evaluationMode === 'insufficient-data' || report?.evaluationMode === 'evaluation-unavailable' ? 'No score assigned' : (report?.overall || 0) >= 80 ? 'Solid practice session' : (report?.overall || 0) >= 65 ? 'Good foundation to build on' : 'Useful baseline — keep practising'}</h3><p>{report?.evaluationMode === 'insufficient-data' ? 'There were fewer than two usable answers or fewer than 25 words in the transcript. No score has been invented.' : report?.evaluationMode === 'evaluation-unavailable' ? 'The AI evaluator failed, so no overall score has been invented. Transcript statistics are shown separately.' : report?.evaluationMode === 'gemini' ? 'Content scores and answer feedback were generated by Gemini. Pace and filler-word metrics are estimates.' : 'This report uses transcript metrics because the Gemini review was unavailable.'} Scores are coaching estimates, not a verdict on employability.</p></div>
        <div className="score-breakdown"><div className="side-card-title"><h3>Score breakdown</h3><span className="muted">/ 100</span></div>{[{label:'Technical content (AI)',value:report?.content},{label:'Explanation structure (AI)',value:report?.structure},{label:'Clarity (AI)',value:report?.clarity},{label:'Speaking pace estimate',value:report?.pace},{label:'Answer relevance (AI)',value:report?.relevance},{label:'Communication (AI, transcript-based)',value:report?.communication},{label:'Questions answered (%)',value:report?.completeness}].map(item => <div className="score-row" key={item.label}><div><span>{item.label}</span><b>{item.value == null ? '—' : item.value}</b></div><div className="progress-track"><div style={{ width: `${item.value || 0}%` }}/></div></div>)}</div>
        <div className="report-stats"><div className="stat-box"><span>Total words</span><b>{report?.totalWords ?? 0}</b></div><div className="stat-box"><span>Answers submitted</span><b>{report?.answerCount ?? 0}<small> / {report?.questionCount ?? 0}</small></b></div><div className="stat-box"><span>Avg. words / answer</span><b>{report?.avgWords ?? 0}</b></div><div className="stat-box"><span>Filler-word matches</span><b>{report?.fillerCount ?? 0}</b></div><div className="stat-box"><span>Avg. spoken pace</span><b>{report?.avgWpm == null ? '—' : report.avgWpm}<small>{report?.avgWpm == null ? ' voice data unavailable' : ' words/min'}</small></b></div></div></div>
      <div className="report-content-grid"><section className="side-card feedback-card"><div className="side-card-title"><h3>What to work on next</h3><span className="recommend-tag">ACTION PLAN</span></div>{(report?.feedback || []).map((f, i) => <div className="feedback-item" key={f}><span className={i === report.feedback.length - 1 ? 'feedback-icon info-icon' : 'feedback-icon'}>{i === report.feedback.length - 1 ? 'i' : '↗'}</span><p>{f}</p></div>)}<div className="practice-plan"><h4>Next practice session</h4><ol><li>Pick the two answers that felt hardest and practise them again.</li><li>Use a clear opening sentence before explaining details.</li><li>For project questions, name your contribution and one measurable result.</li></ol></div></section>
        <section className="side-card replay-card"><div className="side-card-title transcript-heading"><h3>Answer review</h3><button className="text-button" onClick={downloadTranscript}>Export transcript ↓</button></div><div className="answer-review-list">{transcript.map((entry, i) => <article key={entry.timestamp + i}><span>Q{i + 1}</span><div><b>{entry.question}</b><p>{entry.answer}</p></div></article>)}</div></section></div>
      {report?.answerFeedback?.length > 0 && <section className="side-card answer-ai-review"><div className="side-card-title"><h3>AI feedback by answer</h3><span className="muted">Specific review</span></div>{report.answerFeedback.map((item, i) => <article key={`${item.question}-${i}`} className="answer-feedback-item"><b>{item.question}</b><p><strong>What worked:</strong> {item.strength}</p><p><strong>Improve:</strong> {item.improvement}</p></article>)}</section>}
      <div className="disclaimer">AI question generation and evaluation use Gemini. Video is displayed live in your browser but is not recorded or stored. Interview answers are transcribed for this session and can be exported as text. Eye contact, facial expression, vocal emotion, and body language are not automatically scored.</div>
    </main>}

    {status !== 'interview' && <footer className="footer"><span>InterviewForge <span className="muted">· Gemini-powered practice</span></span><span>Built for deliberate practice, not perfection.</span></footer>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
