
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
  
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isMe = currentUser.uid === viewingUserId;

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();

    const profileSub = supabase
      .channel('profile_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new.uid === viewingUserId) setProfile(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(profileSub); };
  }, [viewingUserId]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('uid', viewingUserId).single();
    if (data) setProfile(data);
    setLoading(false);
  };

  const fetchUserPosts = async () => {
    const { data: profileData } = await supabase.from('profiles').select('id').eq('uid', viewingUserId).single();
    if (profileData) {
      const { data: userPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', profileData.id)
        .order('created_at', { ascending: false });
      if (userPosts) setPosts(userPosts);
    }
  };

  const handleUpdate = async (update: any) => {
    const { error } = await supabase.from('profiles').update(update).eq('id', (currentUser as any).dbId);
    if (!error) {
      onUpdateUser();
      fetchProfile();
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        handleUpdate(type === 'profile' ? { profile_photo: result } : { cover_photo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-60">
        <div className="w-12 h-12 border-4 border-[#FF2D55]/20 border-t-[#FF2D55] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-40 animate-slide-up max-w-xl mx-auto pt-[40px]">
      {aiEditorState.isOpen && (
        <AIEditor 
          currentUser={currentUser} 
          type={aiEditorState.type} 
          onClose={() => setAiEditorState({ ...aiEditorState, isOpen: false })}
          onSave={(photo) => {
            handleUpdate(aiEditorState.type === 'profile' ? { profile_photo: photo } : { cover_photo: photo });
            setAiEditorState({ ...aiEditorState, isOpen: false });
          }}
        />
      )}

      <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'profile')} />
      <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'cover')} />

      <div className="relative">
        <div className="h-64 sm:h-80 w-full bg-zinc-900 relative overflow-hidden group">
          <img src={profile.cover_photo || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1000&fit=crop'} className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black"></div>
          {isMe && (
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => setAiEditorState({ isOpen: true, type: 'cover' })} className="ios-blur p-3.5 rounded-2xl border border-pink-500/30 text-pink-500 shadow-2xl active:scale-90 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </button>
              <button onClick={() => coverInputRef.current?.click()} className="ios-blur p-3.5 rounded-2xl border border-white/10 text-white shadow-2xl active:scale-90 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </button>
            </div>
          )}
        </div>
        
        <div className="px-6 -mt-24 relative z-10 flex items-end justify-between">
          <div className="relative group">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-[32%] border-[6px] border-black overflow-hidden bg-zinc-900 shadow-2xl transition-transform active:scale-95">
              <img src={profile.profile_photo} className="w-full h-full object-cover" />
            </div>
            {isMe && (
              <div className="absolute -bottom-2 -right-2 flex flex-col gap-2">
                <button onClick={() => setAiEditorState({ isOpen: true, type: 'profile' })} className="pink-gradient p-3.5 rounded-2xl border-[5px] border-black text-white shadow-xl active:scale-90 transition-all">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </button>
                <button onClick={() => profileInputRef.current?.click()} className="bg-zinc-800 p-2.5 rounded-xl border-2 border-black text-white shadow-lg active:scale-90 transition-all">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                </button>
              </div>
            )}
          </div>
          
          <div className="pb-4 flex gap-2">
            {isMe ? (
              <button onClick={() => {
                const n = prompt("New Display Name?", profile.name);
                if(n) handleUpdate({name: n});
              }} className="bg-white text-black px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl">
                Update Identity
              </button>
            ) : (
              <>
                <button 
                  onClick={() => onMessageClick && onMessageClick(profile.id)}
                  className="bg-zinc-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-white/5 active:scale-95 transition-all shadow-xl"
                >
                  Message
                </button>
                <button className="pink-gradient text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-pink-500/20">
                  Connect
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-6 mt-8">
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-black tracking-tighter text-white">{profile.name}</h2>
            <div className="w-6 h-6 pink-gradient rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30">
              <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="bg-zinc-900 px-4 py-1.5 rounded-full border border-white/10 text-[#FF2D55] font-mono text-xs font-black uppercase tracking-widest">{profile.uid}</span>
          </div>
          
          <div className="flex gap-12 mt-10 py-6 border-y border-white/5">
            <div className="flex flex-col">
              <span className="text-white font-black text-2xl">{posts.length}</span>
              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Links</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-2xl">0</span>
              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Followers</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-2xl">0</span>
              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Network</span>
            </div>
          </div>

          <div className="mt-8 p-8 rounded-[2.5rem] bg-[#1C1C1E]/40 border border-white/5 backdrop-blur-3xl">
            <h4 className="text-[10px] text-[#FF2D55] font-black uppercase tracking-widest mb-4">Bio / Status</h4>
            <p className="text-zinc-300 leading-relaxed font-medium text-base">
              {profile.bio || "No secure bio established."}
              {isMe && (
                <button onClick={() => {
                  const b = prompt("Update Bio?", profile.bio);
                  if(b !== null) handleUpdate({bio: b});
                }} className="ml-4 text-white hover:text-[#FF2D55] transition-all text-xs font-black underline underline-offset-8 decoration-[#FF2D55]/30">Edit</button>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-16 space-y-6">
        <h3 className="font-black text-xs text-zinc-500 uppercase tracking-[0.5em] mb-6">Activity Feed</h3>
        <div className="grid grid-cols-1 gap-6">
          {posts.map(p => (
            <div key={p.id} className="ios-card p-6 bg-[#1C1C1E]/30 border-white/5 hover:bg-[#1C1C1E]/60 transition-all group">
               <p className="text-zinc-200 leading-relaxed mb-4 text-base">{p.content}</p>
               {(p.image || p.video) && (
                 <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-black">
                    {p.image ? <img src={p.image} className="w-full h-auto max-h-96 object-contain" /> : <video src={p.video} className="w-full h-auto max-h-96" controls />}
                 </div>
               )}
               <div className="mt-5 flex justify-between items-center text-zinc-600">
                  <span className="text-[10px] font-black uppercase tracking-widest">{new Date(p.created_at).toLocaleDateString()}</span>
               </div>
            </div>
          ))}
        </div>
      </div>
      
      {isMe && (
        <div className="px-6 mt-20">
           <button onClick={onLogout} className="w-full py-6 rounded-[2rem] bg-zinc-900/40 border border-pink-500/20 text-pink-500/70 hover:text-[#FF2D55] hover:bg-pink-500/10 font-black text-xs uppercase tracking-[0.4em] active:scale-95 transition-all">
             Terminate Connection
           </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
