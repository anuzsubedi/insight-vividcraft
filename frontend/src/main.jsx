import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import theme from "./theme";
import App from "./App";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import NewPost from "./pages/NewPost";
import MyPosts from "./pages/MyPosts";
import EditPost from "./pages/EditPost";
import ViewPost from "./pages/ViewPost";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import UserNotFound from "./pages/UserNotFound";
import Search from "./pages/Search";
import AuthProvider from "./components/AuthProvider";
import AdminPage from "./pages/AdminPage";
import AdminRoute from "./components/AdminRoute";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/user/:username" element={<Profile />} />
            <Route path="/posts/new" element={<NewPost />} />
            <Route path="/my-posts" element={<MyPosts />} />
            <Route path="/posts/:id" element={<ViewPost />} />
            <Route path="/posts/:id/edit" element={<EditPost />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/search" element={<Search />} />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              } 
            />
            <Route path="/user-not-found" element={<UserNotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
