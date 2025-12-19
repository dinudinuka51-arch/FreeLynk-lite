
import React, { useState, useEffect } from 'react';
import { User } from './types';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Feed from './pages/Feed';
import Search from './pages/Search';
import Inbox from './pages/Inbox';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import TabBar from './components/TabBar';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'search' | 'inbox' | 'profile'>('feed');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthPage, setIsAuthPage] = useState<'login' | 'signup'>('login');
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err: any) {
        console.error("Initialization error:", err);
        setInitError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setActiveTab('feed');
        setViewingUserId(null);
        setSelectedChatUserId(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (dbId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', dbId)
        .single();

      if (data && !error) {
        setCurrentUser({
          uid: data.uid,
          dbId: data.id,
          name: data.name,
          email: '',
          profilePhoto: data.profile_photo,
          coverPhoto: data.cover_photo,
          bio: data.bio,
          joinedAt: new Date(data.created_at).getTime(),
          followers: [],
          following: []
        });
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const navigateToProfile = (uid: string) => {
    setViewingUserId(uid);
    setActiveTab('profile');
  };

  const navigateToChat = (userId: string) => {
    setSelectedChatUserId(userId);
    setActiveTab('inbox');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#FF2D55]/20 border-t-[#FF2D55] rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Syncing Identity</p>
      </div>
    );
  }

  if (initError && !currentUser) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-[#FF2D55] text-xl font-black mb-2">Network Error</h2>
        <p className="text-zinc-500 text-sm mb-6">{initError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="pink-gradient px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs text-white"
        >
          Reconnect
        </button>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="bg-black min-h-screen">
        {isAuthPage === 'login' ? (
          <Login 
            onLogin={(user) => setCurrentUser(user)} 
            onToggle={() => setIsAuthPage('signup')} 
          />
        ) : (
          <Signup 
            onSignup={(user) => setCurrentUser(user)} 
            onToggle={() => setIsAuthPage('login')}
            onAddUser={() => {}} 
            users={[]}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black pb-20 md:pb-0 overflow-x-hidden">
      <Navbar 
        onLogout={handleLogout} 
        currentUser={currentUser} 
        onProfileClick={() => { setViewingUserId(currentUser.uid); setActiveTab('profile'); }} 
      />
      
      <main className="flex-grow max-w-2xl mx-auto w-full pt-[60px]">
        {activeTab === 'feed' && (
          <Feed currentUser={currentUser} onNavigateToProfile={navigateToProfile} />
        )}
        {activeTab === 'search' && (
          <Search currentUser={currentUser} onNavigateToProfile={navigateToProfile} />
        )}
        {activeTab === 'inbox' && (
          <Inbox 
            currentUser={currentUser} 
            onNavigateToProfile={navigateToProfile} 
            initialChatUserId={selectedChatUserId}
            onClearInitialChat={() => setSelectedChatUserId(null)}
          />
        )}
        {activeTab === 'profile' && (
          <Profile 
            currentUser={currentUser}
            viewingUserId={viewingUserId || currentUser.uid}
            onUpdateUser={() => currentUser.dbId && fetchProfile(currentUser.dbId)}
            onLogout={handleLogout}
            onMessageClick={navigateToChat}
          />
        )}
      </main>

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;
