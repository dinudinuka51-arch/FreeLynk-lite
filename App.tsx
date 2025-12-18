
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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthPage, setIsAuthPage] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setIsLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setActiveTab('feed');
        setViewingUserId(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (dbId: string) => {
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
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const navigateToProfile = (uid: string) => {
    setViewingUserId(uid);
    setActiveTab('profile');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
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
    <div className="flex flex-col min-h-screen bg-black pb-20 md:pb-0">
      <Navbar 
        onLogout={handleLogout} 
        currentUser={currentUser} 
        onProfileClick={() => { setViewingUserId(currentUser.uid); setActiveTab('profile'); }} 
      />
      
      <main className="flex-grow max-w-2xl mx-auto w-full pt-4">
        {activeTab === 'feed' && (
          <Feed currentUser={currentUser} onNavigateToProfile={navigateToProfile} />
        )}
        {activeTab === 'search' && (
          <Search currentUser={currentUser} onNavigateToProfile={navigateToProfile} />
        )}
        {activeTab === 'inbox' && (
          <Inbox currentUser={currentUser} onNavigateToProfile={navigateToProfile} />
        )}
        {activeTab === 'profile' && (
          <Profile 
            currentUser={currentUser}
            viewingUserId={viewingUserId || currentUser.uid}
            onUpdateUser={() => currentUser.dbId && fetchProfile(currentUser.dbId)}
            onLogout={handleLogout}
          />
        )}
      </main>

      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;
