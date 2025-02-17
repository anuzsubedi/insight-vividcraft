import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
    },
    debug: true, // Enable debug logging
    connectionTimeout: 10000, // 10 seconds
});

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.log("SMTP connection error:", error);
    } else {
        console.log("Server is ready to take our messages");
    }
});

export const sendVerificationEmail = async (email, code) => {
    try {
        const mailOptions = {
            from: '"Insight Team" <insight@anuz.dev>',
            to: email,
            subject: "Verify Your Email - Insight",
            html: `
                <h1>Email Verification</h1>
                <p>Your verification code is:</p>
                <h2 style="font-size: 24px; letter-spacing: 2px; color: #4CAF50;">${code}</h2>
                <p>This code will expire in 15 minutes.</p>
                <p>If you didn't request this verification, please ignore this email.</p>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Verification email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("Email sending error:", error);
        throw error;
    }
};
