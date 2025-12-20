
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
  onToggle: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onToggle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      if (authData.user) {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
        if (profileError) throw profileError;

        onLogin({
          uid: profile.uid,
          dbId: authData.user.id,
          name: profile.name,
          email: email,
          profilePhoto: profile.profile_photo,
          joinedAt: new Date(profile.created_at).getTime(),
          followers: [],
          following: []
        });
      }
    } catch (err: any) { setError(err.message); } 
    finally { setIsLoggingIn(false); }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-8 bg-black relative overflow-hidden">
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#007AFF]/10 blur-[150px] rounded-full"></div>
      
      <div className="mb-12 text-center animate-slide-up">
        <div className="w-20 h-20 blue-gradient rounded-[2.2rem] mx-auto mb-8 flex items-center justify-center text-white text-4xl font-black shadow-[0_0_50px_rgba(0,122,255,0.3)]">L</div>
        <h1 className="text-4xl font-black tracking-tighter text-white">freeLynk</h1>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.25em] text-[10px] mt-2">Blue Edition Secure Login</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full relative z-10">
        <input type="email" placeholder="Network Email" className="w-full ios-input p-5 h-14 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Passkey" className="w-full ios-input p-5 h-14 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-[#007AFF] text-[10px] text-center font-black uppercase tracking-widest">{error}</p>}
        <button type="submit" disabled={isLoggingIn} className="w-full blue-gradient h-14 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all">
          {isLoggingIn ? 'Verifying...' : 'Authorize Access'}
        </button>
      </form>

      <button onClick={onToggle} className="mt-12 text-zinc-500 text-xs font-bold w-full text-center uppercase tracking-widest">
        New to Network? <span className="text-[#007AFF] font-black">Register</span>
      </button>
    </div>
  );
};

export default Login;
