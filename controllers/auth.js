const { supabase, createAuthenticatedClient, supabaseAdmin } = require('../utils/supabaseClient');
const { uploadFile } = require('../utils/uploadHelper');
const crypto = require('crypto');
const imagekit = require('../utils/imagekit');

// - HELPER FUNCTIONS ---

const setAuthCookies = (res, session) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.VERCEL_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: (session.expires_in || 3600) * 1000
    };

    const refreshCookieOptions = {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    res.cookie('sb-access-token', session.access_token, cookieOptions);
    res.cookie('sb-refresh-token', session.refresh_token, refreshCookieOptions);
};

// Shared password reset logic
async function handlePasswordResetRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}/reset-password/update`,
    });
    if (error) throw error;
}

// --- CONTROLLER METHODS ---

const signup = async (req, res) => {
    const { email, password, username, fullName } = req.body;
    const trimmedEmail = email?.trim();
    const trimmedUsername = username?.trim();
    const trimmedFullName = fullName?.trim();

    if (!trimmedEmail || !password || !trimmedUsername) {
        return res.status(400).json({ error: 'Email, password, and username are required.' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    // Username validation
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        return res.status(400).json({ error: 'Username must be 3-30 characters.' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
    }

    // Password validation
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasLower || !hasUpper || !hasDigit || !hasSymbol) {
        return res.status(400).json({ error: 'Password must include lowercase, uppercase, number, and symbol.' });
    }

    // Full name validation
    if (trimmedFullName && trimmedFullName.length > 100) {
        return res.status(400).json({ error: 'Full name must be 100 characters or less.' });
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
                data: {
                    username: trimmedUsername,
                    full_name: trimmedFullName || ''
                }
            }
        });

        if (error) throw error;

        if (data.session) {
            setAuthCookies(res, data.session);
        }

        res.json({ message: 'Sign up successful! Please check your email.', user: data.user });
    } catch (err) {
        console.error('Signup error:', err);

        // Return generic error or map known errors to safe messages
        const userFriendlyErrors = {
            'User already registered': 'An account with this email already exists.',
            'Invalid email': 'Please provide a valid email address.',
        };

        const errorMessage = userFriendlyErrors[err.message] || 'Sign up failed. Please try again later.';
        res.status(400).json({ error: errorMessage });
    }
};

const login = async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Email/Username and password are required.' });
    }

    try {
        let emailToUse = identifier.trim();

        // Simple check for username vs email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailToUse)) {
            // It's a username. We need to resolve it to an email.
            const { supabaseAdmin } = require('../utils/supabaseClient');

            if (!supabaseAdmin) {
                return res.status(500).json({ error: 'Server configuration error: Username login unavailable.' });
            }

            // 1. Find Profile by Username
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('username', emailToUse)
                .single();

            if (profileError || !profile) {
                return res.status(401).json({ error: 'Invalid login credentials.' });
            }

            // 2. Get User Email from Auth (Admin Only)
            const { data: userAuth, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

            if (authError || !userAuth || !userAuth.user) {
                return res.status(401).json({ error: 'Invalid login credentials.' });
            }

            emailToUse = userAuth.user.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password
        });

        if (error) throw error;

        // Set HttpOnly Cookies
        setAuthCookies(res, data.session);

        res.json({ message: 'Login successful!', user: data.user, session: data.session });
    } catch (err) {
        // Log the actual error server-side for debugging
        console.error('Login error:', err);

        // Return safe, generic messages to client
        if (err.message?.includes('Invalid login credentials')) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Default to 500 for unexpected errors
        res.status(500).json({ error: 'An error occurred during login. Please try again later.' });
    }
};

const googleAuth = async (req, res) => {
    try {
        // Construct the base URL for redirection 
        // In local dev: http://localhost:3000
        // In prod: process.env.ALLOWED_ORIGIN or derived from req with whitelist check
        const rawOrigins = [
            process.env.ALLOWED_ORIGINS
        ].filter(Boolean).join(',');

        const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
        const requestOrigin = `${req.protocol}://${req.get('host')}`;

        // Check if request origin is allowed, otherwise default to first allowed
        // strip trailing slashes for comparison to be safe
        const cleanReqOrigin = requestOrigin.replace(/\/$/, '');
        let origin = allowedOrigins.find(o => o.replace(/\/$/, '') === cleanReqOrigin);

        // In development, explicitly allow localhost if it's the request origin
        if (!origin && process.env.VERCEL_ENV !== 'production' && (cleanReqOrigin.includes('localhost') || cleanReqOrigin.includes('127.0.0.1'))) {
            origin = cleanReqOrigin;
        }

        // Fallback to first allowed origin (Production behavior)
        if (!origin) {
            origin = allowedOrigins[0];
        }

        if (!origin) {
            throw new Error('ALLOWED_ORIGINS environment variable must be set');
        }

        // Use request-scoped client to handle code verifier cookie
        const supabaseClient = require('../utils/supabaseClient').createContextClient(req, res);

        if (!supabaseClient) {
            console.error('Supabase client is not initialized. Check server environment variables.');
            return res.status(500).json({ error: 'Database connection unavailable' });
        }

        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${origin}/api/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        if (error) throw error;

        if (data.url) {
            // Redirect the user to the Google OAuth consent page
            res.redirect(data.url);
        } else {
            res.status(500).json({ error: 'Failed to generate OAuth URL' });
        }

    } catch (err) {
        console.error('OAuth Error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            details: err.message,
            env_check: {
                has_origins: !!process.env.ALLOWED_ORIGINS
            }
        });
    }
};


const githubAuth = async (req, res) => {
    try {
        // Construct the base URL for redirection 
        // In local dev: http://localhost:3000
        // In prod: process.env.ALLOWED_ORIGIN or derived from req with whitelist check
        const rawOrigins = [
            process.env.ALLOWED_ORIGINS
        ].filter(Boolean).join(',');

        const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
        const requestOrigin = `${req.protocol}://${req.get('host')}`;

        // Check if request origin is allowed, otherwise default to first allowed
        // strip trailing slashes for comparison to be safe
        const cleanReqOrigin = requestOrigin.replace(/\/$/, '');
        let origin = allowedOrigins.find(o => o.replace(/\/$/, '') === cleanReqOrigin);

        // In development, explicitly allow localhost if it's the request origin
        if (!origin && process.env.VERCEL_ENV !== 'production' && (cleanReqOrigin.includes('localhost') || cleanReqOrigin.includes('127.0.0.1'))) {
            origin = cleanReqOrigin;
        }

        // Fallback to first allowed origin (Production behavior)
        if (!origin) {
            origin = allowedOrigins[0];
        }

        if (!origin) {
            throw new Error('ALLOWED_ORIGINS environment variable must be set');
        }

        // Use request-scoped client to handle code verifier cookie
        const supabaseClient = require('../utils/supabaseClient').createContextClient(req, res);

        if (!supabaseClient) {
            console.error('Supabase client is not initialized. Check server environment variables.');
            return res.status(500).json({ error: 'Database connection unavailable' });
        }

        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${origin}/api/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        if (error) throw error;

        if (data.url) {
            // Redirect the user to the GitHub OAuth consent page
            res.redirect(data.url);
        } else {
            res.status(500).json({ error: 'Failed to generate OAuth URL' });
        }

    } catch (err) {
        console.error('OAuth Error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            details: err.message,
            env_check: {
                has_origins: !!process.env.ALLOWED_ORIGINS
            }
        });
    }
};

const googleCallback = async (req, res) => {
    const { code, error, error_description } = req.query;



    if (error) {
        const description = error_description || 'Unknown error';
        console.error('[Auth-Callback] Error param:', error, description);
        return res.redirect(`/auth?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(description)}`);
    }

    if (!code) {
        console.error('[Auth-Callback] No code param');
        return res.redirect('/auth?error=no_code');
    }

    try {
        // Use request-scoped client to retrieve code verifier from cookie
        const supabaseClient = require('../utils/supabaseClient').createContextClient(req, res);

        const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('[Auth-Callback] Code Exchange Error:', error);

            // Clear any potential bad cookies
            res.clearCookie('sb-access-token', { path: '/' });
            res.clearCookie('sb-refresh-token', { path: '/' });

            // Check for specific PKCE error for better feedback
            if (error.name === 'AuthApiError' && error.message.includes('code verifier')) {
                return res.redirect(`/auth?error=${encodeURIComponent('Authentication mismatch. Please try again.')}`);
            }
            return res.redirect(`/auth?error=${encodeURIComponent(error.message)}`);
        }

        const { session } = data;

        // Check if headers are already sent
        if (res.headersSent) {
            console.error('[Auth-Callback] Headers already sent! Cannot set cookies.');
            return;
        }

        // Set HttpOnly Cookies (Server-side backup)
        // IMPORTANT: Explicitly set path: '/' so cookies are available everywhere
        setAuthCookies(res, session);

        // Check if user has completed onboarding
        // Trigger might create a profile with default username, so we check for 'gender' which is set during onboarding
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, gender')
            .eq('id', session.user.id)
            .single();



        // Construct cleanup hash for client-side token handoff
        const hash = `access_token=${session.access_token}&refresh_token=${session.refresh_token}`;

        // Ensure username is not just an empty string AND gender is valid
        const validGenders = ['male', 'female', 'other'];
        const hasValidProfile = profile &&
            profile.username &&
            profile.username.trim() !== '' &&
            validGenders.includes(profile.gender);

        if (hasValidProfile) {
            // Existing user -> Home
            res.redirect(302, `/#${hash}`);
        } else {
            // Use query param which auth.js already looks for
            res.redirect(302, `/auth?onboarding=true#${hash}`);
        }

    } catch (err) {
        console.error('[Auth-Callback] Unexpected Error:', err);
        res.redirect('/auth?error=server_error');
    }
};

const getMe = async (req, res) => {
    try {
        // 1. If authMiddleware ran, we already have the user
        if (req.user) {
            return res.json({ user: req.user });
        }

        // 2. Fallback: Parse token from Header OR Cookie (if middleware wasn't used)
        let token = req.cookies['sb-access-token'];
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated (Missing Token)' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        res.json({ user });
    } catch (err) {
        console.error('Me endpoint error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

const logout = async (req, res) => {
    try {
        // We will prioritize cookies, but also check auth header for compatibility
        let accessToken = req.cookies['sb-access-token'];

        if (!accessToken) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                accessToken = authHeader.split(' ')[1];
            }
        }

        if (!accessToken || accessToken.trim() === '') {
            // If no token, just clear cookies and return success (idempotent)
            res.clearCookie('sb-access-token');
            res.clearCookie('sb-refresh-token');
            return res.json({ message: 'Logout successful (no active session found).' });
        }

        // Sign out the user from Supabase
        const { error } = await supabase.auth.admin.signOut(accessToken);

        if (error) {
            console.error('Failed to sign out user:', error);
            // Even if upstream fails, clear local cookies
            res.clearCookie('sb-access-token');
            res.clearCookie('sb-refresh-token');
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        // Clear cookies
        res.clearCookie('sb-access-token');
        res.clearCookie('sb-refresh-token');

        res.json({ message: 'Logout successful!' });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to logout.' });
    }
};

const resetPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        await handlePasswordResetRequest(email);
        res.json({ message: 'Password reset link sent to your email.' });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(400).json({ error: 'Failed to send password reset email. Please try again.' });
    }
};

const updatePassword = async (req, res) => {
    const { password, accessToken } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'New password is required' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (!accessToken) {
        return res.status(400).json({ error: 'Access token is required' });
    }


    try {
        // Set the session with the access token from the magic link
        const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: accessToken // For password recovery, access token works
        });

        if (sessionError) throw sessionError;

        // Update the user's password
        const { data, error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) throw error;

        res.json({ message: 'Password updated successfully!' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const onboarding = async (req, res) => {
    try {
        // 1. Authenticate (Relies on authMiddleware)
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = user.id;
        const { username, gender, password } = req.body;

        // 2. Validate Inputs
        if (!username || username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password is required (min 8 characters)' });
        }

        // Get Token for RLS operations
        const token = req.cookies['sb-access-token'] ||
            (req.headers.authorization && req.headers.authorization.split(' ')[1]);

        let client = supabase;
        if (token) {
            client = await createAuthenticatedClient(token) || supabase;
        }

        // Try to fetch profile to confirm existence
        const { data: existingProfile } = await client
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (!existingProfile) {
            console.warn('Profile not found for user during onboarding. Expecting trigger creation.');
        }



        // 2.5 Check if username is taken 
        const { data: usernameCheck, error: checkError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('username', username)
            .neq('id', userId)
            .maybeSingle();

        if (checkError) {
            console.error('Username Check Error:', checkError);
            return res.status(500).json({ error: 'Failed to validate username availability' });
        }

        if (usernameCheck) {
            console.warn(`[Onboarding] Username '${username}' taken by ${usernameCheck.id} (Current User: ${userId})`);
            return res.status(409).json({ error: 'Username is already taken' });
        }

        let avatarUrl = null;

        // 3. Handle Avatar Upload
        if (req.file) {
            try {
                const uploadResult = await uploadFile(req.file, 'avatars', userId, token);
                avatarUrl = uploadResult.publicUrl;
                const { error: mediaError } = await client.from('media').insert({
                    user_id: userId,
                    bucket_name: 'avatars',
                    file_path: uploadResult.filePath,
                    file_name: uploadResult.fileName,
                    file_size: uploadResult.fileSize,
                    mime_type: uploadResult.mimeType,
                    is_public: true
                });

                if (mediaError) {
                    console.error('Media Insert Error:', mediaError);
                }

            } catch (uploadErr) {
                console.error('Avatar Upload Failed:', uploadErr);
                return res.status(500).json({ error: 'Failed to upload avatar' });
            }
        }

        // 4. Update Profile
        const updates = {
            username: username,
            gender: gender,
            updated_at: new Date()
        };

        if (avatarUrl) {
            updates.avatar_url = avatarUrl;
        }

        const { error: profileError } = await client
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (profileError) {
            // Handle unique constraint violation for username
            if (profileError.code === '23505') {
                return res.status(409).json({ error: 'Username is already taken' });
            }
            throw profileError;
        }

        // Use Admin client for password update to bypass session requirement
        // IMPORTANT: Include email to properly link email identity for OAuth users
        const { data: updateData, error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            {
                email: user.email, // Include email to ensure email identity is linked
                password: password,
                email_confirm: true // Auto-confirm email since they verified via OAuth
            }
        );

        if (passwordError) throw passwordError;

        // Re-authenticate to get a valid session (Password change invalidates old tokens)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: password
        });

        if (signInError) {
            console.warn('Onboarding Re-Auth Failed:', signInError);
            // User will be redirected to Login by frontend if session missing
        } else if (signInData.session) {
            // Use shared helper to set cookies
            setAuthCookies(res, signInData.session);
        }

        res.json({
            message: 'Profile completed successfully!',
            avatar_url: avatarUrl,
            session: signInData?.session
        });

    } catch (err) {
        console.error('Onboarding Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getImageKitAuth = (req, res) => {
    try {
        const token = req.query.token || crypto.randomUUID();
        const expire = req.query.expire || parseInt(Date.now() / 1000) + 2400; // 40 minutes from now
        const result = imagekit.getAuthenticationParameters(token, expire);
        res.json(result);
    } catch (err) {
        console.error('ImageKit Auth Error:', err);
        res.status(500).json({ error: 'Failed to generate ImageKit auth parameters' });
    }
};

module.exports = {
    signup,
    login,
    googleAuth,
    githubAuth,
    googleCallback,
    getMe,
    logout,
    resetPassword,
    updatePassword,
    onboarding,
    getImageKitAuth
};

