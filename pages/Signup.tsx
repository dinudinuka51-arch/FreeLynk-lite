
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
    if (name.length > 2) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      setTempUid(`FL-${name.substring(0, 3).toUpperCase()}-${suffix}`);
    }
  }, [name]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              uid: tempUid,
              name: name,
              profile_photo: photo,
              bio: 'New freeLynk Member'
            },
          ]);

        if (profileError) throw profileError;

        onSignup({
          uid: tempUid,
          dbId: authData.user.id,
          name,
          email,
          profilePhoto: photo,
          joinedAt: Date.now(),
          followers: [],
          following: []
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-8 bg-black py-10 relative overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF2D55]/10 blur-[120px] rounded-full"></div>
      
      <div className="mb-10 text-center flex flex-col items-center animate-slide-up">
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-[28%] overflow-hidden border-4 border-white/10 p-1 bg-zinc-900 shadow-2xl">
            <img src={photo} alt="Identity Preview" className="w-full h-full object-cover rounded-[25%]" />
          </div>
          <label className="absolute bottom-1 right-1 pink-gradient p-2.5 rounded-full border-2 border-black cursor-pointer shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        </div>
        <h2 className="text-3xl font-black text-white">{name || 'Identity Name'}</h2>
        <span className="text-[#FF2D55] font-mono text-xs uppercase tracking-widest mt-1">UID: {tempUid}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full relative z-10">
        <input type="text" placeholder="Full Name" className="w-full ios-input p-5 h-14" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email" className="w-full ios-input p-5 h-14" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" className="w-full ios-input p-5 h-14" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        
        {error && <p className="text-[#FF2D55] text-[10px] font-black uppercase tracking-widest text-center">{error}</p>}

        <button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl pink-gradient text-white font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all">
          {isVerifying ? 'Synchronizing...' : 'Create Account'}
        </button>
      </form>

      <button onClick={onToggle} className="mt-8 text-zinc-500 text-sm font-medium w-full text-center">
        Already have an ID? <span className="text-[#FF2D55] font-black">LOGIN</span>
      </button>
    </div>
  );
};

export default Signup;
