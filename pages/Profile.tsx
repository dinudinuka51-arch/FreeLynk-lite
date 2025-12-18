
import React, { useRef, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import AIEditor from '../components/AIEditor';

interface ProfileProps {
  currentUser: User;
  viewingUserId: string;
  onUpdateUser: () => void;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ currentUser, viewingUserId, onUpdateUser, onLogout }) => {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAIEditor, setShowAIEditor] = useState<'profile' | 'cover' | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isMe = currentUser.uid === viewingUserId;

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
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
      setShowAIEditor(null);
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
      <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'profile')} />
      <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'cover')} />

      {showAIEditor && (
        <AIEditor 
          currentUser={currentUser} 
          type={showAIEditor} 
          onClose={() => setShowAIEditor(null)} 
          onSave={(photo) => handleUpdate(showAIEditor === 'profile' ? { profile_photo: photo } : { cover_photo: photo })} 
        />
      )}

      {/* Profile Header */}
      <div className="relative">
        <div className="h-60 sm:h-72 w-full bg-zinc-900 relative overflow-hidden">
          <img src={profile.cover_photo || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&fit=crop'} className="w-full h-full object-cover opacity-70" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black"></div>
          {isMe && (
            <div className="absolute bottom-6 right-6 flex gap-3">
              <button onClick={() => setShowAIEditor('cover')} className="ios-blur p-3 rounded-2xl border border-white/10 text-[#FF2D55] shadow-2xl active:scale-90 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </button>
            </div>
          )}
        </div>
        
        <div className="px-6 -mt-20 relative z-10 flex items-end justify-between">
          <div className="relative group">
            <div className="w-32 h-32 sm:w-40 sm:h-40 squircle-lg border-[6px] border-black overflow-hidden bg-zinc-900 shadow-2xl transition-transform active:scale-95">
              <img src={profile.profile_photo} className="w-full h-full object-cover rounded-[28%]" alt="" />
            </div>
            {isMe && (
              <button onClick={() => setShowAIEditor('profile')} className="absolute -bottom-2 -right-2 pink-gradient p-3 rounded-full border-[5px] border-black text-white shadow-xl active:scale-90 transition-all">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
              </button>
            )}
          </div>
          
          <div className="pb-4">
            {isMe ? (
              <button onClick={() => {
                const n = prompt("New Display Name?", profile.name);
                if(n) handleUpdate({name: n});
              }} className="bg-white text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl">
                Edit ID
              </button>
            ) : (
              <button className="pink-gradient text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-pink-500/30">
                Sync Link
              </button>
            )}
          </div>
        </div>

        <div className="px-6 mt-6">
          <div className="flex items-center gap-2">
            <h2 className="text-4xl font-black tracking-tighter text-white">{profile.name}</h2>
            <div className="w-5 h-5 bg-[#FF2D55] rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>
            </div>
          </div>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
            <span className="bg-zinc-900 px-3 py-1 rounded-full border border-white/5">{profile.uid}</span>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Live Connection
          </p>
          
          {/* Stats Bar */}
          <div className="flex gap-10 mt-8 py-4 border-y border-white/5">
            <div className="flex flex-col">
              <span className="text-white font-black text-lg">{posts.length}</span>
              <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Shared Links</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-lg">482</span>
              <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Connectors</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-lg">1.2K</span>
              <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Network Hits</span>
            </div>
          </div>

          <div className="mt-8 p-6 rounded-[2rem] bg-zinc-900/30 border border-white/5 backdrop-blur-md">
            <h4 className="text-[9px] text-pink-500 font-black uppercase tracking-widest mb-3">Public Identity Bio</h4>
            <p className="text-zinc-300 leading-relaxed font-medium text-[15px]">
              {profile.bio || "No public bio established for this secure identity."}
              {isMe && (
                <button onClick={() => {
                  const b = prompt("Update Bio?", profile.bio);
                  if(b !== null) handleUpdate({bio: b});
                }} className="ml-3 text-white hover:text-pink-500 transition-colors text-[10px] font-black underline underline-offset-4 decoration-pink-500">Modify</button>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Content Feed */}
      <div className="px-6 mt-12 space-y-6">
        <h3 className="font-black text-xs text-zinc-500 uppercase tracking-[0.4em] mb-4">Transmission History</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {posts.map(p => (
            <div key={p.id} className="ios-card p-5 bg-zinc-900/20 border-white/5 group hover:bg-zinc-900/40 transition-all">
               <p className="text-zinc-200 leading-[1.6] mb-4 font-medium">{p.content}</p>
               {p.image && (
                 <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-black">
                    <img src={p.image} className="w-full h-auto max-h-80 object-contain mx-auto transition-transform group-hover:scale-105" />
                 </div>
               )}
               <div className="mt-4 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{new Date(p.created_at).toLocaleDateString()}</span>
                  <div className="flex gap-4">
                     <svg className="w-4 h-4 text-[#FF2D55]" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
                     <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </div>
               </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div className="text-center py-20 bg-zinc-900/10 rounded-[2.5rem] border border-dashed border-white/5">
              <p className="font-black uppercase tracking-[0.5em] text-[9px] text-zinc-700">No Recorded Activity</p>
            </div>
          )}
        </div>
      </div>
      
      {isMe && (
        <div className="px-6 mt-20">
           <button onClick={onLogout} className="w-full py-5 rounded-3xl bg-zinc-900/50 border border-red-500/10 text-red-500/50 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 font-black text-xs uppercase tracking-[0.3em] active:scale-95 transition-all">
             Disconnect Identity
           </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
