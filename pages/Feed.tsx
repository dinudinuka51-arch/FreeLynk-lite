
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface FeedProps {
  currentUser: User;
  onNavigateToProfile: (userId: string) => void;
}

const Feed: React.FC<FeedProps> = ({ currentUser, onNavigateToProfile }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [newContent, setNewContent] = useState('');
  const [mediaData, setMediaData] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('realtime_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (id, name, profile_photo, uid)
        `)
        .order('created_at', { ascending: false });

      if (data) {
        setPosts(data);
      }
    } catch (err: any) {
      console.error("Feed error:", err);
    }
  };

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMediaData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!newContent.trim() && !mediaData) return;
    setIsPosting(true);
    const dbId = (currentUser as any).dbId;

    try {
      const payload: any = { 
        author_id: dbId, 
        content: newContent,
        image: mediaData 
      };

      const { error } = await supabase.from('posts').insert([payload]);
      if (error) throw error;

      setNewContent('');
      setMediaData(null);
      fetchPosts();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-6 px-4 pb-32 pt-6 animate-slide-up max-w-xl mx-auto">
      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto py-2 hide-scrollbar">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative cursor-pointer" onClick={() => onNavigateToProfile(currentUser.uid)}>
            <div className="w-[72px] h-[72px] rounded-full p-[2.5px] border-2 border-zinc-800">
              <img src={currentUser.profilePhoto} className="w-full h-full rounded-full object-cover" alt="" />
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 pink-gradient rounded-full border-[3px] border-black flex items-center justify-center">
               <span className="text-white text-[12px] font-black">+</span>
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Your Link</span>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex flex-col items-center gap-2 shrink-0">
            <div className="story-ring p-[2.5px] active:scale-95 transition-transform cursor-pointer">
              <div className="p-[2.5px] bg-black rounded-full">
                <img src={`https://i.pravatar.cc/150?u=${i+50}`} className="w-[62px] h-[62px] rounded-full object-cover" alt="" />
              </div>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium w-16 truncate text-center">User_{i}</span>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="ios-card overflow-hidden bg-[#1C1C1E]/80 backdrop-blur-xl">
        <div className="p-4 flex gap-3">
          <img src={currentUser.profilePhoto} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
          <textarea 
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Share something with your network..."
            className="flex-grow bg-transparent text-white placeholder-zinc-600 text-[16px] outline-none resize-none min-h-[44px] pt-2"
          />
        </div>
        
        {mediaData && (
          <div className="px-4 pb-4">
            <div className="relative rounded-2xl overflow-hidden border border-white/10">
              <img src={mediaData} className="w-full h-auto max-h-60 object-cover" alt="Selected" />
              <button onClick={() => setMediaData(null)} className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white backdrop-blur-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2"/></svg>
              </button>
            </div>
          </div>
        )}

        <div className="px-4 py-3 bg-white/5 flex items-center justify-between border-t border-white/5">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-zinc-400 hover:text-[#FF2D55] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 01-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Photo</span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMedia} />
          
          <button 
            onClick={handlePost}
            disabled={isPosting || (!newContent.trim() && !mediaData)}
            className="pink-gradient px-6 py-2 rounded-xl text-white font-black text-[11px] uppercase tracking-widest disabled:opacity-30 transition-all shadow-lg"
          >
            {isPosting ? 'Linking...' : 'Sync Post'}
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {posts.map(post => {
          const author = post.profiles || { name: 'Identity', profile_photo: 'https://i.pravatar.cc/150', uid: '???' };
          return (
            <div key={post.id} className="ios-card bg-[#1C1C1E]/50 border-white/5 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigateToProfile(author.uid)}>
                  <img src={author.profile_photo} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                  <div>
                    <h4 className="font-bold text-[14px] text-white leading-tight">{author.name}</h4>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{new Date(post.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              </div>
              
              <div className="px-4 pb-4">
                {post.content && <p className="text-white/90 mb-3 whitespace-pre-wrap leading-snug text-[15px]">{post.content}</p>}
                {post.image && (
                  <div className="rounded-2xl overflow-hidden border border-white/5 bg-black/20">
                    <img src={post.image} className="w-full h-auto max-h-[450px] object-contain" />
                  </div>
                )}
                
                <div className="flex items-center gap-6 mt-4 pt-3 border-t border-white/5">
                  <button className="flex items-center gap-1.5 text-zinc-500 hover:text-[#FF2D55] transition-all group">
                    <svg className="w-5 h-5 group-active:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Love</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Echo</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Feed;
