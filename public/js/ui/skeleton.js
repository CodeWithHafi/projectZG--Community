const SkeletonLoader = {
    // Inject custom styles if needed
    init() {
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .skeleton-shimmer {
                    background: linear-gradient(90deg, 
                        rgba(255,255,255,0.05) 25%, 
                        rgba(255,255,255,0.1) 37%, 
                        rgba(255,255,255,0.05) 63%
                    );
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite linear;
                }
                [data-theme="light"] .skeleton-shimmer {
                    background: linear-gradient(90deg, 
                        rgba(0,0,0,0.05) 25%, 
                        rgba(0,0,0,0.08) 37%, 
                        rgba(0,0,0,0.05) 63%
                    );
                }
            `;
            document.head.appendChild(style);
        }
    },

    getPostSkeleton(count = 2) {
        return Array(count).fill(0).map(() => `
            <div class="glass-panel p-4 mb-4 rounded-2xl animate-pulse">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="w-10 h-10 rounded-full bg-placeholder-bg skeleton-shimmer"></div>
                    <div class="flex-1 space-y-2">
                        <div class="h-4 bg-placeholder-bg rounded w-1/3 skeleton-shimmer"></div>
                        <div class="h-3 bg-placeholder-bg rounded w-1/4 skeleton-shimmer"></div>
                    </div>
                </div>
                <div class="w-full aspect-video bg-placeholder-bg rounded-xl mb-4 skeleton-shimmer"></div>
                <div class="flex space-x-6">
                    <div class="h-6 w-6 rounded bg-placeholder-bg skeleton-shimmer"></div>
                    <div class="h-6 w-6 rounded bg-placeholder-bg skeleton-shimmer"></div>
                    <div class="h-6 w-6 rounded bg-placeholder-bg skeleton-shimmer"></div>
                </div>
            </div>
        `).join('');
    },

    getUserSkeleton(count = 5) {
        return Array(count).fill(0).map(() => `
            <div class="flex items-center p-3 animate-pulse">
                <div class="w-10 h-10 rounded-full bg-placeholder-bg mr-3 skeleton-shimmer"></div>
                <div class="flex-1 space-y-2">
                    <div class="h-4 bg-placeholder-bg rounded w-1/2 skeleton-shimmer"></div>
                    <div class="h-3 bg-placeholder-bg rounded w-1/3 skeleton-shimmer"></div>
                </div>
            </div>
        `).join('');
    },

    getNotificationSkeleton(count = 5) {
        return Array(count).fill(0).map(() => `
            <div class="flex items-center p-3 glass-panel rounded-xl mb-3 animate-pulse">
                <div class="w-10 h-10 rounded-full bg-placeholder-bg mr-3 skeleton-shimmer"></div>
                <div class="flex-1 space-y-2">
                    <div class="h-4 bg-placeholder-bg rounded w-3/4 skeleton-shimmer"></div>
                    <div class="h-3 bg-placeholder-bg rounded w-1/2 skeleton-shimmer"></div>
                </div>
            </div>
        `).join('');
    },

    // For grid layout (Trending)
    getGridSkeleton(count = 9) {
        return Array(count).fill(0).map(() => `
            <div class="aspect-square bg-placeholder-bg rounded-lg skeleton-shimmer animate-pulse"></div>
        `).join('');
    }
};

// Auto-init styles
SkeletonLoader.init();
