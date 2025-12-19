
import React from 'react';

interface TabBarProps {
  activeTab: 'feed' | 'search' | 'inbox' | 'profile';
  setActiveTab: (tab: 'feed' | 'search' | 'inbox' | 'profile') => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'feed' as const, icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
    ), label: 'Feed' },
    { id: 'search' as const, icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
    ), label: 'Explore' },
    { id: 'inbox' as const, icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
    ), label: 'Links' },
    { id: 'profile' as const, icon: (active: boolean) => (
      <svg className="w-7 h-7" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
    ), label: 'ID' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] ios-blur border-t border-white/5 h-[85px] px-8 pb-6 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-[#FF2D55] scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            <div className="transition-transform duration-300 active:scale-75 drop-shadow-lg">
              {tab.icon(active)}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${active ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
              {tab.label}
            </span>
            {active && (
              <div className="absolute -bottom-2 w-1 h-1 bg-[#FF2D55] rounded-full shadow-[0_0_8px_#FF2D55]"></div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabBar;
