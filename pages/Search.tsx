
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
  const [searchType, setSearchType] = useState<'name' | 'uid'>('name');

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
        .filter(searchType === 'uid' ? 'uid' : 'name', 'ilike', `%${query}%`)
        .limit(15);

      if (data) setResults(data);
      setLoading(false);
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [query, searchType, currentUser]);

  return (
    <div className="space-y-8 px-5 pt-20 animate-slide-up max-w-xl mx-auto">
      <div>
        <h2 className="text-4xl font-black text-white">Explore</h2>
        <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Discover the Network</p>
      </div>

      <div className="flex gap-2 p-1.5 bg-zinc-900 rounded-2xl border border-white/5">
        <button 
          onClick={() => setSearchType('name')}
          className={`flex-grow py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${searchType === 'name' ? 'pink-gradient text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
        >
          People
        </button>
        <button 
          onClick={() => setSearchType('uid')}
          className={`flex-grow py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${searchType === 'uid' ? 'pink-gradient text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
        >
          UID Lookup
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder={searchType === 'uid' ? "Enter unique ID (e.g. FL-NAME-1234)" : "Search by name..."}
          className="w-full ios-input p-5 pl-14 h-16 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <svg className="w-7 h-7 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        {loading && <div className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 border-4 border-[#FF2D55] border-t-transparent rounded-full animate-spin"></div>}
      </div>

      <div className="space-y-3">
        {results.map(user => (
          <div key={user.uid} 
            className="ios-card p-5 flex items-center justify-between transition-all active:scale-[0.98] bg-[#1C1C1E]/50 hover:bg-[#1C1C1E] border-white/5">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => onNavigateToProfile(user.uid)}>
              <div className="story-ring p-[1.5px]">
                <img src={user.profile_photo} className="w-16 h-16 rounded-[22px] border-2 border-black object-cover shadow-xl" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-white leading-tight">{user.name}</h4>
                <div className="flex items-center gap-1.5 mt-1">
                   <span className="text-[9px] text-[#FF2D55] font-black uppercase tracking-widest px-2 py-0.5 bg-pink-500/10 rounded-full border border-pink-500/20">{user.uid}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => onNavigateToProfile(user.uid)}
              className="w-12 h-12 pink-gradient rounded-2xl flex items-center justify-center text-white shadow-xl active:scale-90 transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        ))}
        {query && results.length === 0 && !loading && (
          <div className="text-center py-24">
             <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             </div>
             <p className="text-zinc-600 text-xs uppercase tracking-[0.4em] font-black">Identity Not Found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
