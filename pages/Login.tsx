
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-8 bg-black overflow-hidden relative">
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#FF2D55]/10 blur-[150px] rounded-full"></div>
      
      <div className="mb-12 text-center relative z-10 animate-slide-up">
        <div className="w-24 h-24 pink-gradient rounded-[2.5rem] mx-auto mb-8 flex items-center justify-center text-white text-5xl font-black shadow-[0_0_60px_rgba(255,45,85,0.3)]">F</div>
        <h1 className="text-4xl font-black mb-3 tracking-tighter">Login</h1>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.25em] text-[10px]">freeLynk Secure Network</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full relative z-10">
        <input type="email" placeholder="Email" className="w-full ios-input p-5 h-14" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" className="w-full ios-input p-5 h-14" value={password} onChange={(e) => setPassword(e.target.value)} required />
        
        {error && <p className="text-[#FF2D55] text-[10px] text-center font-black uppercase tracking-widest">{error}</p>}

        <button type="submit" disabled={isLoggingIn} className="w-full pink-gradient p-5 h-14 rounded-2xl text-white font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all">
          {isLoggingIn ? 'Authorizing...' : 'Authorize Access'}
        </button>
      </form>

      <button onClick={onToggle} className="mt-12 text-zinc-500 text-sm font-medium w-full text-center">
        New here? <span className="text-[#FF2D55] font-black">CREATE ID</span>
      </button>
    </div>
  );
};

export default Login;
