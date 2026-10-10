import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const PORT = Number(process.env.API_PORT || 3001);
const MODEL = 'gemini-3.1-flash-lite';
const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
const TTS_MODEL = 'gemini-3.8-flash-tts';
const TTS_VOICE = 'Kore';

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 14_000_000) {
        reject(new Error('Request is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolveBody(JSON.parse(body || '{}')); }
      catch { reject(new Error('Invalid JSON request.')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5173', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { ok: true, configured: Boolean(process.env.GEMINI_API_KEY), model: MODEL });
  }
  if (req.method === 'POST' && url.pathname === '/api/gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return send(res, 503, { error: 'Gemini API key is missing. Add GEMINI_API_KEY to .env and restart the app.' });
    let body;
    try { body = await readBody(req); }
    catch (error) { return send(res, 400, { error: error.message }); }
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const systemInstruction = messages.filter(m => m.role === 'system').map(m => String(m.content || '')).join('\n\n');
    const prompt = messages.filter(m => m.role !== 'system').map(m => String(m.content || '')).join('\n\n');
    if (!prompt.trim()) return send(res, 400, { error: 'Prompt is empty.' });
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.35, maxOutputTokens: 8192 },
        }),
        signal: AbortSignal.timeout(90000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.error?.message || `Gemini API returned HTTP ${response.status}.`;
        return send(res, response.status, { error: message });
      }
      const text = (data.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('').trim();
      if (!text) return send(res, 502, { error: 'Gemini returned no text. Try again or check API quota.' });
      return send(res, 200, { text, model: MODEL, usageMetadata: data.usageMetadata || null });
    } catch (error) {
      const message = error?.name === 'TimeoutError' ? 'Gemini request timed out. Please retry.' : (error?.message || 'Could not reach Gemini API. Check your internet connection.');
      return send(res, 502, { error: message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/transcribe') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return send(res, 503, { error: 'Gemini API key is missing. Add GEMINI_API_KEY to .env and restart the app.' });
    let body;
    try { body = await readBody(req); }
    catch (error) { return send(res, 400, { error: error.message }); }
    if (!body.audio || !body.mimeType) return send(res, 400, { error: 'Microphone audio was empty.' });

    let uploadedFileName = '';
    try {
      const audioBytes = Buffer.from(body.audio, 'base64');
      if (!audioBytes.length) return send(res, 400, { error: 'Microphone audio was empty after decoding.' });
      const mimeType = String(body.mimeType).split(';')[0] || 'audio/webm';

      // Gemini 3.5 Transcribe is a dedicated speech-to-text model exposed through the
      // Interactions API. Upload the captured audio, then submit it in verbatim mode.
      const uploadStart = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(audioBytes.length),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file: { display_name: `interviewforge-answer-${Date.now()}` } }),
        signal: AbortSignal.timeout(30000)
      });
      if (!uploadStart.ok) {
        const err = await uploadStart.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Audio upload initialization failed (HTTP ${uploadStart.status}).`);
      }
      const uploadUrl = uploadStart.headers.get('x-goog-upload-url');
      if (!uploadUrl) throw new Error('Google did not return an audio upload URL.');

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Length': String(audioBytes.length),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize'
        },
        body: audioBytes,
        signal: AbortSignal.timeout(60000)
      });
      const uploaded = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(uploaded?.error?.message || `Audio upload failed (HTTP ${uploadResponse.status}).`);
      const file = uploaded.file || uploaded;
      const fileUri = file.uri;
      uploadedFileName = file.name || '';
      if (!fileUri) throw new Error('Google uploaded the audio but did not return a file URI.');

      const interactionResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          model: TRANSCRIBE_MODEL,
          input: [
            { type: 'text', text: 'Transcribe this interview answer in VERBATIM mode. Return every audible word from the beginning to the end, preserving filler words, repetitions, false starts, technical terms, and the original language. Add punctuation only where appropriate. Do not summarize, paraphrase, clean up grammar, answer the question, or omit words. Do not translate. Return only the transcript.' },
            { type: 'audio', uri: fileUri, mime_type: mimeType }
          ],
          generation_config: {
            transcription_config: {
              language_codes: [],
              mode: { type: 'verbatim' },
              custom_vocabulary: ['Java', 'JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Prisma', 'SQL', 'API', 'REST API', 'Redis', 'TypeScript', 'Kubernetes', 'Docker', 'Git', 'GitHub', 'OOP', 'polymorphism', 'encapsulation', 'inheritance', 'abstraction', 'HashMap', 'HashSet', 'DSA', 'frontend', 'backend', 'full stack', 'debugging', 'deployment']
            }
          }
        }),
        signal: AbortSignal.timeout(90000)
      });
      const interaction = await interactionResponse.json().catch(() => ({}));
      if (!interactionResponse.ok) throw new Error(interaction?.error?.message || `Gemini transcription failed (HTTP ${interactionResponse.status}).`);
      const text = String(interaction.output_text || (interaction.steps || []).flatMap(step => step.content || []).filter(part => part.type === 'text').map(part => part.text || '').join('') || (interaction.outputs || []).filter(item => item.type === 'text').map(item => item.text || '').join('') || '').trim();
      if (!text) throw new Error('Gemini Transcribe returned no transcript. Check that the audio contains audible speech and try again.');
      return send(res, 200, { text, model: TRANSCRIBE_MODEL, transcriptionMode: 'verbatim' });
    } catch (error) {
      // Fall back to the standard Gemini audio-understanding endpoint if the dedicated
      // transcription model or file-upload/Interactions path is unavailable for this key.
      // This keeps a captured answer from getting stuck just because that API path failed.
      try {
        const fallbackResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [
              { text: 'Transcribe the candidate audio verbatim. Return only the spoken words, preserving technical terms, repetitions, false starts, and original language. Do not summarize, translate, or answer the interview question.' },
              { inline_data: { mime_type: String(body.mimeType).split(';')[0] || 'audio/webm', data: body.audio } }
            ] }],
            generationConfig: { temperature: 0, maxOutputTokens: 4096 }
          }),
          signal: AbortSignal.timeout(90000)
        });
        const fallbackData = await fallbackResponse.json().catch(() => ({}));
        if (!fallbackResponse.ok) throw new Error(fallbackData?.error?.message || `Fallback transcription failed (HTTP ${fallbackResponse.status}).`);
        const fallbackText = (fallbackData.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('').trim();
        if (!fallbackText) throw new Error('Gemini returned no transcript from the recorded audio.');
        return send(res, 200, { text: fallbackText, model: `${MODEL} audio fallback`, transcriptionMode: 'verbatim-fallback' });
      } catch (fallbackError) {
        const message = `${error?.name === 'TimeoutError' ? 'Dedicated transcription timed out' : (error?.message || 'Dedicated transcription failed')}. Fallback also failed: ${fallbackError?.message || 'unknown error'}`;
        return send(res, 502, { error: message });
      }
    } finally {
      // Audio uploads are temporary; delete the captured answer as soon as transcription finishes.
      if (uploadedFileName) {
        fetch(`https://generativelanguage.googleapis.com/v1beta/${uploadedFileName}`, {
          method: 'DELETE', headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(10000)
        }).catch(() => {});
      }
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/tts') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return send(res, 503, { error: 'Gemini API key is missing.' });
    let body;
    try { body = await readBody(req); }
    catch (error) { return send(res, 400, { error: error.message }); }
    const text = String(body.text || '').trim().slice(0, 1800);
    if (!text) return send(res, 400, { error: 'Text to speak is empty.' });
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          model: TTS_MODEL,
          input: [{
            type: 'user_input',
            content: [{
              type: 'text',
              text,
              annotations: [{ type: 'speech_metadata', style: 'Natural conversational cadence, warm and professional Indian-English hiring manager, calm confident tone, moderate pace with subtle pauses. Sound like a real interviewer, not a narrator.' }]
            }]
          }],
          response_format: { type: 'audio' },
          generation_config: { speech_config: [{ voice: TTS_VOICE }] }
        }),
        signal: AbortSignal.timeout(90000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return send(res, response.status, { error: data?.error?.message || `Gemini voice returned HTTP ${response.status}.` });
      const audioPart = (data.steps || []).flatMap(step => step.content || []).filter(part => part.type === 'audio' && part.data).at(-1);
      if (!audioPart?.data) return send(res, 502, { error: 'Gemini returned no speech audio.' });
      return send(res, 200, { audio: audioPart.data, mimeType: audioPart.mime_type || 'audio/wav', model: TTS_MODEL, voice: TTS_VOICE });
    } catch (error) {
      return send(res, 502, { error: error?.name === 'TimeoutError' ? 'Natural voice generation timed out.' : (error?.message || 'Could not generate natural voice.') });
    }
  }

  return send(res, 404, { error: 'Not found.' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`InterviewForge Gemini backend listening on http://127.0.0.1:${PORT}`);
  console.log(`Model: ${MODEL} · API key ${process.env.GEMINI_API_KEY ? 'configured' : 'missing (.env)'}`);
});
