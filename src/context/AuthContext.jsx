import React, { createContext, useState, useEffect, useContext } from 'react';
import { USERS } from '../users';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for saved user in localStorage (Remember Me)
        const savedUser = localStorage.getItem('exam_tracker_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        } else {
            // Check session storage (for non-remember me sessions that persist on refresh)
            const sessionUser = sessionStorage.getItem('exam_tracker_user');
            if (sessionUser) {
                setUser(JSON.parse(sessionUser));
            }
        }
        setLoading(false);
    }, []);

    const login = (username, password, remember) => {
        const validUser = USERS.find(u => u.username === username && u.password === password);
        if (validUser) {
            const userData = { username: validUser.username };
            setUser(userData);

            if (remember) {
                localStorage.setItem('exam_tracker_user', JSON.stringify(userData));
            } else {
                sessionStorage.setItem('exam_tracker_user', JSON.stringify(userData));
            }
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('exam_tracker_user');
        sessionStorage.removeItem('exam_tracker_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
