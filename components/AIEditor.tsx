
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";

interface AIEditorProps {
  currentUser: User;
  type: 'profile' | 'cover';
  initialMode?: EditorMode;
  onClose: () => void;
  onSave: (photo: string) => void;
}

type EditorMode = 'artist' | 'movie' | 'vision' | 'voice' | 'thinker' | 'talker' | 'scribe' | 'fast';

const AIEditor: React.FC<AIEditorProps> = ({ currentUser, type, initialMode = 'thinker', onClose, onSave }) => {
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  
  const voiceSessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext, output: AudioContext } | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string[]>([]);

  const initialImage = type === 'profile' ? currentUser.profilePhoto : (currentUser.coverPhoto || 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800&fit=crop');

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

  const startVoiceAssistant = async () => {
    if (isVoiceActive) {
      if (voiceSessionRef.current) voiceSessionRef.current.close();
      setIsVoiceActive(false);
      setStatusMessage('Connection Offline');
      return;
    }

    setError(null);
    setStatusMessage('Syncing Neural Connection...');

    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await inputCtx.resume();
      await outputCtx.resume();
      audioContextRef.current = { input: inputCtx, output: outputCtx };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let nextStartTime = 0;
      const sources = new Set<AudioBufferSourceNode>();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsVoiceActive(true);
            setStatusMessage('freeLynk Link Established');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (inputCtx.state === 'suspended') return;
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob })).catch(() => {});
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
              setVoiceTranscript(prev => [...prev.slice(-3), `Gemini: ${msg.serverContent?.outputTranscription?.text}`]);
            }
            if (msg.serverContent?.inputTranscription) {
              setVoiceTranscript(prev => [...prev.slice(-3), `You: ${msg.serverContent?.inputTranscription?.text}`]);
            }
          },
          onclose: () => setIsVoiceActive(false),
          onerror: (e: any) => {
            console.error(e);
            if (e.message?.includes("Requested entity was not found")) {
              setError("API Error: Try re-selecting your key in AI Studio.");
            } else {
              setError("Connection interrupted. Please retry.");
            }
            setIsVoiceActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are the freeLynk Gemini Voice Assistant. Friendly, cool, social, and helpful. Keep responses short and punchy.",
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        }
      });
      voiceSessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      setError("Audio access or neural link failed.");
      setIsVoiceActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (voiceSessionRef.current) voiceSessionRef.current.close();
      if (audioContextRef.current) {
        audioContextRef.current.input.close();
        audioContextRef.current.output.close();
      }
    };
  }, []);

  const handleImageGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: "1K" } }
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
      else setError("Engine failed to render image.");
    } catch (err: any) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/98 backdrop-blur-3xl flex flex-col animate-slide-up overflow-hidden text-white">
      <div className="flex items-center justify-between p-5 border-b border-white/5 ios-blur shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 blue-gradient rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tighter">freeLynk AI Studio</h2>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">freeLynk Intelligence</p>
          </div>
        </div>
        <button onClick={() => { if(voiceSessionRef.current) voiceSessionRef.current.close(); onClose(); }} className="p-2 text-zinc-500 hover:text-white transition-colors active:scale-75"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
      </div>

      <div className="flex p-3 gap-2.5 bg-zinc-900/30 overflow-x-auto hide-scrollbar border-b border-white/5 shadow-inner">
        {[
          { id: 'voice', label: 'Voice', desc: 'Real-time' },
          { id: 'thinker', label: 'Think', desc: 'Reasoning' },
          { id: 'artist', label: 'Art', desc: 'Image Gen' },
          { id: 'fast', label: 'Lite', desc: 'Instant' }
        ].map(m => (
          <button 
            key={m.id}
            onClick={() => { setMode(m.id as EditorMode); setError(null); }}
            className={`flex-shrink-0 px-5 py-3 rounded-2xl flex flex-col items-center gap-0.5 transition-all ${mode === m.id ? 'blue-gradient text-white shadow-xl scale-105' : 'bg-zinc-800/40 text-zinc-500 hover:bg-zinc-800'}`}
          >
            <span className="font-black text-xs uppercase tracking-widest">{m.label}</span>
            <span className="text-[7px] uppercase opacity-50 font-bold tracking-tighter">{m.desc}</span>
          </button>
        ))}
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-6 overflow-y-auto hide-scrollbar">
        <div className="w-full max-w-xl space-y-8">
          <div className="relative flex flex-col items-center">
            <div className={`overflow-hidden border-2 transition-all duration-500 ${isGenerating || isVoiceActive ? 'border-[#007AFF] shadow-[0_0_40px_rgba(0,122,255,0.3)]' : 'border-white/10'} w-56 h-56 rounded-[3.5rem] bg-zinc-900 flex items-center justify-center`}>
               {isGenerating ? (
                 <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 border-4 border-[#007AFF]/20 border-t-[#007AFF] rounded-full animate-spin"></div>
                    <p className="text-[10px] text-[#007AFF] font-black uppercase tracking-widest">{statusMessage || 'Connecting...'}</p>
                 </div>
               ) : (mode === 'voice') ? (
                 <div className="flex flex-col items-center gap-4">
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${isVoiceActive ? 'blue-gradient animate-pulse scale-110 shadow-[0_0_60px_rgba(0,122,255,0.5)]' : 'bg-zinc-800 shadow-inner'}`}>
                       <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"/></svg>
                    </div>
                    {statusMessage && <p className="text-[10px] text-[#007AFF] font-black uppercase tracking-[0.3em] animate-pulse">{statusMessage}</p>}
                 </div>
               ) : previewImage ? (
                 <img src={previewImage} className="w-full h-full object-cover" alt="Gen" />
               ) : (
                 <img src={initialImage} className="w-full h-full object-cover grayscale opacity-20" alt="Source" />
               )}
            </div>

            {(voiceTranscript.length > 0) && (
              <div className="mt-8 w-full p-6 rounded-[2.5rem] bg-white/5 border border-white/5 backdrop-blur-3xl animate-slide-up max-h-56 overflow-y-auto hide-scrollbar shadow-2xl">
                 <h4 className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest mb-4 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse"></div>
                   freeLynk Logic
                 </h4>
                 <div className="space-y-3">
                   {voiceTranscript.map((t, i) => (
                     <p key={i} className={`text-sm leading-relaxed ${t.startsWith('You:') ? 'text-zinc-500' : 'text-white font-medium'}`}>{t}</p>
                   ))}
                 </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {mode !== 'voice' && (
              <div className="relative">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Command ${mode.toUpperCase()} engine...`}
                  className="w-full ios-input p-6 min-h-[140px] text-[16px] rounded-[2.5rem] shadow-2xl border-white/5"
                />
              </div>
            )}

            {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] text-center font-black uppercase tracking-widest animate-shake shadow-lg">{error}</div>}

            <div className="flex gap-3">
              {mode === 'voice' ? (
                <button onClick={startVoiceAssistant} className={`flex-grow h-16 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${isVoiceActive ? 'bg-zinc-800 text-[#007AFF] border border-[#007AFF]/30' : 'blue-gradient text-white shadow-xl shadow-blue-500/20'}`}>
                  {isVoiceActive ? 'Disconnect Link' : 'Establish freeLynk Connection'}
                </button>
              ) : (
                <button 
                  onClick={() => mode === 'artist' ? handleImageGenerate() : null}
                  disabled={isGenerating || !prompt.trim()}
                  className={`flex-grow h-16 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${isGenerating || !prompt.trim() ? 'bg-zinc-900 text-zinc-700' : 'blue-gradient text-white shadow-xl shadow-blue-500/20'}`}
                >
                  {isGenerating ? 'AI Syncing...' : `Execute ${mode}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEditor;
