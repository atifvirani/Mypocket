import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { Expense, Budget, Friend, Insight } from '../types';
import { runArvsEngine } from '../services/arvsEngine';

/**
 * @file AppContext.tsx
 * @description
 * This file contains the main context provider for the application, `AppContextProvider`.
 * It serves as the central hub for managing and distributing global state.
 *
 * Key Features:
 * - **Authentication State:** Manages the user's session.
 * - **Global Data Management:** Fetches, stores, and provides access to expenses, friends, insights, and budgets.
 * - **Offline-First Caching:** Implements a caching strategy using localStorage to provide an instant UI on startup and offline read access.
 * - **Performance Optimizations:**
 *   - Fetches initial data in parallel to reduce load times.
 *   - Uses `useMemo` and `useCallback` to memoize the context value and its functions, preventing unnecessary re-renders in consumer components.
 * - **ARVS Engine Integration:** Automatically runs the smart insights engine when data changes.
 * - **Theme Management:** Handles toggling between light and dark modes.
 */

// Define the shape of the data to be cached
interface CachedData {
    expenses: Expense[];
    friends: Friend[];
    insights: Insight[];
    timestamp: number;
}
const CACHE_KEY = 'myPocketDataCache';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface AppContextType {
    session: Session | null;
    expenses: Expense[];
    friends: Friend[];
    insights: Insight[];
    budgets: Budget[];
    loading: boolean;
    error: string | null;
    isOffline: boolean;
    refetchData: () => void;
    addFriend: (email: string) => Promise<void>;
    removeFriend: (id: string) => Promise<void>;
    saveBudgets: (newBudgets: Budget[]) => void;
    allCategories: string[];
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    clearLocalData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode; session: Session | null }> = ({ children, session }) => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('myPocketTheme') as 'light' | 'dark') || 'light');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Effect for Online/Offline status detection
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline',handleOffline);
        };
    }, []);


    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('myPocketTheme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light'), []);

    /**
     * Fetches all primary data for the application.
     * This function implements an offline-first strategy and parallel data fetching.
     */
    const fetchData = useCallback(async () => {
        if (!session) return;

        // --- Offline-First Caching Strategy ---
        // 1. Try to load from cache immediately for instant UI
        const cachedItem = localStorage.getItem(CACHE_KEY);
        if (cachedItem) {
            const cachedData: CachedData = JSON.parse(cachedItem);
            const isCacheValid = (Date.now() - cachedData.timestamp) < CACHE_DURATION_MS;
            if (isCacheValid || isOffline) {
                setExpenses(cachedData.expenses);
                setFriends(cachedData.friends);
                setInsights(cachedData.insights);
                setLoading(false); // UI is ready
            }
        }

        if (isOffline) {
            setError("You are offline. Showing cached data.");
            setLoading(false);
            return;
        }

        try {
            if(!cachedItem) setLoading(true); // Only show full loading state if no cache
            setError(null);
            
            // Performance: Fetch all data in parallel
            const rpcPromise = supabase.rpc('create_missing_recurring_expenses');
            const expensesPromise = supabase.from('expenses').select('*').order('created_at', { ascending: false });
            const friendsPromise = supabase.from('friends').select('*');
            const insightsPromise = supabase.from('insights').select('*').order('created_at', { ascending: false });

            const [rpcResult, expensesResult, friendsResult, insightsResult] = await Promise.all([
                rpcPromise, expensesPromise, friendsPromise, insightsPromise,
            ]);
            
            if (rpcResult.error) throw new Error(`Could not update recurring expenses: ${rpcResult.error.message}`);
            if (expensesResult.error) throw expensesResult.error;
            if (friendsResult.error) throw friendsResult.error;
            if (insightsResult.error) throw insightsResult.error;

            const fetchedExpenses = expensesResult.data || [];
            const fetchedFriends = friendsResult.data || [];
            const fetchedInsights = insightsResult.data || [];
            
            setExpenses(fetchedExpenses);
            setFriends(fetchedFriends);
            setInsights(fetchedInsights);

            // 2. Update the cache with fresh data
            const newCache: CachedData = {
                expenses: fetchedExpenses,
                friends: fetchedFriends,
                insights: fetchedInsights,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));

            const savedBudgets = localStorage.getItem('myPocketBudgets');
            if (savedBudgets) setBudgets(JSON.parse(savedBudgets));

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [session, isOffline]);

    useEffect(() => {
        if (session) {
            fetchData();
        } else {
            setExpenses([]);
            setFriends([]);
            setBudgets([]);
            setInsights([]);
            setLoading(false);
            localStorage.removeItem(CACHE_KEY); // Clear cache on logout
        }
    }, [session, fetchData]);

    // ARVS Engine effect
    useEffect(() => {
        if (session && expenses.length > 0 && !loading && !isOffline) {
            runArvsEngine(expenses, budgets, insights, session.user.id).then(newInsightsAdded => {
                if (newInsightsAdded) {
                    supabase.from('insights').select('*').order('created_at', { ascending: false })
                        .then(({ data, error }) => {
                            if (error) console.error("Failed to refetch insights:", error);
                            else if(data) setInsights(data);
                        });
                }
            });
        }
    }, [expenses, budgets, insights, session, loading, isOffline]);

    const addFriend = useCallback(async (email: string) => {
        if (!session) throw new Error("Not authenticated");
        if (isOffline) throw new Error("You are offline. Please connect to the internet to add friends.");
        const { data, error } = await supabase.from('friends').insert({ user_id: session.user.id, friend_email: email }).select();
        if (error) throw error;
        if (data) setFriends(prev => [...prev, ...data]);
    }, [session, isOffline]);

    const removeFriend = useCallback(async (id: string) => {
        if (isOffline) throw new Error("You are offline. Please connect to the internet to remove friends.");
        const { error } = await supabase.from('friends').delete().eq('id', id);
        if (error) throw error;
        setFriends(prev => prev.filter(f => f.id !== id));
    }, [isOffline]);

    const saveBudgets = useCallback((newBudgets: Budget[]) => {
        setBudgets(newBudgets);
        localStorage.setItem('myPocketBudgets', JSON.stringify(newBudgets));
    }, []);
    
    const clearLocalData = useCallback(() => {
        localStorage.removeItem('myPocketBudgets');
        localStorage.removeItem('myPocketCategories');
        localStorage.removeItem(CACHE_KEY);
        setBudgets([]);
        setExpenses([]);
        setFriends([]);
        setInsights([]);
        alert('All local and cached data has been cleared.');
    }, []);

    const allCategories = useMemo(() => [...new Set([...expenses.map(e => e.category), 'Food', 'Fuel', 'Groceries', 'Shopping'].filter(Boolean))], [expenses]);

    // useMemo and useCallback are used to prevent unnecessary re-renders in consumer components
    const value = useMemo(() => ({
        session,
        expenses,
        friends,
        insights,
        budgets,
        loading,
        error,
        isOffline,
        refetchData: fetchData,
        addFriend,
        removeFriend,
        saveBudgets,
        allCategories,
        theme,
        toggleTheme,
        clearLocalData,
    }), [session, expenses, friends, insights, budgets, loading, error, isOffline, allCategories, theme, fetchData, addFriend, removeFriend, saveBudgets, toggleTheme, clearLocalData]);


    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
};