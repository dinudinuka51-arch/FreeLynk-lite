
import React from 'react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onProfileClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, onProfileClick }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] ios-blur h-[60px] flex items-center justify-between px-5 border-b border-white/5 shadow-lg">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 pink-gradient rounded-xl flex items-center justify-center font-black text-white text-xl shadow-xl shadow-pink-500/20 rotate-3">
          L
        </div>
        <span className="text-2xl font-black tracking-tighter text-white">
          freeLynk
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onLogout}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-zinc-400 active:scale-90 transition-all hover:bg-pink-500/10 hover:text-[#FF2D55]"
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
        <button 
          onClick={onProfileClick}
          className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white/10 active:scale-90 transition-all p-[1.5px] hover:border-[#FF2D55]"
        >
          <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-full h-full rounded-xl object-cover" />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
