import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import { AppContextProvider } from './contexts/AppContext';
import Auth from './components/Auth';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import AddExpensePage from './pages/AddExpensePage';
import BudgetsPage from './pages/BudgetsPage';
import FriendsPage from './pages/FriendsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import Logo from './components/Logo';

/**
 * @file App.tsx
 * @description
 * This is the root component of the MyPocket application.
 * It manages:
 * 1. User authentication state (session management with Supabase).
 * 2. A simple hash-based routing system to render different pages.
 * 3. A splash screen for an improved initial loading experience.
 * 4. Wrapping the authenticated app in the main `AppContextProvider` for global state.
 */

const pages: { [key: string]: React.FC } = {
  '#_': DashboardPage,
  '#/expenses': ExpensesPage,
  '#/add': AddExpensePage,
  '#/budgets': BudgetsPage,
  '#/friends': FriendsPage,
  '#/reports': ReportsPage,
  '#/settings': SettingsPage,
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hash, setHash] = useState(window.location.hash || '#_');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Splash screen logic
    const splashTimer = setTimeout(() => {
        setShowSplash(false);
    }, 2000); // Minimum 2 seconds splash screen

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    const handleHashChange = () => setHash(window.location.hash || '#_');
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      clearTimeout(splashTimer);
      subscription.unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const ActivePage = pages[hash] || DashboardPage;

  if (loading || showSplash) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg transition-opacity duration-500 ${showSplash ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-center">
          <Logo className="h-24 w-24 mx-auto" />
          <h1 className="text-5xl font-extrabold text-brand-primary mt-4">MyPocket</h1>
          <div className="w-24 h-24 border-8 border-dashed rounded-full animate-spin border-brand-primary my-8"></div>
          <p className="text-lg font-semibold text-light-text-secondary dark:text-dark-text-secondary">Made by Mohammed Atif</p>
        </div>
      </div>
    );
  }

  return (
    <AppContextProvider session={session}>
      {!session ? (
        <Auth />
      ) : (
        <Layout>
          <ActivePage />
        </Layout>
      )}
    </AppContextProvider>
  );
};

export default App;