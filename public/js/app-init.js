/**
 * app-init.js
 * Initial authentication check for the main application.
 */
(async function () {
    console.log('[App-Init] Current URL:', window.location.href);
    const API_URL = (typeof Config !== 'undefined') ? Config.API_URL : '/api';

    // 1. Check for Token Handoff in URL Hash (Priority)
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.substring(1));

    if (hashParams.get('access_token') && hashParams.get('refresh_token')) {
        console.log('[App-Init] Tokens found in hash. Setting cookies...');
        const at = hashParams.get('access_token');
        const rt = hashParams.get('refresh_token');

        // Set cookies client-side to ensure persistence
        document.cookie = `sb-access-token=${at}; path=/; max-age=3600; SameSite=Lax`;
        document.cookie = `sb-refresh-token=${rt}; path=/; max-age=2592000; SameSite=Lax`; // 30 days

        // Clear hash to clean up URL
        window.history.replaceState(null, null, window.location.pathname);
    }

    // 2. Perform Auth Check (Now that cookies might be set)
    console.log('[App-Init] Cookies before fetch:', document.cookie);

    try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        console.log('[App-Init] /me status:', res.status);

        if (!res.ok) {
            // Not authenticated.
            // Only redirect if NOT already on an auth page or onboarding
            const path = window.location.pathname;
            const isAuthPage = path.includes('/auth');
            const isOnboarding = path.includes('/onboarding');

            if (!isAuthPage && !isOnboarding) {
                // console.log('[App-Init] No session, redirecting to /auth/');
                window.location.href = '/auth/';
            }
        } else {
            // Authenticated.
            // If user is on the auth page (login/signup), redirect them to Home
            const path = window.location.pathname;
            if (path.includes('/auth') && !path.includes('/reset-password') && !path.includes('/verify-email')) {
                window.location.href = '/';
            }
        }
    } catch (e) {
        // console.error('Auth check failed:', e);
        if (!window.location.pathname.includes('/auth')) {
            window.location.href = '/auth/';
        }
    }
})();
