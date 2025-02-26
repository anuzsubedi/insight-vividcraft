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
import UserProfile from "./pages/UserProfile";
import NewPost from "./pages/NewPost";
import MyPosts from "./pages/MyPosts";
import EditPost from "./pages/EditPost"; // Add this import
import AuthProvider from "./components/AuthProvider";

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
            <Route path="/:username" element={<UserProfile />} />
            <Route path="/posts/new" element={<NewPost />} />
            <Route path="/my-posts" element={<MyPosts />} />
            <Route path="/posts/:slug/edit" element={<EditPost />} />{" "}
            {/* Add this route */}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
