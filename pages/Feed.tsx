
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { User, Story, Post, Comment } from '../types';
import { supabase } from '../lib/supabase';

interface FeedProps {
  currentUser: User;
  onNavigateToProfile: (uid: string) => void;
}

const PostCard = memo(({ 
  post, 
  currentUser, 
  isExpanded, 
  comments, 
  onToggleLike, 
  onToggleComments, 
  onAddComment, 
  onNavigateToProfile,
  isCommentsDisabled
}: { 
  post: Post, 
  currentUser: User, 
  isExpanded: boolean, 
  comments: Comment[], 
  onToggleLike: (id: string) => void, 
  onToggleComments: (id: string) => void,
  onAddComment: (id: string, text: string) => void,
  onNavigateToProfile: (uid: string) => void,
  isCommentsDisabled: boolean
}) => {
  const [commentText, setCommentText] = useState('');
  const [showHeart, setShowHeart] = useState(false);
  const [optimisticLike, setOptimisticLike] = useState<{ liked: boolean, count: number } | null>(null);
  const lastTap = useRef<number>(0);

  const displayLikes = optimisticLike !== null ? optimisticLike.count : (post.likes_count || 0);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleLikeClick();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTap.current = now;
  };

  const handleLikeClick = () => {
    const currentCount = displayLikes;
    setOptimisticLike({ 
      liked: true, 
      count: currentCount + 1 
    });
    onToggleLike(post.id);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isCommentsDisabled) return;
    onAddComment(post.id, commentText);
    setCommentText('');
  };

  const isFallbackVideo = post.content?.startsWith('__MEDIA_VIDEO__');
  const videoUrl = isFallbackVideo ? post.content.replace('__MEDIA_VIDEO__', '') : post.video;
  const displayContent = isFallbackVideo ? '' : post.content;

  return (
    <div className="ios-card bg-[#1C1C1E]/60 border-white/5 overflow-hidden shadow-2xl transition-all mb-6">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigateToProfile(post.profiles?.uid || '')}>
          <div className="w-10 h-10 rounded-2xl overflow-hidden border border-white/10 group-active:scale-90 transition-transform bg-zinc-900">
            {post.profiles?.profile_photo && <img src={post.profiles.profile_photo} className="w-full h-full object-cover" alt="" />}
          </div>
          <div>
            <h4 className="font-bold text-sm text-white group-hover:text-[#007AFF] transition-colors">{post.profiles?.name || 'User'}</h4>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Just now'}</p>
          </div>
        </div>
      </div>
      
      <div className="px-4 pb-4">
        {displayContent && <p className="text-white/90 mb-4 text-[15px] leading-relaxed font-medium">{displayContent}</p>}
        
        {videoUrl ? (
          <div className="relative rounded-[1.8rem] overflow-hidden border border-white/5 bg-black mb-4 group shadow-2xl">
            <video src={videoUrl} className="w-full h-auto max-h-[500px] object-contain mx-auto" controls playsInline preload="metadata" />
            <div className="absolute top-4 left-4 pointer-events-none">
               <span className="bg-[#007AFF]/60 backdrop-blur-md text-[8px] text-white font-black px-2 py-1 rounded-full border border-white/10 uppercase tracking-widest">freeLynk Stream</span>
            </div>
          </div>
        ) : post.image && (
          <div className="relative rounded-[1.8rem] overflow-hidden border border-white/5 bg-black mb-4 cursor-pointer" onClick={handleDoubleTap}>
            <img src={post.image} className="w-full h-auto max-h-[500px] object-contain mx-auto" loading="lazy" />
            {showHeart && (
              <div className="absolute inset-0 flex items-center justify-center animate-ping pointer-events-none">
                <svg className="w-24 h-24 text-[#007AFF] drop-shadow-[0_0_30px_rgba(0,122,255,0.6)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-6 pt-1">
          <button onClick={handleLikeClick} className="flex items-center gap-2 text-zinc-400 hover:text-[#007AFF] active:scale-125 transition-all">
            <svg className={`w-6 h-6 ${(post.likes_count || optimisticLike?.liked) ? 'fill-[#007AFF] text-[#007AFF]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <span className="text-xs font-black">{displayLikes}</span>
          </button>
          
          <button 
            onClick={() => !isCommentsDisabled && onToggleComments(post.id)} 
            disabled={isCommentsDisabled}
            className={`flex items-center gap-2 transition-all active:scale-95 ${isCommentsDisabled ? 'opacity-20' : (isExpanded ? 'text-white' : 'text-zinc-400 hover:text-white')}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <span className="text-xs font-black uppercase tracking-widest">{post.comments_count || 0}</span>
          </button>
        </div>

        {isExpanded && !isCommentsDisabled && (
          <div className="mt-5 space-y-4 pt-5 border-t border-white/5 animate-slide-up">
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3 items-start animate-slide-up">
                  <img src={comment.profiles?.profile_photo} className="w-8 h-8 rounded-xl object-cover shrink-0 border border-white/10" />
                  <div className="bg-[#2C2C2E]/60 p-3 rounded-[1.2rem] rounded-tl-none border border-white/5 flex-grow shadow-md">
                    <h5 className="text-[10px] font-black text-[#007AFF] uppercase mb-1">{comment.profiles?.name}</h5>
                    <p className="text-sm text-zinc-300 leading-normal">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Reply to this thread..." className="flex-grow bg-[#2C2C2E] border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-[#007AFF] transition-all h-12 shadow-inner" />
              <button type="submit" disabled={!commentText.trim()} className="blue-gradient px-6 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-90 transition-all">Send</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
});

const Feed: React.FC<FeedProps> = ({ currentUser, onNavigateToProfile }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [newContent, setNewContent] = useState('');
  const [mediaData, setMediaData] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(async () => {
    try {
      let { data, error } = await supabase.from('posts').select(`id, author_id, content, image, video, created_at, profiles:author_id (id, name, profile_photo, uid)`).order('created_at', { ascending: false }).limit(20);
      if (error && error.message.includes('video')) {
        const res = await supabase.from('posts').select(`id, author_id, content, image, created_at, profiles:author_id (id, name, profile_photo, uid)`).order('created_at', { ascending: false }).limit(20);
        data = res.data; error = res.error;
      }
      if (error) throw error;
      if (data) {
        const postIds = data.map(p => p.id);
        const [likesRes, commentsRes] = await Promise.all([supabase.from('post_likes').select('post_id').in('post_id', postIds), supabase.from('post_comments').select('post_id').in('post_id', postIds)]);
        const formattedPosts = data.map((post: any) => ({ ...post, likes_count: (likesRes.data || []).filter(l => l.post_id === post.id).length, comments_count: (commentsRes.data || []).filter(c => c.post_id === post.id).length }));
        setPosts(formattedPosts as Post[]);
      }
    } catch (err) { console.error("Feed Load Error:", err); } finally { setIsLoading(false); }
  }, []);

  const fetchStories = async () => {
    try {
      const { data } = await supabase.from('stories').select('*, profiles:author_id(name, profile_photo, uid)').order('created_at', { ascending: false }).limit(10);
      if (data) setStories(data as any);
    } catch (e) {}
  };

  const fetchComments = useCallback(async (postId: string) => {
    try {
      const { data, error } = await supabase.from('post_comments').select(`*, profiles:user_id(name, profile_photo, uid)`).eq('post_id', postId).order('created_at', { ascending: true });
      if (!error && data) setPostComments(prev => ({ ...prev, [postId]: data as any }));
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchPosts(); fetchStories();
    const channel = supabase.channel('feed_realtime_v3').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts()).on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => fetchPosts()).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, () => fetchPosts()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  const toggleLike = useCallback(async (postId: string) => {
    const dbId = currentUser?.dbId; if (!dbId) return;
    try {
      const { data: existing } = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', dbId).maybeSingle();
      if (existing) { await supabase.from('post_likes').delete().eq('id', existing.id); } 
      else { await supabase.from('post_likes').insert([{ post_id: postId, user_id: dbId }]); }
    } catch (err) {}
  }, [currentUser]);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMediaData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setVideoData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!newContent.trim() && !mediaData && !videoData) return;
    setIsPosting(true);
    try {
      const { error } = await supabase.from('posts').insert([{ author_id: currentUser?.dbId, content: newContent, image: mediaData, video: videoData }]);
      if (error && error.message.includes('video')) {
        const finalContent = videoData ? `__MEDIA_VIDEO__${videoData}` : newContent;
        const { error: fError } = await supabase.from('posts').insert([{ author_id: currentUser?.dbId, content: finalContent, image: mediaData }]);
        if (fError) throw fError;
      } else if (error) throw error;
      setNewContent(''); setMediaData(null); setVideoData(null); fetchPosts();
    } catch (err: any) { alert(err.message); } finally { setIsPosting(false); }
  };

  return (
    <div className="space-y-6 px-4 pb-32 pt-6 max-w-xl mx-auto animate-slide-up">
      <div className="flex gap-4 overflow-x-auto py-2 hide-scrollbar">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative cursor-pointer group" onClick={() => storyInputRef.current?.click()}>
            <div className="w-[66px] h-[66px] rounded-[26px] bg-zinc-900 border-2 border-dashed border-zinc-800 flex items-center justify-center group-active:scale-90 transition-all">
              <img src={currentUser?.profilePhoto} className="w-full h-full rounded-[24px] object-cover opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 blue-gradient rounded-full flex items-center justify-center shadow-lg border-2 border-black"><span className="text-white text-sm font-black">+</span></div>
              </div>
            </div>
          </div>
          <input type="file" ref={storyInputRef} className="hidden" accept="image/*" />
        </div>
        {stories.map(story => (
          <div key={story.id} className="flex flex-col items-center gap-2 shrink-0 animate-slide-up">
            <div className="story-ring p-[2px]"><div className="p-[2.5px] bg-black rounded-full overflow-hidden"><img src={story.profiles?.profile_photo} className="w-[58px] h-[58px] rounded-full object-cover" /></div></div>
            <span className="text-[9px] text-zinc-400 font-bold max-w-[62px] truncate">{story.profiles?.name}</span>
          </div>
        ))}
      </div>

      <div className="ios-card overflow-hidden bg-[#1C1C1E]/80 backdrop-blur-2xl border-white/5 shadow-2xl">
        <div className="p-4 flex gap-4">
          <img src={currentUser?.profilePhoto} className="w-10 h-10 rounded-2xl object-cover border border-white/10" />
          <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder={videoData ? "Caption your broadcast..." : `freeLynk your network, ${currentUser?.name.split(' ')[0]}...`} className="flex-grow bg-transparent text-white placeholder-zinc-700 text-[15px] outline-none resize-none pt-1 min-h-[60px] font-medium" />
        </div>
        
        {mediaData && (
          <div className="px-4 pb-4 animate-slide-up"><div className="relative rounded-[1.8rem] overflow-hidden border border-white/10 shadow-xl bg-black"><img src={mediaData} className="w-full h-auto max-h-64 object-cover" /><button onClick={() => setMediaData(null)} className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white active:scale-75 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button></div></div>
        )}

        {videoData && (
          <div className="px-4 pb-4 animate-slide-up"><div className="relative rounded-[1.8rem] overflow-hidden border border-white/10 bg-black shadow-xl ring-2 ring-blue-500/20"><video src={videoData} className="w-full h-48 object-contain" controls /><button onClick={() => setVideoData(null)} className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white active:scale-75 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button></div></div>
        )}

        <div className="px-4 py-3 bg-white/5 flex items-center justify-between border-t border-white/5">
          <div className="flex gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-2xl bg-[#2C2C2E] flex items-center justify-center text-zinc-400 hover:text-[#007AFF] transition-all active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 01-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></button>
            <button onClick={() => videoInputRef.current?.click()} className="w-10 h-10 rounded-2xl bg-[#2C2C2E] flex items-center justify-center text-zinc-400 hover:text-[#007AFF] transition-all active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
          <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoUpload} />
          <button onClick={handlePost} disabled={isPosting || (!newContent.trim() && !mediaData && !videoData)} className="blue-gradient px-8 py-3 rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 disabled:opacity-30 transition-all shadow-lg">{isPosting ? 'Broadcasting...' : 'Broadcast'}</button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center gap-4"><div className="w-8 h-8 border-4 border-[#007AFF]/10 border-t-[#007AFF] rounded-full animate-spin"></div><p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.4em]">Establishing freeLynk</p></div>
        ) : posts.map(post => (
          <PostCard key={post.id} post={post} currentUser={currentUser} isExpanded={expandedPostId === post.id} comments={postComments[post.id] || []} isCommentsDisabled={false} onToggleLike={toggleLike} onToggleComments={(id) => { setExpandedPostId(prev => prev === id ? null : id); if (expandedPostId !== id) fetchComments(id); }} onAddComment={async (id, text) => { try { await supabase.from('post_comments').insert([{ post_id: id, user_id: currentUser?.dbId, content: text }]); fetchComments(id); } catch (e) {} }} onNavigateToProfile={onNavigateToProfile} />
        ))}
      </div>
    </div>
  );
};

export default Feed;
