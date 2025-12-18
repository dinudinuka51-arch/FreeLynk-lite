
import React from 'react';

interface TabBarProps {
  activeTab: 'feed' | 'search' | 'inbox' | 'profile';
  setActiveTab: (tab: 'feed' | 'search' | 'inbox' | 'profile') => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'feed' as const, icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
    ), label: 'Home' },
    { id: 'search' as const, icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
    ), label: 'Search' },
    { id: 'inbox' as const, icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
    ), label: 'Chats' },
    { id: 'profile' as const, icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
    ), label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] ios-blur border-t border-white/10 h-[84px] px-6 pb-6 flex items-center justify-between">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-0.5 transition-all duration-300 ${
              active ? 'text-[#FF2D55] scale-105' : 'text-zinc-500'
            }`}
          >
            <div className="transition-transform duration-300 active:scale-75">
              {tab.icon(active)}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-0'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default TabBar;
