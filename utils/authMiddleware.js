
const authMiddleware = (req, res, next) => {
    // Check if next is a function to prevent crashes
    if (typeof next !== 'function') {
        console.error('CRITICAL ERROR: authMiddleware called without a next function');

        if (res && typeof res.status === 'function') {
            return res.status(500).json({ error: 'Server Middleware Error: next() undefined' });
        }
        return;
    }

    const token = req.cookies['sb-access-token'];
    const refreshToken = req.cookies['sb-refresh-token'];

    if (token) {
        req.headers.authorization = `Bearer ${token}`;
    }
    if (refreshToken) {
        req.headers['x-refresh-token'] = refreshToken;
    }

    // Continue even if no token found (some routes might allow public access or handle 401 themselves)
    next();
};

module.exports = authMiddleware;
