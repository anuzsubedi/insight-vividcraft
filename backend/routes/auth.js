import express from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../config/supabaseClient.js";
import { sendVerificationEmail, sendEmailChangeNotification, sendPasswordChangeNotification } from "../utils/emailService.js";
import { generateToken, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Signup Route - Sends a 6-digit verification code
router.post("/signup", async (req, res) => {
    try {
        const { email, username, password, displayName } = req.body;

        if (!email || !username || !password || !displayName) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const normalizedEmail = email.toLowerCase();
        const normalizedUsername = username.toLowerCase();

        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .or(`email.eq.${normalizedEmail},username.eq.${normalizedUsername}`)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: "Email or username already exists" });
        }

        await supabase
            .from("email_verifications")
            .delete()
            .eq("email", normalizedEmail);

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedPassword = await bcrypt.hash(password, 10);

        const { error: insertError } = await supabase
            .from("email_verifications")
            .insert([
                {
                    email: normalizedEmail,
                    username: normalizedUsername,
                    password: hashedPassword,
                    display_name: displayName,
                    code: verificationCode,
                    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
                }
            ]);

        if (insertError) {
            return res.status(500).json({ error: "Failed to store verification data" });
        }

        await sendVerificationEmail(normalizedEmail, verificationCode);
        return res.status(200).json({ message: "Verification code sent to your email." });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Verify Email Route - Verifies the 6-digit code
router.post("/verify-email", async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ error: "Email and verification code are required" });
        }

        const normalizedEmail = email.toLowerCase();

        const { data: verificationData } = await supabase
            .from("email_verifications")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("code", code)
            .single();

        if (!verificationData) {
            return res.status(400).json({ error: "Invalid or expired verification code" });
        }

        if (new Date(verificationData.expires_at) < new Date()) {
            return res.status(400).json({ error: "Verification code has expired" });
        }

        const { data: userData, error } = await supabase
            .from("users")
            .insert([
                {
                    email: verificationData.email,
                    username: verificationData.username,
                    password_hash: verificationData.password,
                    display_name: verificationData.display_name,
                },
            ])
            .select();

        if (error) {
            return res.status(500).json({ error: "Error creating user" });
        }

        await supabase
            .from("email_verifications")
            .delete()
            .eq("email", normalizedEmail);
        return res.status(200).json({
            message: "Email verified. Account created successfully!",
            user: userData
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Login Route - Supports both email and username
router.post("/login", async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({ error: "Login credentials and password are required" });
        }

        const normalizedLogin = login.toLowerCase();

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .or(`email.eq.${normalizedLogin},username.eq.${normalizedLogin}`)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = generateToken(user);

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                userId: user.id, 
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                avatarName: user.avatar_name || "",
                isAdmin: user.is_admin || false
            }
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Request Password Reset - Sends a 6-digit code
router.post("/request-password-reset", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const normalizedEmail = email.toLowerCase();

        // Check if user exists
        const { data: user, error } = await supabase
            .from("users")
            .select("id")
            .eq("email", normalizedEmail)
            .single();

        if (error || !user) {
            return res.status(400).json({ error: "No account found with this email" });
        }

        // Delete any existing reset codes for this email
        await supabase
            .from("password_resets")
            .delete()
            .eq("email", normalizedEmail);

        // Generate new 6-digit code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Store reset code
        const { error: insertError } = await supabase
            .from("password_resets")
            .insert([
                {
                    email: normalizedEmail,
                    code: resetCode,
                    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes expiry
                }
            ]);

        if (insertError) {
            return res.status(500).json({ error: "Failed to initiate password reset" });
        }

        // Send reset code via email
        await sendVerificationEmail(normalizedEmail, resetCode);
        return res.status(200).json({ message: "Password reset code sent to your email" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Reset Password - Verifies code and updates password
router.post("/reset-password", async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: "Email, code, and new password are required" });
        }

        const normalizedEmail = email.toLowerCase();

        // Verify reset code
        const { data: resetData } = await supabase
            .from("password_resets")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("code", code)
            .single();

        if (!resetData) {
            return res.status(400).json({ error: "Invalid or expired reset code" });
        }

        if (new Date(resetData.expires_at) < new Date()) {
            return res.status(400).json({ error: "Reset code has expired" });
        }

        // Get current user data to check current password
        const { data: user } = await supabase
            .from("users")
            .select("password_hash")
            .eq("email", normalizedEmail)
            .single();

        // Check if new password matches current password
        const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
        if (isSamePassword) {
            return res.status(400).json({ error: "New password must be different from current password" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const { error: updateError } = await supabase
            .from("users")
            .update({ password_hash: hashedPassword })
            .eq("email", normalizedEmail);

        if (updateError) {
            return res.status(500).json({ error: "Failed to update password" });
        }

        // Delete reset code
        await supabase
            .from("password_resets")
            .delete()
            .eq("email", normalizedEmail);

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Validate session
router.get("/validate-session", verifyToken, async (req, res) => {
    try {
        // If verifyToken middleware passed, the token is valid
        return res.status(200).json({
            isValid: true,
            user: {
                userId: req.user.userId,
                username: req.user.username,
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('Validate Session Error:', error);
        return res.status(401).json({
            isValid: false,
            error: "Invalid session"
        });
    }
});

// Email change request - Sends verification code to new email
router.post("/request-email-change", verifyToken, async (req, res) => {
    try {
        const { newEmail } = req.body;
        const userId = req.user.userId;

        if (!newEmail) {
            return res.status(400).json({ error: "New email is required" });
        }

        const normalizedEmail = newEmail.toLowerCase();

        // Check if email is already in use
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", normalizedEmail)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: "Email is already in use" });
        }

        // Delete any existing email change verifications
        await supabase
            .from("email_changes")
            .delete()
            .eq("user_id", userId);

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Store the email change request
        const { error: insertError } = await supabase
            .from("email_changes")
            .insert([{
                user_id: userId,
                new_email: normalizedEmail,
                code: verificationCode,
                expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes expiry
            }]);

        if (insertError) {
            return res.status(500).json({ error: "Failed to initiate email change" });
        }

        // Send verification code to new email
        await sendVerificationEmail(normalizedEmail, verificationCode);

        return res.status(200).json({ message: "Verification code sent to new email" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Verify email change
router.post("/verify-email-change", verifyToken, async (req, res) => {
    try {
        const { newEmail, code } = req.body;
        const userId = req.user.userId;

        if (!newEmail || !code) {
            return res.status(400).json({ error: "Email and verification code are required" });
        }

        const normalizedEmail = newEmail.toLowerCase();

        // Verify the code
        const { data: emailChange } = await supabase
            .from("email_changes")
            .select("*")
            .eq("user_id", userId)
            .eq("new_email", normalizedEmail)
            .eq("code", code)
            .single();

        if (!emailChange) {
            return res.status(400).json({ error: "Invalid or expired verification code" });
        }

        if (new Date(emailChange.expires_at) < new Date()) {
            return res.status(400).json({ error: "Verification code has expired" });
        }

        // Get user's current email for notification
        const { data: user } = await supabase
            .from("users")
            .select("email")
            .eq("id", userId)
            .single();

        // Update user's email
        const { error: updateError } = await supabase
            .from("users")
            .update({ email: normalizedEmail })
            .eq("id", userId);

        if (updateError) {
            return res.status(500).json({ error: "Failed to update email" });
        }

        // Send notification to old email
        await sendEmailChangeNotification(user.email, normalizedEmail);

        // Clean up verification
        await supabase
            .from("email_changes")
            .delete()
            .eq("user_id", userId);

        return res.status(200).json({
            message: "Email updated successfully"
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update password
router.post("/update-password", verifyToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.userId;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: "Old and new passwords are required" });
        }

        // Get user's current password hash
        const { data: user } = await supabase
            .from("users")
            .select("password_hash, email")
            .eq("id", userId)
            .single();

        // Verify old password
        const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // Check if new password is same as old
        const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
        if (isSamePassword) {
            return res.status(400).json({ error: "New password must be different from current password" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const { error: updateError } = await supabase
            .from("users")
            .update({ password_hash: hashedPassword })
            .eq("id", userId);

        if (updateError) {
            return res.status(500).json({ error: "Failed to update password" });
        }

        // Send notification email about password change
        await sendPasswordChangeNotification(user.email);

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
