
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Message } from '../types';
import { supabase } from '../lib/supabase';

interface InboxProps {
  currentUser: User;
  onNavigateToProfile: (uid: string) => void;
  initialChatUserId?: string | null;
  onClearInitialChat?: () => void;
}

const Inbox: React.FC<InboxProps> = ({ currentUser, onNavigateToProfile, initialChatUserId, onClearInitialChat }) => {
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatPreviews, setChatPreviews] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dbId = (currentUser as any).dbId;

  const fetchMessages = useCallback(async (otherId: string) => {
    try {
      const { data, error } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${dbId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${dbId})`).order('created_at', { ascending: true });
      if (data && !error) setMessages(data as any);
    } catch (e) {}
  }, [dbId]);

  const fetchPreviews = useCallback(async () => {
    try {
      const { data } = await supabase.from('messages').select(`*, sender:profiles!sender_id(id, name, profile_photo, uid), receiver:profiles!receiver_id(id, name, profile_photo, uid)`).or(`sender_id.eq.${dbId},receiver_id.eq.${dbId}`).order('created_at', { ascending: false });
      if (data) {
        const uniqueChats: Record<string, any> = {};
        data.forEach(m => {
          const other = m.sender_id === dbId ? m.receiver : m.sender;
          if (other && !uniqueChats[other.id]) {
            const isDeleted = m.text === '__DELETED_MESSAGE__';
            const isFallbackImg = m.text?.startsWith('__MEDIA_IMAGE__');
            let lastMsg = m.text;
            if (isDeleted) lastMsg = 'This message was deleted';
            else if (isFallbackImg) lastMsg = '[Shared Photo]';
            else if (!m.text && m.media_url) lastMsg = '[Shared Photo]';
            uniqueChats[other.id] = { user: other, lastMessage: lastMsg, timestamp: m.created_at };
          }
        });
        setChatPreviews(Object.values(uniqueChats));
      }
    } catch (e) {}
  }, [dbId]);

  useEffect(() => {
    if (initialChatUserId) {
      const fetchInitialUser = async () => {
        try {
          const { data } = await supabase.from('profiles').select('*').eq('id', initialChatUserId).single();
          if (data) { setSelectedUser(data); fetchMessages(data.id); if (onClearInitialChat) onClearInitialChat(); setTimeout(() => inputRef.current?.focus(), 500); }
        } catch(e) {}
      };
      fetchInitialUser();
    }
  }, [initialChatUserId, fetchMessages, onClearInitialChat]);

  useEffect(() => {
    fetchPreviews();
    const channel = supabase.channel(`chat_realtime_${dbId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newMessage = payload.new as Message;
        if (selectedUser && (newMessage.sender_id === selectedUser.id || newMessage.receiver_id === selectedUser.id)) {
          setMessages(prev => { if (prev.find(m => m.id === newMessage.id)) return prev; return [...prev, newMessage]; });
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedMsg = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      } else if (payload.eventType === 'DELETE') {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      }
      fetchPreviews();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUser, dbId, fetchPreviews]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const sendMessage = async (payload: { text?: string; media_url?: string; media_type?: 'text' | 'image' }) => {
    if (isSending || (!payload.text && !payload.media_url)) return;
    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = { id: tempId, sender_id: dbId, receiver_id: selectedUser.id, created_at: new Date().toISOString(), isOptimistic: true, ...payload };
    setMessages(prev => [...prev, optimisticMsg]); setText('');
    try {
      const { error } = await supabase.from('messages').insert([{ sender_id: dbId, receiver_id: selectedUser.id, ...payload }]);
      if (error && (error.message.includes('media_url') || error.message.includes('column'))) {
        const fallbackText = payload.media_url ? `__MEDIA_IMAGE__${payload.media_url}` : payload.text;
        const { error: fError } = await supabase.from('messages').insert([{ sender_id: dbId, receiver_id: selectedUser.id, text: fallbackText }]);
        if (fError) throw fError;
      } else if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } catch (e: any) { setMessages(prev => prev.filter(m => m.id !== tempId)); } finally { setIsSending(false); }
  };

  const deleteMessageForEveryone = async (msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: '__DELETED_MESSAGE__', media_url: undefined } : m));
    setActiveMessageId(null);
    try {
      const { error } = await supabase.from('messages').update({ text: '__DELETED_MESSAGE__', media_url: null }).eq('id', msgId).eq('sender_id', dbId);
      if (error) throw error;
    } catch (e) { fetchMessages(selectedUser.id); }
  };

  if (selectedUser) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] animate-slide-up bg-black">
        <div className="flex items-center gap-4 p-4 border-b border-white/5 ios-blur sticky top-0 z-[70] shadow-xl">
          <button onClick={() => setSelectedUser(null)} className="p-2 -ml-2 text-[#007AFF] active:scale-75 transition-all"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg></button>
          <div className="flex items-center gap-3 flex-grow cursor-pointer" onClick={() => onNavigateToProfile(selectedUser.uid)}>
            <img src={selectedUser.profile_photo} className="w-10 h-10 rounded-2xl object-cover border border-white/10" />
            <div className="flex flex-col">
              <h4 className="font-bold text-base text-white leading-tight">{selectedUser.name}</h4>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full shadow-[0_0_8px_#007AFF] animate-pulse"></div><p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Active freeLynk</p></div>
            </div>
          </div>
        </div>
        <div ref={scrollRef} className="flex-grow overflow-y-auto p-5 space-y-4 pb-48 hide-scrollbar" onClick={() => setActiveMessageId(null)}>
          {messages.map((msg) => {
            const isMe = msg.sender_id === dbId;
            const isDeleted = msg.text === '__DELETED_MESSAGE__';
            const imageUrl = isDeleted ? null : (msg.text?.startsWith('__MEDIA_IMAGE__') ? msg.text.replace('__MEDIA_IMAGE__', '') : msg.media_url);
            const contentText = isDeleted ? 'This message was deleted' : (msg.text?.startsWith('__MEDIA_IMAGE__') ? null : msg.text);
            const isMenuOpen = activeMessageId === msg.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up relative`}>
                <div onClick={(e) => { if (isMe && !isDeleted) { e.stopPropagation(); setActiveMessageId(isMenuOpen ? null : msg.id); } }} className={`relative max-w-[80%] overflow-hidden rounded-[1.8rem] shadow-2xl transition-all cursor-pointer select-none active:scale-[0.98] ${isDeleted ? 'bg-zinc-900/50 border border-white/5 text-zinc-500 rounded-2xl' : (isMe ? 'blue-gradient text-white rounded-br-[0.5rem]' : 'bg-[#1C1C1E] text-zinc-100 rounded-bl-[0.5rem] border border-white/5')} ${msg.isOptimistic ? 'opacity-60 scale-95' : 'opacity-100'} ${isMenuOpen ? 'ring-4 ring-white/10' : ''}`}>
                  {imageUrl && <img src={imageUrl} className="w-full h-auto min-w-[200px] max-h-[350px] object-cover block" />}
                  {contentText && <div className={`px-5 py-3.5 ${isDeleted ? 'opacity-50 italic' : ''}`}><p className="text-[15px] leading-snug font-medium">{contentText}</p></div>}
                  {!isDeleted && <div className={`px-4 pb-1.5 flex ${isMe ? 'justify-end' : 'justify-start'}`}><span className="text-[8px] opacity-40 font-black uppercase tracking-widest">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Syncing'}</span></div>}
                </div>
                {isMenuOpen && isMe && !isDeleted && (
                  <div className="absolute top-0 right-0 -translate-y-full mb-2 z-[90] animate-slide-up">
                    <button onClick={() => deleteMessageForEveryone(msg.id)} className="bg-[#1C1C1E] text-[#FF3B30] px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl border border-white/5 flex items-center gap-2 ios-blur whitespace-nowrap active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>Delete for Everyone</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="p-4 bg-black/95 backdrop-blur-3xl border-t border-white/5 fixed bottom-[85px] left-0 right-0 max-w-2xl mx-auto z-[80]">
          <div className="flex gap-2.5 items-center">
            <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-2xl bg-[#1C1C1E] flex items-center justify-center text-[#007AFF] active:scale-90 transition-all border border-white/5 shadow-lg group"><svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg></button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => sendMessage({ media_url: r.result as string, media_type: 'image', text: '' }); r.readAsDataURL(f); } }} />
            <form onSubmit={(e) => { e.preventDefault(); if(text.trim()) sendMessage({ text: text.trim(), media_type: 'text' }); }} className="flex-grow flex gap-2">
              <input ref={inputRef} type="text" placeholder="Digital freeLynk..." className="flex-grow ios-input p-3.5 px-6 text-[15px] h-12 shadow-inner" value={text} onChange={(e) => setText(e.target.value)} />
              <button type="submit" className="blue-gradient w-12 h-12 rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all shadow-xl disabled:opacity-30" disabled={!text.trim() || isSending}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7"/></svg></button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-5 pt-20 animate-slide-up max-w-xl mx-auto pb-40">
      <div className="flex items-baseline justify-between"><div><h2 className="text-4xl font-black text-white tracking-tighter">Direct</h2><p className="text-[11px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">Encrypted freeLynks</p></div></div>
      <div className="space-y-4">
        {chatPreviews.map(chat => (
          <button key={chat.user.id} onClick={() => { setSelectedUser(chat.user); fetchMessages(chat.user.id); }} className="w-full flex items-center gap-4 p-5 rounded-[2.5rem] bg-[#1C1C1E]/40 hover:bg-[#1C1C1E] border border-white/5 transition-all text-left active:scale-[0.97] group shadow-lg">
            <div className="relative shrink-0"><img src={chat.user.profile_photo} className="w-[68px] h-[68px] rounded-[26px] object-cover border-2 border-white/10 group-hover:border-[#007AFF]/50 transition-colors" /><div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#007AFF] rounded-full border-[4px] border-black"></div></div>
            <div className="flex-grow min-w-0"><div className="flex justify-between items-baseline mb-1"><h4 className="font-black text-lg text-white truncate">{chat.user.name}</h4><span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div><p className="text-sm text-zinc-500 truncate font-medium group-hover:text-zinc-400">{chat.lastMessage}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Inbox;
