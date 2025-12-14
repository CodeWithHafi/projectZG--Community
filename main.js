require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

// Middleware
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Trust Proxy for Vercel (Ensure req.protocol is 'https')
app.enable('trust proxy');

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests) only if you specifically want to.
        if (!origin) {
            return callback(null, true);
        }

        const isDev = process.env.NODE_ENV !== 'production';

        // In dev, usually we want to allow localhost.
        // We can add localhost to the list dynamically or just check it.

        if (isDev && (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn('CORS Blocked Origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token']
}));

// Content Security Policy
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://vercel.live https://*.vercel.app",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "img-src 'self' data: https: blob:",
        "media-src 'self' data: blob: https:",
        "connect-src 'self' https://*.supabase.co https://unpkg.com https://vercel.live https://*.vercel.app wss://ws-us3.pusher.com https://sockjs-us3.pusher.com",
        "frame-src 'self' https://vercel.live",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; '));

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
});

app.use(express.json());

// Serve static files from 'public' directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Explicit root handler for Vercel
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/index.html'));
});

// Auth Pages (catch all auth-related routes and serve the SPA)
const authPagePath = path.join(process.cwd(), 'public/auth/index.html');

const authHandler = (req, res) => res.sendFile(authPagePath);

app.get([
    '/auth', '/auth/*path',
    '/reset-password', '/reset-password/*path',
    '/verify-email', '/verify-email/*path',
    '/onboarding', '/onboarding/*path'
], authHandler);

// API Routes
app.use('/api/auth', require('./api/auth/index'));
app.use('/api', require('./api/profile/index'));

// 500 Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (req.path.startsWith('/api')) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.status(500).redirect('/error/?code=500');
});

// 404 Handler - For any other route not matched above
app.use((req, res, next) => {
    // If it's an API request, return JSON
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Otherwise serve the error page
    res.status(404).sendFile(path.join(process.cwd(), 'public/error/index.html'));
});


// Only listen if run directly (local dev), otherwise export for Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
