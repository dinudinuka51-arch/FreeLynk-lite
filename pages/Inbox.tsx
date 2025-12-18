
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface InboxProps {
  currentUser: User;
  onNavigateToProfile: (uid: string) => void;
}

const Inbox: React.FC<InboxProps> = ({ currentUser, onNavigateToProfile }) => {
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatPreviews, setChatPreviews] = useState<any[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const dbId = (currentUser as any).dbId;

  useEffect(() => {
    fetchPreviews();
    
    const channel = supabase
      .channel('inbox_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (selectedUser && (payload.new.sender_id === selectedUser.id || payload.new.receiver_id === selectedUser.id)) {
          fetchMessages(selectedUser.id);
        }
        fetchPreviews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, dbId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchPreviews = async () => {
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(id, name, profile_photo, uid),
        receiver:profiles!receiver_id(id, name, profile_photo, uid)
      `)
      .or(`sender_id.eq.${dbId},receiver_id.eq.${dbId}`)
      .order('created_at', { ascending: false });

    if (data) {
      const uniqueChats: Record<string, any> = {};
      data.forEach(m => {
        const other = m.sender_id === dbId ? m.receiver : m.sender;
        if (other && !uniqueChats[other.id]) {
          uniqueChats[other.id] = {
            user: other,
            lastMessage: m.text,
            timestamp: m.created_at
          };
        }
      });
      setChatPreviews(Object.values(uniqueChats));
    }
  };

  const fetchMessages = async (otherId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${dbId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${dbId})`)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedUser) return;

    const { error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: dbId,
          receiver_id: selectedUser.id,
          text: text
        }
      ]);

    if (!error) {
      setText('');
      fetchMessages(selectedUser.id);
    }
  };

  if (selectedUser) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] animate-slide-up bg-black">
        <div className="flex items-center gap-3 p-4 border-b border-white/5 ios-blur sticky top-0 z-10">
          <button onClick={() => setSelectedUser(null)} className="p-2 -ml-2 text-[#FF2D55] active:scale-75 transition-transform">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <img src={selectedUser.profile_photo} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
          <div>
            <h4 className="font-bold text-sm text-white">{selectedUser.name}</h4>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-[#FF2D55] rounded-full animate-pulse"></div>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Secured Link</p>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-3 pb-24 hide-scrollbar">
          {messages.map(msg => {
            const isMe = msg.sender_id === dbId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[15px] shadow-sm ${
                  isMe ? 'pink-gradient text-white rounded-tr-none shadow-pink-500/10' : 'bg-zinc-800/80 text-zinc-100 rounded-tl-none border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-black/80 backdrop-blur-lg border-t border-white/5 fixed bottom-20 left-0 right-0 max-w-2xl mx-auto md:relative md:bottom-0">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Message..."
              className="flex-grow ios-input p-3 px-5 text-sm h-12"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="pink-gradient w-12 h-12 rounded-full flex items-center justify-center text-white active:scale-90 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-20" disabled={!text.trim()}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-2 pt-20 animate-slide-up max-w-xl mx-auto">
      <div className="px-4 pb-4">
        <h2 className="text-3xl font-black text-white">Inbox</h2>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Private Communications</p>
      </div>
      
      <div className="space-y-1">
        {chatPreviews.map(chat => (
          <button 
            key={chat.user.id}
            onClick={() => { setSelectedUser(chat.user); fetchMessages(chat.user.id); }}
            className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-zinc-900/50 transition-all text-left group active:scale-[0.98]"
          >
            <div className="relative shrink-0">
              <img src={chat.user.profile_photo} className="w-16 h-16 rounded-full object-cover border border-white/10 shadow-lg" alt="" />
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-[3px] border-black"></div>
            </div>
            <div className="flex-grow min-w-0 border-b border-white/5 pb-4">
              <div className="flex justify-between items-baseline mb-1">
                <h4 className="font-bold text-base text-white truncate group-hover:text-[#FF2D55] transition-colors">{chat.user.name}</h4>
                <span className="text-[10px] text-zinc-600 font-bold uppercase">{new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm text-zinc-500 truncate font-medium">{chat.lastMessage}</p>
            </div>
          </button>
        ))}
        {chatPreviews.length === 0 && (
          <div className="text-center py-40 opacity-20">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            <p className="uppercase tracking-[0.4em] text-[10px] font-black">No Active Links Found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
