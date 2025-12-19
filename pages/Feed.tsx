
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
  const lastTap = useRef<number>(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      onToggleLike(post.id);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTap.current = now;
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isCommentsDisabled) return;
    onAddComment(post.id, commentText);
    setCommentText('');
  };

  return (
    <div className="ios-card bg-[#1C1C1E]/60 border-white/5 overflow-hidden shadow-2xl transition-all mb-6">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigateToProfile(post.profiles?.uid || '')}>
          <div className="w-10 h-10 rounded-2xl overflow-hidden border border-white/10 group-active:scale-90 transition-transform">
            <img src={post.profiles?.profile_photo} className="w-full h-full object-cover" alt="" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white group-hover:text-[#FF2D55] transition-colors">{post.profiles?.name || 'User'}</h4>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
      
      <div className="px-4 pb-4">
        {post.content && <p className="text-white/90 mb-4 text-[15px] leading-relaxed font-medium">{post.content}</p>}
        {post.image && (
          <div className="relative rounded-[1.8rem] overflow-hidden border border-white/5 bg-black/40 mb-4 cursor-pointer" onClick={handleDoubleTap}>
            <img src={post.image} className="w-full h-auto max-h-[500px] object-contain mx-auto" loading="lazy" />
            {showHeart && (
              <div className="absolute inset-0 flex items-center justify-center animate-ping pointer-events-none">
                <svg className="w-24 h-24 text-[#FF2D55] drop-shadow-[0_0_30px_rgba(255,45,85,0.6)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-6 pt-3">
          <button onClick={() => onToggleLike(post.id)} className="flex items-center gap-2 text-zinc-400 hover:text-[#FF2D55] active:scale-125 transition-all">
            <svg className={`w-6 h-6 ${post.likes_count ? 'fill-[#FF2D55] text-[#FF2D55]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <span className="text-xs font-black">{post.likes_count || 0}</span>
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
                    <h5 className="text-[10px] font-black text-[#FF2D55] uppercase mb-1">{comment.profiles?.name}</h5>
                    <p className="text-sm text-zinc-300 leading-normal">{comment.content}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="py-6 flex flex-col items-center gap-2 opacity-20">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeWidth="2"/></svg>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em]">Start the conversation</p>
                </div>
              )}
            </div>
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input 
                type="text" 
                value={commentText} 
                onChange={(e) => setCommentText(e.target.value)} 
                placeholder="Reply to this thread..." 
                className="flex-grow bg-[#2C2C2E] border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-[#FF2D55] transition-all h-12 shadow-inner" 
              />
              <button 
                type="submit" 
                disabled={!commentText.trim()} 
                className="pink-gradient px-6 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-90 transition-all shadow-lg shadow-pink-500/20"
              >
                Send
              </button>
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
  const [isPosting, setIsPosting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`id, author_id, content, image, created_at, profiles:author_id (id, name, profile_photo, uid)`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        const postIds = data.map(p => p.id);
        let likes: any[] = [];
        let comments: any[] = [];
        const currentMissing: string[] = [];
        
        try {
          const { data: likesData, error: likesError } = await supabase.from('post_likes').select('post_id').in('post_id', postIds);
          if (likesError && likesError.code === 'PGRST205') currentMissing.push('post_likes');
          else likes = likesData || [];
        } catch (e) { console.warn("Likes check failed"); }

        try {
          const { data: commentsData, error: commentsError } = await supabase.from('post_comments').select('post_id').in('post_id', postIds);
          if (commentsError && commentsError.code === 'PGRST205') currentMissing.push('post_comments');
          else comments = commentsData || [];
        } catch (e) { console.warn("Comments check failed"); }

        setMissingTables(currentMissing);

        const formattedPosts = data.map((post: any) => ({
          ...post,
          likes_count: likes.filter(l => l.post_id === post.id).length,
          comments_count: comments.filter(c => c.post_id === post.id).length
        }));
        
        setPosts(formattedPosts as Post[]);
      }
    } catch (err) {
      console.error("Feed Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchComments = useCallback(async (postId: string) => {
    if (missingTables.includes('post_comments')) return;
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`*, profiles:user_id(name, profile_photo, uid)`)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (!error && data) setPostComments(prev => ({ ...prev, [postId]: data as any }));
    } catch (e) { console.warn("Comments Fetch Failed", e); }
  }, [missingTables]);

  useEffect(() => {
    fetchPosts();
    fetchStories();

    const channel = supabase.channel('feed_realtime_complex')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, (payload: any) => {
        fetchPosts();
        if (expandedPostId && payload.new && payload.new.post_id === expandedPostId) {
          fetchComments(expandedPostId);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts, expandedPostId, fetchComments]);

  const toggleLike = useCallback(async (postId: string) => {
    const dbId = (currentUser as any).dbId;
    if (!dbId || missingTables.includes('post_likes')) return;
    try {
      const { data: existing } = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', dbId).maybeSingle();
      if (existing) {
        await supabase.from('post_likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('post_likes').insert([{ post_id: postId, user_id: dbId }]);
      }
    } catch (err) { console.error(err); }
  }, [currentUser, missingTables]);

  const handlePost = async () => {
    if (!newContent.trim() && !mediaData) return;
    setIsPosting(true);
    try {
      const { error } = await supabase.from('posts').insert([{ 
        author_id: (currentUser as any).dbId, 
        content: newContent,
        image: mediaData
      }]);
      if (error) throw error;
      setNewContent('');
      setMediaData(null);
    } catch (err: any) { alert(err.message); } 
    finally { setIsPosting(false); }
  };

  const fetchStories = async () => {
    try {
      const { data } = await supabase.from('stories').select('*, profiles:author_id(name, profile_photo, uid)').order('created_at', { ascending: false }).limit(10);
      if (data) setStories(data as any);
    } catch (e) {}
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMediaData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 px-4 pb-32 pt-6 max-w-xl mx-auto animate-slide-up">
      {missingTables.length > 0 && (
        <div className="p-6 rounded-[2rem] bg-pink-500/10 border border-pink-500/20 text-white animate-slide-up shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-8 rounded-full pink-gradient flex items-center justify-center font-black text-xs shadow-lg shadow-pink-500/30">!</div>
             <h3 className="font-black text-xs uppercase tracking-[0.2em] text-pink-400">Setup Required</h3>
          </div>
          <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed font-bold">
            The database tables <span className="text-pink-300">{missingTables.join(' & ')}</span> are not yet created. 
            Run the SQL commands provided in the setup instructions.
          </p>
          <button 
            onClick={() => fetchPosts()}
            className="w-full py-3 bg-pink-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] active:scale-95 transition-all shadow-xl shadow-pink-500/20"
          >
            Refresh Database Link
          </button>
        </div>
      )}

      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto py-2 hide-scrollbar">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative cursor-pointer group" onClick={() => storyInputRef.current?.click()}>
            <div className="w-[70px] h-[70px] rounded-[28px] bg-zinc-900 border-2 border-dashed border-zinc-800 flex items-center justify-center group-active:scale-90 transition-all">
              <img src={currentUser.profilePhoto} className="w-full h-full rounded-[24px] object-cover opacity-30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 pink-gradient rounded-full flex items-center justify-center shadow-lg border-2 border-black"><span className="text-white text-base font-black">+</span></div>
              </div>
            </div>
            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-1">Link</span>
          </div>
          <input type="file" ref={storyInputRef} className="hidden" accept="image/*" />
        </div>
        {stories.map(story => (
          <div key={story.id} className="flex flex-col items-center gap-2 shrink-0 animate-slide-up">
            <div className="story-ring p-[2px] transition-transform active:scale-90 cursor-pointer">
              <div className="p-[2.5px] bg-black rounded-full overflow-hidden">
                <img src={story.profiles?.profile_photo} className="w-[60px] h-[60px] rounded-full object-cover" />
              </div>
            </div>
            <span className="text-[10px] text-zinc-400 font-bold max-w-[66px] truncate">{story.profiles?.name}</span>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="ios-card overflow-hidden bg-[#1C1C1E]/80 backdrop-blur-2xl border-white/5 shadow-2xl">
        <div className="p-4 flex gap-4">
          <img src={currentUser.profilePhoto} className="w-11 h-11 rounded-2xl object-cover border border-white/10 shadow-lg" />
          <textarea 
            value={newContent} 
            onChange={(e) => setNewContent(e.target.value)} 
            placeholder={`What's the signal, ${currentUser.name.split(' ')[0]}?`} 
            className="flex-grow bg-transparent text-white placeholder-zinc-700 text-[16px] outline-none resize-none pt-2 min-h-[70px] font-medium" 
          />
        </div>
        {mediaData && (
          <div className="px-4 pb-4">
            <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
              <img src={mediaData} className="w-full h-auto max-h-72 object-cover" />
              <button onClick={() => setMediaData(null)} className="absolute top-3 right-3 bg-black/60 p-2 rounded-full text-white backdrop-blur-xl border border-white/10 active:scale-75 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
              </button>
            </div>
          </div>
        )}
        <div className="px-4 py-3 bg-white/5 flex items-center justify-between border-t border-white/5">
          <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-2xl bg-[#2C2C2E] flex items-center justify-center text-zinc-400 hover:text-[#FF2D55] transition-all active:scale-75">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 01-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
          <button 
            onClick={handlePost} 
            disabled={isPosting || (!newContent.trim() && !mediaData)} 
            className="pink-gradient px-8 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] active:scale-95 disabled:opacity-30 transition-all shadow-xl shadow-pink-500/30"
          >
            {isPosting ? 'Broadcasting...' : 'Link Up'}
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center gap-5">
            <div className="w-10 h-10 border-4 border-[#FF2D55]/10 border-t-[#FF2D55] rounded-full animate-spin"></div>
            <p className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.4em]">Synchronizing Feed</p>
          </div>
        ) : posts.map(post => (
          <PostCard 
            key={post.id} 
            post={post} 
            currentUser={currentUser} 
            isExpanded={expandedPostId === post.id}
            comments={postComments[post.id] || []}
            isCommentsDisabled={missingTables.includes('post_comments')}
            onToggleLike={toggleLike}
            onToggleComments={(id) => { setExpandedPostId(prev => prev === id ? null : id); if (expandedPostId !== id) fetchComments(id); }}
            onAddComment={async (id, text) => {
              const dbId = (currentUser as any).dbId;
              try {
                await supabase.from('post_comments').insert([{ post_id: id, user_id: dbId, content: text }]);
              } catch (e: any) { console.error("Comment Insert Failed", e); }
            }}
            onNavigateToProfile={onNavigateToProfile}
          />
        ))}
        {!isLoading && posts.length === 0 && (
          <div className="py-32 text-center opacity-20">
             <p className="text-white text-[11px] font-black uppercase tracking-[0.5em]">No activity in the network</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
