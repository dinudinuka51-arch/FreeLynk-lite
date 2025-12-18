
import React from 'react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onProfileClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, onProfileClick }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] ios-blur h-[60px] flex items-center justify-between px-5 border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 pink-gradient rounded-[10px] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-pink-500/20">
          F
        </div>
        <span className="text-xl font-black tracking-tighter text-white">
          freeLynk
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onLogout}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-zinc-400 active:scale-90 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
        <button 
          onClick={onProfileClick}
          className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/10 active:scale-90 transition-all p-[1.5px] hover:border-[#FF2D55]/50"
        >
          <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-full h-full rounded-full object-cover" />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
