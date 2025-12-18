
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
  const [setupRequired, setSetupRequired] = useState<string | null>(null);
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
      setSetupRequired(null);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (id, name, profile_photo, uid)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message.includes("author_id")) {
          setSetupRequired("Database 'author_id' check failed. Please ensure the posts table has author_id linked to profiles.");
        }
      } else if (data) {
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
      alert("Publish Error: " + err.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-6 px-4 pb-32 pt-20 animate-slide-up max-w-xl mx-auto">
      {/* Stories - iOS Style */}
      <div className="flex gap-4 overflow-x-auto py-2 hide-scrollbar">
        <div className="flex flex-col items-center gap-2 shrink-0 group">
          <div className="relative cursor-pointer" onClick={() => onNavigateToProfile(currentUser.uid)}>
            <div className="w-[74px] h-[74px] rounded-full p-[3px] border-2 border-zinc-800 group-active:scale-90 transition-transform">
              <img src={currentUser.profilePhoto} className="w-full h-full rounded-full object-cover" alt="" />
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 pink-gradient rounded-full border-[3px] border-black flex items-center justify-center shadow-lg">
               <span className="text-white text-[14px] font-black">+</span>
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">New Link</span>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex flex-col items-center gap-2 shrink-0">
            <div className="story-ring pulse-active p-[3px] active:scale-95 transition-transform cursor-pointer">
              <div className="p-[2.5px] bg-black rounded-full">
                <img src={`https://i.pravatar.cc/150?u=${i+2000}`} className="w-[62px] h-[62px] rounded-full border border-black object-cover" alt="" />
              </div>
            </div>
            <span className="text-[10px] text-zinc-500 font-bold w-16 truncate text-center">Identity {i}</span>
          </div>
        ))}
      </div>

      {/* iOS Style Composer Card */}
      <div className="ios-card overflow-hidden bg-zinc-900/60 border-white/5 shadow-2xl backdrop-blur-3xl">
        <div className="p-5 flex gap-4">
          <img src={currentUser.profilePhoto} className="w-11 h-11 rounded-full object-cover ring-1 ring-white/10" alt="" />
          <div className="flex-grow">
            <textarea 
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What's happening in your network?"
              className="w-full bg-transparent text-white placeholder-zinc-600 text-[17px] outline-none resize-none min-h-[50px] font-medium pt-2"
            />
            
            {mediaData && (
              <div className="mt-4 relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img src={mediaData} className="w-full h-auto max-h-80 object-cover" alt="Selected" />
                <button onClick={() => setMediaData(null)} className="absolute top-3 right-3 ios-blur p-2 rounded-full text-white shadow-lg active:scale-75 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-3 bg-white/5 flex items-center justify-between border-t border-white/5">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-zinc-400 hover:text-[#FF2D55] transition-colors font-bold text-xs uppercase tracking-widest active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 01-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Photo
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMedia} />
          
          <button 
            onClick={handlePost}
            disabled={isPosting || (!newContent.trim() && !mediaData)}
            className="pink-gradient px-7 py-2.5 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all shadow-lg"
          >
            {isPosting ? 'LINKING...' : 'SYNC LINK'}
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map(post => {
          const author = post.profiles || { name: 'Identity', profile_photo: 'https://i.pravatar.cc/150', uid: '???' };
          return (
            <div key={post.id} className="ios-card bg-zinc-900/40 border-white/5 animate-slide-up shadow-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigateToProfile(author.uid)}>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shadow-md transition-transform group-active:scale-90">
                    <img src={author.profile_photo} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] text-white leading-tight group-hover:text-[#FF2D55] transition-colors">{author.name}</h4>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{new Date(post.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
                <button className="text-zinc-600 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"/></svg>
                </button>
              </div>
              
              <div className="px-4 pb-2">
                {post.content && <p className="text-white mb-4 whitespace-pre-wrap leading-[1.4] text-[16px] font-medium tracking-tight">{post.content}</p>}
                {post.image && (
                  <div className="rounded-3xl overflow-hidden border border-white/5 bg-black/40 shadow-inner mb-3">
                    <img src={post.image} className="w-full h-auto max-h-[500px] object-contain mx-auto" />
                  </div>
                )}
                
                <div className="flex items-center gap-6 py-4 border-t border-white/5">
                  <button className="flex items-center gap-1.5 text-zinc-400 hover:text-[#FF2D55] transition-all group">
                    <div className="p-2 rounded-full group-active:bg-[#FF2D55]/10 group-active:scale-125 transition-all">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.1em]">Love</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-all group">
                    <div className="p-2 rounded-full group-active:bg-white/10 group-active:scale-110 transition-all">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.1em]">Echo</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-all group ml-auto">
                    <div className="p-2 rounded-full group-active:bg-white/10 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {posts.length === 0 && (
          <div className="text-center py-40 opacity-20">
             <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2zM14 4v4h4"/></svg>
             </div>
             <p className="font-black uppercase tracking-[0.6em] text-[10px]">No Network Traffic</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
