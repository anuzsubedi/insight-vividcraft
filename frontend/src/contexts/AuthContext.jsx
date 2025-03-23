import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await axios.get('http://localhost:3001/api/auth/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setUser(response.data.user);
        } catch (err) {
            console.error('Auth check failed:', err);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            setError(null);
            const response = await axios.post('http://localhost:3001/api/auth/login', {
                email,
                password
            });

            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setUser(user);
            return user;
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
            throw err;
        }
    };

    const register = async (userData) => {
        try {
            setError(null);
            const response = await axios.post('http://localhost:3001/api/auth/register', userData);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setUser(user);
            return user;
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
    };

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 