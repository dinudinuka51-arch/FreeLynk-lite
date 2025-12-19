
import React, { useState, useEffect, useRef } from 'react';
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
  const [schemaError, setSchemaError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dbId = (currentUser as any).dbId;

  useEffect(() => {
    if (initialChatUserId) {
      const fetchInitialUser = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', initialChatUserId).single();
        if (data) {
          setSelectedUser(data);
          fetchMessages(data.id);
          if (onClearInitialChat) onClearInitialChat();
          setTimeout(() => inputRef.current?.focus(), 500);
        }
      };
      fetchInitialUser();
    }
  }, [initialChatUserId]);

  useEffect(() => {
    fetchPreviews();
    
    const channel = supabase
      .channel('chat_realtime_global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new as Message;
        if (selectedUser && (newMessage.sender_id === selectedUser.id || newMessage.receiver_id === selectedUser.id)) {
          setMessages(prev => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
        fetchPreviews();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUser, dbId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const fetchPreviews = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`*, sender:profiles!sender_id(id, name, profile_photo, uid), receiver:profiles!receiver_id(id, name, profile_photo, uid)`)
        .or(`sender_id.eq.${dbId},receiver_id.eq.${dbId}`)
        .order('created_at', { ascending: false });

      if (error && error.code === 'PGRST204') {
        setSchemaError("Database schema mismatch. Please update your SQL tables.");
        return;
      }

      if (data) {
        const uniqueChats: Record<string, any> = {};
        data.forEach(m => {
          const other = m.sender_id === dbId ? m.receiver : m.sender;
          if (other && !uniqueChats[other.id]) {
            uniqueChats[other.id] = { user: other, lastMessage: m.text || `[Media Attachment]`, timestamp: m.created_at };
          }
        });
        setChatPreviews(Object.values(uniqueChats));
      }
    } catch (e) {}
  };

  const fetchMessages = async (otherId: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${dbId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${dbId})`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as any);
    } catch (e) {}
  };

  const sendMessage = async (payload: any) => {
    if (isSending) return;
    setIsSending(true);
    try {
      // Remove media_type if it might cause issues (fallback logic)
      const dataToInsert: any = {
        sender_id: dbId,
        receiver_id: selectedUser.id,
        ...payload
      };

      const { error } = await supabase.from('messages').insert([dataToInsert]);
      
      if (error) {
        if (error.message.includes('media_type')) {
          // Retry without media_type if it's causing the error
          delete dataToInsert.media_type;
          const { error: retryError } = await supabase.from('messages').insert([dataToInsert]);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      setText('');
    } catch (e: any) { 
      console.error(e);
      alert(`Message delivery failed: ${e.message}`); 
    } finally {
      setIsSending(false);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => sendMessage({ media_url: reader.result as string, media_type: 'image' });
      reader.readAsDataURL(file);
    }
  };

  if (selectedUser) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] animate-slide-up bg-black">
        <div className="flex items-center gap-4 p-4 border-b border-white/5 ios-blur sticky top-0 z-10 shadow-lg">
          <button onClick={() => setSelectedUser(null)} className="p-2 -ml-2 text-[#FF2D55] active:scale-75 transition-all">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <img src={selectedUser.profile_photo} className="w-10 h-10 rounded-2xl object-cover border border-white/10 shadow-md" />
          <div className="flex-grow">
            <h4 className="font-bold text-base text-white leading-tight">{selectedUser.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-[#FF2D55] rounded-full shadow-[0_0_8px_#FF2D55] animate-pulse"></div>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Linked Securely</p>
            </div>
          </div>
          <button onClick={() => onNavigateToProfile(selectedUser.uid)} className="p-2 text-zinc-600 hover:text-white transition-all active:scale-90">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </button>
        </div>

        <div ref={scrollRef} className="flex-grow overflow-y-auto p-5 space-y-4 pb-40 hide-scrollbar">
          {messages.map((msg, idx) => {
            const isMe = msg.sender_id === dbId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                <div className={`relative max-w-[85%] px-5 py-3.5 rounded-[1.8rem] text-[15px] shadow-xl transition-all font-medium ${
                  isMe ? 'pink-gradient text-white rounded-br-[0.4rem]' : 'bg-[#1C1C1E] text-zinc-100 rounded-bl-[0.4rem] border border-white/5 shadow-black/40'
                }`}>
                  {msg.media_url && <img src={msg.media_url} className="rounded-2xl mb-2.5 max-w-full border border-white/5 shadow-lg" />}
                  {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                  <span className={`text-[8px] mt-1.5 block opacity-40 font-black uppercase tracking-tighter ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-black/90 backdrop-blur-3xl border-t border-white/5 fixed bottom-20 left-0 right-0 max-w-2xl mx-auto md:relative md:bottom-0 z-20">
          <div className="flex gap-3 items-center">
            <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-2xl bg-[#1C1C1E] flex items-center justify-center text-zinc-500 active:scale-90 transition-all border border-white/5 hover:text-[#FF2D55] shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 01-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
            
            <form onSubmit={(e) => { e.preventDefault(); if(text.trim()) { sendMessage({ text: text, media_type: 'text' }); } }} className="flex-grow flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Secure message..."
                className="flex-grow ios-input p-3 px-6 text-[16px] h-12 shadow-inner"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button type="submit" className="pink-gradient w-12 h-12 rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all shadow-xl shadow-pink-500/30 disabled:opacity-30" disabled={!text.trim() || isSending}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pt-20 animate-slide-up max-w-xl mx-auto pb-32">
      <div className="flex items-end justify-between px-2 mb-8">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Direct</h2>
          <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Direct Network Channels</p>
        </div>
      </div>

      {schemaError && (
        <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl text-pink-400 text-[10px] font-black uppercase tracking-widest text-center">
          {schemaError}
        </div>
      )}
      
      <div className="space-y-4">
        {chatPreviews.map(chat => (
          <button 
            key={chat.user.id}
            onClick={() => { setSelectedUser(chat.user); fetchMessages(chat.user.id); }}
            className="w-full flex items-center gap-4 p-5 rounded-[2.5rem] bg-[#1C1C1E]/40 hover:bg-[#1C1C1E] border border-white/5 transition-all text-left group active:scale-[0.98] shadow-2xl"
          >
            <div className="relative shrink-0">
              <img src={chat.user.profile_photo} className="w-[70px] h-[70px] rounded-[26px] object-cover border-2 border-white/10 shadow-xl group-hover:border-[#FF2D55] transition-colors" />
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#FF2D55] rounded-full border-[3px] border-black shadow-lg"></div>
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h4 className="font-bold text-lg text-white truncate">{chat.user.name}</h4>
                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm text-zinc-500 truncate font-medium">{chat.lastMessage}</p>
            </div>
          </button>
        ))}
        {chatPreviews.length === 0 && !schemaError && (
          <div className="py-40 text-center flex flex-col items-center gap-6 opacity-20">
            <div className="w-24 h-24 bg-[#1C1C1E] rounded-[2.8rem] flex items-center justify-center border border-white/5">
               <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/></svg>
            </div>
            <p className="text-white text-xs font-black uppercase tracking-[0.4em]">No Link Activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
