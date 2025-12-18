
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface SearchProps {
  currentUser: User;
  onNavigateToProfile: (userId: string) => void;
}

const Search: React.FC<SearchProps> = ({ currentUser, onNavigateToProfile }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('uid', currentUser.uid)
        .or(`name.ilike.%${query}%,uid.ilike.%${query}%`)
        .limit(10);

      if (data) setResults(data);
      setLoading(false);
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [query, currentUser]);

  return (
    <div className="space-y-6 px-4 pt-20 animate-slide-up">
      <div className="relative">
        <input
          type="text"
          placeholder="Spotlight Search"
          className="w-full ios-input p-4 pl-12 h-14 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <svg className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-3 border-[#FF2D55] border-t-transparent rounded-full animate-spin"></div>}
      </div>

      <div className="space-y-2">
        {results.map(user => (
          <div key={user.uid} 
            className="ios-card p-4 flex items-center justify-between transition-all active:scale-[0.99] hover:bg-zinc-900/50">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigateToProfile(user.uid)}>
              <img src={user.profile_photo} className="w-14 h-14 rounded-full border border-white/10 object-cover" alt="" />
              <div>
                <h4 className="font-bold text-base text-white">{user.name}</h4>
                <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold">UID: {user.uid}</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigateToProfile(user.uid)}
              className="pink-gradient px-5 py-2 rounded-full text-xs font-black text-white shadow-lg active:scale-95 transition-transform">
              Visit
            </button>
          </div>
        ))}
        {query && results.length === 0 && !loading && (
          <p className="text-center text-zinc-600 text-xs py-20 uppercase tracking-[0.3em] font-black">No Link Found</p>
        )}
      </div>
    </div>
  );
};

export default Search;
