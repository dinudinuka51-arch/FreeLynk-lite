
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";

interface AIEditorProps {
  currentUser: User;
  type: 'profile' | 'cover';
  onClose: () => void;
  onSave: (photo: string) => void;
}

type EditorMode = 'artist' | 'movie' | 'vision' | 'voice' | 'thinker' | 'talker' | 'scribe' | 'fast';

const AIEditor: React.FC<AIEditorProps> = ({ currentUser, type, onClose, onSave }) => {
  const [mode, setMode] = useState<EditorMode>('thinker');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [audioResult, setAudioResult] = useState<string | null>(null); // For TTS
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);

  // Voice Live State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string[]>([]);
  const voiceSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const initialImage = type === 'profile' ? currentUser.profilePhoto : (currentUser.coverPhoto || 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800&fit=crop');

  // Helper: Audio Encoding/Decoding
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const urlToBase64 = async (url: string): Promise<{ data: string, mimeType: string }> => {
    if (url.startsWith('data:')) {
      const [header, data] = url.split(',');
      const mimeType = header.split(';')[0].split(':')[1];
      return { data, mimeType };
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve({ data: base64String, mimeType: blob.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Error fetching image:", err);
      throw new Error("Failed to process image.");
    }
  };

  // 1. Artist: Image Generation (Pro Image)
  const handleImageGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: { aspectRatio: aspectRatio as any, imageSize: "1K" }
        }
      });
      let generatedBase64 = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            generatedBase64 = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      if (generatedBase64) setPreviewImage(generatedBase64);
      else setError("Image generation failed.");
    } catch (err: any) {
      setError(err.message || "Artist tool error.");
    } finally { setIsGenerating(false); }
  };

  // 2. Movie: Video Generation (Veo)
  const handleVideoGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setStatusMessage('Veo is waking up...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio === '16:9' ? '16:9' : '9:16' }
      });
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        setStatusMessage('Generating frames...');
      }
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const resp = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await resp.blob();
        setGeneratedVideoUrl(URL.createObjectURL(blob));
      }
    } catch (err: any) { setError(err.message); }
    finally { setIsGenerating(false); setStatusMessage(''); }
  };

  // 3. Vision: Image Analysis (Pro)
  const handleVisionAnalysis = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const { data, mimeType } = await urlToBase64(initialImage);
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
        config: { tools: [{ googleSearch: {} }] }
      });
      setVisionAnalysis(response.text);
    } catch (err: any) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  // 4. Thinker: Complex Chat (Pro + Thinking Mode)
  const handleThinkerChat = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
          tools: [{ googleSearch: {} }]
        }
      });
      setVisionAnalysis(response.text); // Using visionAnalysis state for display
    } catch (err: any) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  // 5. Talker: TTS (Flash TTS)
  const handleTTS = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
      });
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        const ctx = new AudioContext({ sampleRate: 24000 });
        const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        setAudioResult("Playing audio...");
      }
    } catch (err: any) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  // 6. Scribe: Transcription (Flash)
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsGenerating(true);
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType: 'audio/webm' } }, { text: "Transcribe this audio accurately." }] }
          });
          setTranscriptionResult(response.text || "No speech detected.");
          setIsGenerating(false);
        };
        reader.readAsDataURL(audioBlob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) { setError("Mic access denied."); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // 7. Fast: Low Latency AI (Flash Lite)
  const handleFastAI = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite-latest',
        contents: prompt
      });
      setVisionAnalysis(response.text);
    } catch (err: any) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  // 8. Voice: Stabilized Native Audio Assistant
  const startVoiceAssistant = async () => {
    if (isVoiceActive) {
      if (voiceSessionRef.current) voiceSessionRef.current.close();
      setIsVoiceActive(false);
      return;
    }
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      let nextStartTime = 0;
      const sources = new Set<AudioBufferSourceNode>();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsVoiceActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (!isVoiceActive) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              nextStartTime = Math.max(nextStartTime, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTime);
              nextStartTime += buffer.duration;
              sources.add(source);
              source.onended = () => sources.delete(source);
            }
            if (msg.serverContent?.interrupted) {
              sources.forEach(s => { try { s.stop(); } catch(e){} });
              sources.clear();
              nextStartTime = 0;
            }
            if (msg.serverContent?.outputTranscription) {
              setVoiceTranscript(prev => [...prev.slice(-4), `AI: ${msg.serverContent?.outputTranscription?.text}`]);
            }
          },
          onclose: () => setIsVoiceActive(false),
          onerror: (e) => { console.error(e); setIsVoiceActive(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are the freeLynk Voice Assistant. You speak in a helpful, conversational tone. Stay active until the user closes the session.",
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          outputAudioTranscription: {}
        }
      });
      voiceSessionRef.current = await sessionPromise;
    } catch (err) { setError("Voice failed."); setIsVoiceActive(false); }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-3xl flex flex-col animate-slide-up overflow-hidden text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 ios-blur">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 pink-gradient rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-black">freeLynk AI Studio</h2>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">8-Tool Intelligence Suite</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
      </div>

      {/* Modes Scrollable Grid/Bar */}
      <div className="flex p-3 gap-2 bg-zinc-900/40 overflow-x-auto hide-scrollbar border-b border-white/5">
        {[
          { id: 'thinker', label: 'Thinker', desc: 'Pro Assistant' },
          { id: 'artist', label: 'Artist', desc: 'Pro Images' },
          { id: 'movie', label: 'Movie', desc: 'Veo Video' },
          { id: 'voice', label: 'Voice', desc: 'Live Conversation' },
          { id: 'vision', label: 'Vision', desc: 'Image Insight' },
          { id: 'talker', label: 'Talker', desc: 'TTS Audio' },
          { id: 'scribe', label: 'Scribe', desc: 'Transcription' },
          { id: 'fast', label: 'Fast', desc: 'Lite Speed' }
        ].map(m => (
          <button 
            key={m.id}
            onClick={() => setMode(m.id as EditorMode)}
            className={`flex-shrink-0 px-5 py-3 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${mode === m.id ? 'pink-gradient text-white shadow-lg scale-105' : 'bg-zinc-800/50 text-zinc-500'}`}
          >
            <span className="font-black text-xs">{m.label}</span>
            <span className="text-[7px] uppercase opacity-60 font-bold">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Main Studio Area */}
      <div className="flex-grow flex flex-col items-center justify-center p-6 overflow-y-auto hide-scrollbar">
        <div className="w-full max-w-2xl space-y-6">
          
          {/* Display Output Area */}
          <div className="relative group mx-auto">
            <div className={`overflow-hidden border-2 transition-all duration-700 ${isGenerating ? 'border-pink-500 border-t-transparent animate-spin-slow p-2 rounded-full' : 'border-white/10 rounded-[2.5rem]'} ${mode === 'movie' ? 'aspect-video w-full' : (mode === 'voice' || mode === 'scribe') ? 'w-48 h-48 rounded-full' : 'w-64 h-64 rounded-full'} bg-zinc-900 shadow-2xl flex items-center justify-center`}>
               {isGenerating ? (
                 <div className="flex flex-col items-center gap-3 animate-none">
                    <div className="w-10 h-10 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin"></div>
                    <p className="text-[9px] text-zinc-500 font-black uppercase">{statusMessage || 'Processing Intelligence...'}</p>
                 </div>
               ) : mode === 'movie' && generatedVideoUrl ? (
                 <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-cover" />
               ) : (mode === 'artist' || mode === 'photo') && previewImage ? (
                 <img src={previewImage} className="w-full h-full object-cover" alt="Gen" />
               ) : (mode === 'voice' || mode === 'scribe') ? (
                 <div className="flex flex-col items-center gap-3">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isVoiceActive || isRecording ? 'pink-gradient animate-pulse shadow-2xl' : 'bg-zinc-800'}`}>
                       <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"/></svg>
                    </div>
                 </div>
               ) : (
                 <img src={initialImage} className="w-full h-full object-cover grayscale opacity-30" alt="Source" />
               )}
            </div>

            {/* Complex Result Display */}
            {(visionAnalysis || transcriptionResult || voiceTranscript.length > 0) && (
              <div className="mt-6 p-5 rounded-3xl bg-zinc-900/60 border border-white/5 backdrop-blur-3xl animate-slide-up max-h-60 overflow-y-auto hide-scrollbar">
                 <h4 className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-2">AI Response</h4>
                 <p className="text-sm text-zinc-100 leading-relaxed italic">{visionAnalysis || transcriptionResult || voiceTranscript.join(' ')}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {(mode !== 'voice' && mode !== 'scribe') && (
              <div className="relative">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Use freeLynk ${mode.toUpperCase()} mode...`}
                  className="w-full ios-input p-6 min-h-[120px] text-base rounded-[2rem] shadow-2xl"
                />
              </div>
            )}

            {/* Ratio Selector for Media Gen */}
            {(mode === 'artist' || mode === 'movie') && (
              <div className="flex flex-wrap gap-2 justify-center">
                {['1:1', '16:9', '9:16', '3:4', '4:3', '21:9'].map(r => (
                  <button 
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border ${aspectRatio === r ? 'bg-pink-500 border-pink-500' : 'border-zinc-800 text-zinc-500'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-center font-bold">{error}</div>}

            <div className="flex gap-3">
              {mode === 'voice' ? (
                <button onClick={startVoiceAssistant} className={`flex-grow p-6 rounded-[2rem] font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${isVoiceActive ? 'bg-zinc-800 text-pink-500' : 'pink-gradient text-white shadow-xl shadow-pink-500/20'}`}>
                  {isVoiceActive ? 'Stop Assistant' : 'Talk to AI'}
                </button>
              ) : mode === 'scribe' ? (
                <button onClick={isRecording ? stopRecording : startRecording} className={`flex-grow p-6 rounded-[2rem] font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${isRecording ? 'bg-red-500/20 text-red-500' : 'pink-gradient text-white shadow-xl shadow-pink-500/20'}`}>
                  {isRecording ? 'Stop Recording' : 'Start Scribe'}
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if(mode === 'artist') handleImageGenerate();
                    else if(mode === 'movie') handleVideoGenerate();
                    else if(mode === 'vision') handleVisionAnalysis();
                    else if(mode === 'thinker') handleThinkerChat();
                    else if(mode === 'talker') handleTTS();
                    else if(mode === 'fast') handleFastAI();
                  }}
                  disabled={isGenerating || !prompt.trim()}
                  className={`flex-grow p-6 rounded-[2rem] font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${isGenerating || !prompt.trim() ? 'bg-zinc-800 text-zinc-600' : 'pink-gradient text-white shadow-xl shadow-pink-500/20'}`}
                >
                  {isGenerating ? 'AI Engine Working...' : `Execute ${mode.toUpperCase()}`}
                </button>
              )}
              {previewImage && (mode === 'artist') && (
                <button onClick={() => onSave(previewImage)} className="bg-white text-black px-8 rounded-[2rem] font-black active:scale-95 transition-all">Save</button>
              )}
            </div>
            
            <p className="text-[8px] text-zinc-600 text-center font-black uppercase tracking-[0.4em] pt-2">
              Google Gemini Enterprise Cloud Power
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEditor;
