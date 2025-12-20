
import React, { useRef, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import AIEditor from '../components/AIEditor';

interface ProfileProps {
  currentUser: User;
  viewingUserId: string;
  onUpdateUser: () => void;
  onLogout: () => void;
  onMessageClick?: (dbId: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ currentUser, viewingUserId, onUpdateUser, onLogout, onMessageClick }) => {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiEditorState, setAiEditorState] = useState<{ isOpen: boolean, type: 'profile' | 'cover' }>({ isOpen: false, type: 'profile' });
  
  // New States for Inline Editing
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isMe = currentUser.uid === viewingUserId;

  useEffect(() => {
    fetchProfile(); fetchUserPosts();
    const profileSub = supabase.channel('profile_updates').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => { if (payload.new.uid === viewingUserId) setProfile(payload.new); }).subscribe();
    return () => { supabase.removeChannel(profileSub); };
  }, [viewingUserId]);

  const fetchProfile = async () => { 
    setLoading(true); 
    const { data } = await supabase.from('profiles').select('*').eq('uid', viewingUserId).single(); 
    if (data) {
      setProfile(data);
      setEditedBio(data.bio || "");
      setEditedName(data.name || "");
    }
    setLoading(false); 
  };

  const fetchUserPosts = async () => {
    const { data: profileData } = await supabase.from('profiles').select('id').eq('uid', viewingUserId).single();
    if (profileData) {
      let { data: userPosts, error } = await supabase.from('posts').select('*').eq('author_id', profileData.id).order('created_at', { ascending: false });
      if (error && error.message.includes('video')) { const res = await supabase.from('posts').select('id, author_id, content, image, created_at').eq('author_id', profileData.id).order('created_at', { ascending: false }); userPosts = res.data; }
      if (userPosts) setPosts(userPosts);
    }
  };

  const handleUpdate = async (update: any) => { 
    setIsUpdating(true);
    const { error } = await supabase.from('profiles').update(update).eq('id', (currentUser as any).dbId); 
    if (!error) { 
      onUpdateUser(); 
      await fetchProfile(); 
    }
    setIsUpdating(false);
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-60">
        <div className="w-12 h-12 border-4 border-[#007AFF]/20 border-t-[#007AFF] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-40 animate-slide-up max-w-xl mx-auto pt-[40px]">
      <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => handleUpdate({ profile_photo: r.result as string }); r.readAsDataURL(f); } }} />
      <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => handleUpdate({ cover_photo: r.result as string }); r.readAsDataURL(f); } }} />

      <div className="relative">
        <div className="h-64 sm:h-80 w-full bg-zinc-900 relative overflow-hidden group">
          <img src={profile?.cover_photo || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1000&fit=crop'} className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black"></div>
          {isMe && <button onClick={() => coverInputRef.current?.click()} className="absolute top-6 right-6 ios-blur p-3.5 rounded-2xl border border-white/10 text-white shadow-2xl active:scale-90 opacity-0 group-hover:opacity-100 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>}
        </div>
        
        <div className="px-6 -mt-24 relative z-10 flex items-end justify-between">
          <div className="relative group">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-[32%] border-[6px] border-black overflow-hidden bg-zinc-900 shadow-2xl transition-transform active:scale-95"><img src={profile?.profile_photo} className="w-full h-full object-cover" /></div>
            {isMe && <button onClick={() => profileInputRef.current?.click()} className="absolute -bottom-2 -right-2 blue-gradient p-3.5 rounded-2xl border-[5px] border-black text-white shadow-xl active:scale-90 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg></button>}
          </div>
          <div className="pb-4 flex gap-2">
            {!isMe ? (
              <div className="flex gap-2">
                <button onClick={() => onMessageClick && onMessageClick(profile?.id)} className="bg-zinc-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-white/5 active:scale-95 transition-all shadow-xl">Message</button>
                <button className="blue-gradient text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-blue-500/20">Connect</button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-6 mt-8">
          {isEditingName ? (
            <div className="flex flex-col gap-3 animate-slide-up max-w-sm">
              <input 
                type="text" 
                value={editedName} 
                onChange={(e) => setEditedName(e.target.value)}
                className="ios-input p-4 text-2xl font-black tracking-tighter"
                placeholder="Enter Identity Name"
                autoFocus
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => { setIsEditingName(false); setEditedName(profile.name); }} 
                  className="px-4 py-2 text-[10px] font-black uppercase text-zinc-500"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => { await handleUpdate({ name: editedName }); setIsEditingName(false); }}
                  disabled={isUpdating || !editedName.trim()}
                  className="blue-gradient px-6 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-lg"
                >
                  {isUpdating ? 'Updating...' : 'Save Name'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              <h2 className="text-4xl font-black tracking-tighter text-white">{profile?.name}</h2>
              <div className="w-6 h-6 blue-gradient rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>
              </div>
              {isMe && (
                <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-600 hover:text-[#007AFF]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className="bg-zinc-900 px-4 py-1.5 rounded-full border border-white/10 text-[#007AFF] font-mono text-xs font-black uppercase tracking-widest">{profile?.uid}</span>
          </div>

          <div className="flex gap-12 mt-10 py-6 border-y border-white/5">
            <div className="flex flex-col"><span className="text-white font-black text-2xl">{posts.length}</span><span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Links</span></div>
            <div className="flex flex-col"><span className="text-white font-black text-2xl">0</span><span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Followers</span></div>
            <div className="flex flex-col"><span className="text-white font-black text-2xl">0</span><span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Network</span></div>
          </div>

          <div className="mt-8 p-8 rounded-[2.5rem] bg-[#1C1C1E]/40 border border-white/5 backdrop-blur-3xl transition-all">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] text-[#007AFF] font-black uppercase tracking-widest">Bio / Status</h4>
              {isMe && !isEditingBio && (
                <button 
                  onClick={() => setIsEditingBio(true)} 
                  className="text-[10px] text-zinc-600 hover:text-white font-black uppercase tracking-[0.2em] transition-colors"
                >
                  Modify
                </button>
              )}
            </div>
            
            {isEditingBio ? (
              <div className="space-y-4 animate-slide-up">
                <textarea 
                  value={editedBio} 
                  onChange={(e) => setEditedBio(e.target.value)}
                  className="w-full ios-input p-4 min-h-[120px] text-sm resize-none"
                  placeholder="Establish your status in the network..."
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => { setIsEditingBio(false); setEditedBio(profile.bio || ""); }} 
                    className="px-4 py-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={async () => { await handleUpdate({ bio: editedBio }); setIsEditingBio(false); }}
                    disabled={isUpdating}
                    className="blue-gradient px-6 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    {isUpdating ? 'Establishing...' : 'Confirm Bio'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-300 leading-relaxed font-medium text-base">
                {profile?.bio || "No secure bio established."}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 mt-16 space-y-6">
        <h3 className="font-black text-xs text-zinc-500 uppercase tracking-[0.5em] mb-6">Activity Feed</h3>
        <div className="grid grid-cols-1 gap-6">
          {posts.map(p => {
            const videoUrl = p.content?.startsWith('__MEDIA_VIDEO__') ? p.content.replace('__MEDIA_VIDEO__', '') : p.video;
            const displayContent = p.content?.startsWith('__MEDIA_VIDEO__') ? '' : p.content;
            return (
              <div key={p.id} className="ios-card p-6 bg-[#1C1C1E]/30 border-white/5 hover:bg-[#1C1C1E]/60 transition-all group">
                {displayContent && <p className="text-zinc-200 leading-relaxed mb-4 text-base">{displayContent}</p>}
                {(p.image || videoUrl) && <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-black">{videoUrl ? <video src={videoUrl} className="w-full h-auto max-h-96" controls /> : <img src={p.image} className="w-full h-auto max-h-96 object-contain" />}</div>}
                <div className="mt-5 flex justify-between items-center text-zinc-600"><span className="text-[10px] font-black uppercase tracking-widest">{new Date(p.created_at).toLocaleDateString()}</span></div>
              </div>
            );
          })}
        </div>
      </div>
      
      {isMe && (
        <div className="px-6 mt-12">
          <button 
            onClick={onLogout}
            className="w-full py-5 rounded-[2rem] bg-zinc-900/40 border border-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/5 transition-all font-black text-[10px] uppercase tracking-[0.3em] active:scale-95"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
