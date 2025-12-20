
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface SearchProps {
  currentUser: User;
  onNavigateToProfile: (userId: string) => void;
  onOpenVoiceAssistant?: () => void;
}

const Search: React.FC<SearchProps> = ({ currentUser, onNavigateToProfile, onOpenVoiceAssistant }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'name' | 'uid'>('name');

  const showAiCard = query.toLowerCase().includes('ai') || query.toLowerCase().includes('gemini') || query.toLowerCase().includes('voice');

  useEffect(() => {
    const searchUsers = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .neq('uid', currentUser.uid)
          .filter(searchType === 'uid' ? 'uid' : 'name', 'ilike', `%${query}%`)
          .limit(10);

        if (data) setResults(data);
      } catch (e) {
        console.error("Search error", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [query, searchType, currentUser]);

  return (
    <div className="space-y-8 px-5 pt-20 animate-slide-up max-w-xl mx-auto pb-32">
      <div>
        <h2 className="text-4xl font-black text-white tracking-tighter">Explore</h2>
        <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Discover the Network</p>
      </div>

      <div className="flex gap-2 p-1.5 bg-zinc-900/60 rounded-2xl border border-white/5 backdrop-blur-xl">
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
          placeholder={searchType === 'uid' ? "Enter unique ID (e.g. FL-NAME-1234)" : "Search by name or 'AI'..."}
          className="w-full ios-input p-5 pl-14 h-16 text-lg shadow-2xl"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <svg className="w-7 h-7 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        {loading && <div className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 border-4 border-[#FF2D55] border-t-transparent rounded-full animate-spin"></div>}
      </div>

      <div className="space-y-4">
        {/* Special Gemini Assistant Card */}
        {showAiCard && (
          <div className="ios-card p-6 flex flex-col gap-4 border-pink-500/30 bg-pink-500/5 animate-slide-up shadow-xl shadow-pink-500/5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 pink-gradient rounded-3xl flex items-center justify-center shadow-lg shadow-pink-500/20">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <div>
                <h4 className="font-black text-xl text-white">Gemini Voice</h4>
                <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">Always Online Assistant</p>
              </div>
            </div>
            <button 
              onClick={onOpenVoiceAssistant}
              className="w-full py-4 pink-gradient rounded-2xl text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all"
            >
              Start Real-time Voice Chat
            </button>
          </div>
        )}

        {results.map(user => (
          <div key={user.uid} 
            className="ios-card p-5 flex items-center justify-between transition-all active:scale-[0.98] bg-[#1C1C1E]/50 hover:bg-[#1C1C1E] border-white/5 shadow-lg">
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

        {!query && (
          <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-zinc-900/50 rounded-[2.5rem] flex items-center justify-center border border-white/5">
              <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.5em] font-black">Find someone in the net</p>
          </div>
        )}
        
        {query && results.length === 0 && !loading && !showAiCard && (
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
