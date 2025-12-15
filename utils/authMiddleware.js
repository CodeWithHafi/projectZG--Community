
const authMiddleware = (req, res, next) => {
    // Check if next is a function to prevent crashes
    if (typeof next !== 'function') {
        console.error('CRITICAL ERROR: authMiddleware called without a next function');

        if (res && typeof res.status === 'function') {
            return res.status(500).json({ error: 'Server Middleware Error: next() undefined' });
        }
        return;
    }

    const token = (req.headers.authorization && req.headers.authorization.split(' ')[1]) ||
        req.cookies['sb-access-token'];

    if (!token) {
        // Debug: Check if we are in a route that might not need auth or if it's missing
        // For now, if no token, we can't set req.user. 
        // Most controllers crash without it, so we should probably 401 here 
        // OR set req.user to null and let controller handle it.
        // Given the crash, strict auth seems expected for these routes.
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Import supabase here to avoid circular dependency issues if any, 
    // though usually safe at top. Ideally move import to top.
    const { supabase } = require('./supabaseClient');

    supabase.auth.getUser(token).then(({ data, error }) => {
        if (error || !data.user) {
            console.error('Auth Middleware Verification Failed:', error ? error.message : 'No user');

            // If the user doesn't exist (e.g. deleted from DB but token remains) OR token is expired/invalid, clear cookies
            if (res.cookies && (res.cookies['sb-access-token'] || res.cookies['sb-refresh-token'])) {
                res.clearCookie('sb-access-token', { path: '/' });
                res.clearCookie('sb-refresh-token', { path: '/' });
            }
            return res.status(401).json({ error: 'Unauthorized: Invalid token or user check failed' });
        }

        req.user = data.user;
        next();
    }).catch(err => {
        // Specific handling for JWT expiry/invalid signature which might throw instead of returning data.error (depending on supabase version)
        if (err.message && (err.message.includes('expired') || err.message.includes('invalid JWT'))) {
            if (res.cookies && (res.cookies['sb-access-token'] || res.cookies['sb-refresh-token'])) {
                res.clearCookie('sb-access-token', { path: '/' });
                res.clearCookie('sb-refresh-token', { path: '/' });
            }
            return res.status(401).json({ error: 'Unauthorized: Token expired' });
        }

        console.error('Auth Middleware Exception:', err);
        res.status(500).json({ error: 'Internal Server Error during auth' });
    });
};

module.exports = authMiddleware;
