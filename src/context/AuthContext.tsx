import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { supabase } from '../config/supabase';
import type { User, AuthError, AuthTokenResponsePassword } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ data?: AuthTokenResponsePassword['data']; error?: AuthError | { message: string } }>;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabase) return;
        // Check active sessions and subscribe to auth changes
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        if (!supabase) return { error: { message: "Supabase not initialized" } };
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) return { error };
        return { data };
    };

    const logout = async () => {
        if (supabase) await supabase.auth.signOut();
    };

    const value = useMemo(() => ({
        user,
        login,
        logout,
        loading
    }), [user, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
