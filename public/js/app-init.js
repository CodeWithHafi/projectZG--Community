/**
 * app-init.js
 * Initial authentication check for the main application.
 */
(async function () {
    const API_URL = (typeof Config !== 'undefined') ? Config.API_URL : '/api';
    let initialToken = null;

    // 1. Check for Token Handoff in URL Hash (Priority)
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.substring(1));

    if (hashParams.get('access_token') && hashParams.get('refresh_token')) {
        const at = hashParams.get('access_token');
        const rt = hashParams.get('refresh_token');

        // Set cookies client-side to ensure persistence
        document.cookie = `sb-access-token=${at}; path=/; max-age=3600; SameSite=Lax`;
        document.cookie = `sb-refresh-token=${rt}; path=/; max-age=2592000; SameSite=Lax`; // 30 days

        // Sync to localStorage for API headers
        localStorage.setItem('sb-access-token', at);
        localStorage.setItem('sb-refresh-token', rt);

        initialToken = at;

        // Clear hash to clean up URL
        window.history.replaceState(null, null, window.location.pathname);
    }

    // 2. Perform Auth Check
    // If we just got a token, use it explicitly to avoid cookie race conditions

    const headers = {};

    // Check localStorage if initialToken (hash) is missing
    if (!initialToken) {
        initialToken = localStorage.getItem('sb-access-token');
    }

    if (initialToken) {
        headers['Authorization'] = `Bearer ${initialToken}`;
    }

    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include',
            headers: headers
        });

        if (!res.ok) {
            // Not authenticated.
            const path = window.location.pathname;
            const isAuthPage = path.includes('/auth');
            const isOnboarding = path.includes('/onboarding');
            const search = new URLSearchParams(window.location.search);
            const isPublicProfile = search.has('user');

            if (!isAuthPage && !isOnboarding && !isPublicProfile) {
                // Preserve query params (errors, etc) when redirecting
                const targetUrl = window.location.pathname + window.location.search;
                window.location.href = `/auth/?redirect=${encodeURIComponent(targetUrl)}`;
            }
        } else {
            // Authenticated.
            const path = window.location.pathname;
            const search = new URLSearchParams(window.location.search);

            // Redirect to home ONLY if we are NOT onboarding
            if (path.includes('/auth') && !path.includes('/reset-password') && !path.includes('/verify-email') && search.get('onboarding') !== 'true') {
                // User is already logged in and on auth page
                const urlParams = new URLSearchParams(window.location.search);
                const redirectTarget = urlParams.get('redirect') || '/';

                // Redirect immediately if already logged in
                window.location.href = redirectTarget;
            }
        }
    } catch (e) {
        if (!window.location.pathname.includes('/auth')) {
            window.location.href = '/auth/';
        }
    }
})();
