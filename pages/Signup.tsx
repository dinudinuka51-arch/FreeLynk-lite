
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface SignupProps {
  onSignup: (user: User) => void;
  onToggle: () => void;
  onAddUser: (user: User) => void;
  users: User[];
}

const Signup: React.FC<SignupProps> = ({ onSignup, onToggle }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState<string>('https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop');
  const [tempUid, setTempUid] = useState('FL-ID-PENDING');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (name.length > 1) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      setTempUid(`FL-${name.substring(0, 3).toUpperCase().replace(/\s/g, 'X')}-${suffix}`);
    } else { setTempUid('FL-ID-PENDING'); }
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      if (authData.user) {
        await supabase.from('profiles').insert([{ id: authData.user.id, uid: tempUid, name, profile_photo: photo, bio: 'Blue Network Member' }]);
        onSignup({ uid: tempUid, dbId: authData.user.id, name, email, profilePhoto: photo, joinedAt: Date.now(), followers: [], following: [] });
      }
    } catch (err: any) { setError(err.message); setIsVerifying(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-8 bg-black py-10 relative overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#007AFF]/10 blur-[120px] rounded-full"></div>
      
      <div className="mb-10 text-center flex flex-col items-center animate-slide-up">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-[28%] overflow-hidden border-4 border-white/10 p-1 bg-zinc-900 shadow-2xl">
            <img src={photo} className="w-full h-full object-cover rounded-[25%]" />
          </div>
          <label className="absolute bottom-1 right-1 blue-gradient p-2 rounded-full border-2 border-black cursor-pointer shadow-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tighter">{name || 'Network Identity'}</h2>
        <span className="text-[#007AFF] font-mono text-[9px] uppercase tracking-widest mt-2 font-black bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">{tempUid}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full relative z-10">
        <input type="text" placeholder="Full Identity Name" className="w-full ios-input p-5 h-14 text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Network Email" className="w-full ios-input p-5 h-14 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Create Passkey" className="w-full ios-input p-5 h-14 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {error && <p className="text-[#007AFF] text-[10px] font-black uppercase tracking-widest text-center">{error}</p>}
        <button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl blue-gradient text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all">
          {isVerifying ? 'Synchronizing...' : 'Register ID'}
        </button>
      </form>

      <button onClick={onToggle} className="mt-8 text-zinc-500 text-xs font-bold w-full text-center uppercase tracking-widest">
        Active ID? <span className="text-[#007AFF] font-black">Login</span>
      </button>
    </div>
  );
};

export default Signup;
