/**
 * layout.js - Self-contained Header & Footer for Auth Pages
 * 
 * This is a single file that provides both header and footer.
 * Just include this file - no need for separate header.js or footer.js.
 * 
 * Usage:
 *   1. Include header.css and footer.css in your HTML
 *   2. Include this script at the end of body
 *   3. It auto-initializes on DOMContentLoaded
 */

(function () {
    // Configuration
    let config = {
        basePath: '../',
        currentPage: 'signin'
    };

    // Detect current page from URL
    function detectCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('reset-password/update')) return 'update';
        if (path.includes('reset-password')) return 'reset';
        if (path.includes('verify-email')) return 'verify';
        if (path.includes('auth')) return 'signin';
        return 'signin';
    }

    // Detect basePath from script location
    function detectBasePath() {
        const scripts = document.querySelectorAll('script[src*="layout.js"]');
        if (scripts.length > 0) {
            const src = scripts[0].getAttribute('src');
            const depth = (src.match(/\.\.\//g) || []).length;
            return '../'.repeat(depth) || '../';
        }
        return '../';
    }

    // Create Header HTML
    function createHeader() {
        const page = config.currentPage;

      
        return `
        <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 py-3 px-6 transition-all duration-300 md:px-3 md:py-2">
            <div class="max-w-7xl mx-auto flex justify-between items-center">
                <a href="${config.basePath}" class="flex items-center gap-2 no-underline text-primary font-extrabold text-xl transition-opacity duration-200 hover:opacity-80 md:text-base md:gap-1.5">
                    <img src="${config.basePath}img/ico/icons8-dev-community-color-48.png" alt="ProjectZG Logo" class="w-8 h-8 md:w-6 md:h-6">
                    <span>ProjectZG</span>
                </a>
                <nav class="flex items-center gap-6 md:gap-3">
                    <a href="${config.basePath}auth/" class="text-gray-500 no-underline text-sm font-medium transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 md:text-xs ${page === 'signin' || page === 'signup' ? 'text-primary' : ''}">Sign In</a>
                    <a href="${config.basePath}" class="text-gray-500 no-underline text-sm font-medium transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 md:text-xs">Home</a>
                    <a href="#" class="text-gray-500 no-underline text-sm font-medium transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 md:text-xs">About</a>
                </nav>
            </div>
        </header>
        `;
    }

    // Create Footer HTML
    function createFooter() {
        const year = new Date().getFullYear();
        
        return `
        <footer class="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 py-4 px-6 md:py-2 md:px-3 md:border-none">
            <div class="w-full mx-auto flex flex-col items-center gap-3 md:gap-2">
                <div class="flex gap-4 md:gap-2">
                    <a href="https://github.com/CodeWithHafi" target="_blank" rel="noopener noreferrer" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 no-underline transition-all duration-200 hover:bg-primary hover:text-white hover:-translate-y-0.5 md:w-6 md:h-6 md:text-[0.7rem]" title="GitHub">
                        <i class="fab fa-github"></i>
                    </a>
                    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 no-underline transition-all duration-200 hover:bg-primary hover:text-white hover:-translate-y-0.5 md:w-6 md:h-6 md:text-[0.7rem]" title="Twitter">
                        <i class="fab fa-twitter"></i>
                    </a>
                    <a href="https://discord.com" target="_blank" rel="noopener noreferrer" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 no-underline transition-all duration-200 hover:bg-primary hover:text-white hover:-translate-y-0.5 md:w-6 md:h-6 md:text-[0.7rem]" title="Discord">
                        <i class="fab fa-discord"></i>
                    </a>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 no-underline transition-all duration-200 hover:bg-primary hover:text-white hover:-translate-y-0.5 md:w-6 md:h-6 md:text-[0.7rem]" title="LinkedIn">
                        <i class="fab fa-linkedin-in"></i>
                    </a>
                </div>
                <div class="flex flex-wrap justify-center gap-4 md:gap-2">
                    <a href="#" class="text-gray-500 no-underline text-xs transition-colors duration-200 hover:text-primary md:text-[0.6rem]">Privacy Policy</a>
                    <a href="#" class="text-gray-500 no-underline text-xs transition-colors duration-200 hover:text-primary md:text-[0.6rem]">Terms of Service</a>
                    <a href="#" class="text-gray-500 no-underline text-xs transition-colors duration-200 hover:text-primary md:text-[0.6rem]">Community Guidelines</a>
                    <a href="#" class="text-gray-500 no-underline text-xs transition-colors duration-200 hover:text-primary md:text-[0.6rem]">Help & Support</a>
                    <a href="#" class="text-gray-500 no-underline text-xs transition-colors duration-200 hover:text-primary md:text-[0.6rem]">Contact Us</a>
                </div>
                <p class="text-gray-400 text-[0.7rem] text-center md:text-[0.6rem] md:mt-1">© ${year} ProjectZG. All rights reserved.</p>
            </div>
        </footer>
        `;
    }

    // Initialize layout
    function init() {
        config.basePath = detectBasePath();
        config.currentPage = detectCurrentPage();

        // Add class to body for padding adjustments
        document.body.classList.add('has-auth-layout');

        // Insert header at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', createHeader());

        // Insert footer before scripts
        const scripts = document.body.querySelectorAll('script');
        if (scripts.length > 0) {
            scripts[0].insertAdjacentHTML('beforebegin', createFooter());
        } else {
            document.body.insertAdjacentHTML('beforeend', createFooter());
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
