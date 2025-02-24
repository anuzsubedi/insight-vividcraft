import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthState = create(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
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