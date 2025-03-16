import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthState = create(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setUser: (user) => set({ 
                user: user ? {
                    ...user,
                    isAdmin: user.isAdmin || false // Ensure isAdmin is always boolean
                } : null, 
                isAuthenticated: !!user 
            }),
            logout: () => {
                localStorage.removeItem('token'); // Clear the token
                set({ user: null, isAuthenticated: false });
            },
        }),
        {
            name: 'auth-storage', // unique name for localStorage key
            getStorage: () => localStorage, // Use localStorage as storage
        }
    )
);

export default useAuthState;