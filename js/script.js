// Initialize Lucide Icons
lucide.createIcons();

let currentPage = 'feed';
const body = document.body;

// --- Theme Management ---
function getPreferredTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
    body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update icons immediately
    const iconDesktop = document.getElementById('theme-icon-desktop');
    const iconMobile = document.getElementById('theme-icon-mobile');
    const newIcon = theme === 'dark' ? 'sun' : 'moon';

    if (iconDesktop) iconDesktop.setAttribute('data-lucide', newIcon);
    if (iconMobile) iconMobile.setAttribute('data-lucide', newIcon);

    // Re-render icons if needed (required for Lucide to update the SVG)
    lucide.createIcons();
}

function toggleTheme() {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// --- Post Action Logic ---
function toggleLike(button) {
    const isLiked = button.classList.toggle('liked-active');
    const countSpan = button.querySelector('[data-count="like"]');
    let currentCount = parseInt(countSpan.textContent);

    if (isLiked) {
        countSpan.textContent = currentCount + 1;
        button.querySelector('svg').setAttribute('fill', 'currentColor');
    } else {
        countSpan.textContent = currentCount - 1;
        button.querySelector('svg').setAttribute('fill', 'none');
    }
}

function toggleBookmark(button) {
    const isBookmarked = button.classList.toggle('fill-primary');
    const countSpan = button.querySelector('[data-count="bookmark"]');
    let currentCount = parseInt(countSpan.textContent);

    if (isBookmarked) {
        countSpan.textContent = currentCount + 1;
        button.querySelector('svg').setAttribute('fill', 'currentColor');
    } else {
        countSpan.textContent = currentCount - 1;
        button.querySelector('svg').setAttribute('fill', 'none');
    }
}

// --- Load More Logic ---
function loadMorePosts() {
    const postFeed = document.getElementById('post-feed');
    const template = document.querySelector('[data-post-template]');

    if (!template) {
        console.error("Post template not found.");
        return;
    }

    for (let i = 0; i < 2; i++) {
        const newPost = template.cloneNode(true);
        newPost.removeAttribute('data-post-template');

        const contentText = newPost.querySelector('.text-main');
        if (i === 0) contentText.textContent = "Great morning hike today! Love the nature.";
        if (i === 1) contentText.textContent = "New design challenge posted! Check it out and submit your work.";

        const likeBtn = newPost.querySelector('[data-action="like"]');
        likeBtn.classList.remove('liked-active');
        likeBtn.querySelector('svg').setAttribute('fill', 'none');

        const bookmarkBtn = newPost.querySelector('[data-action="bookmark"]');
        bookmarkBtn.classList.remove('fill-primary');
        bookmarkBtn.querySelector('svg').setAttribute('fill', 'none');

        postFeed.appendChild(newPost);
    }
    setupActionListeners();
}

function loadMoreStories() {
    const storyList = document.getElementById('story-list');
    const template = document.querySelector('.story-item[data-story-template]');

    if (!template) {
        console.error("Story template not found.");
        return;
    }

    const userNames = ["Alex", "Sara", "Leo"];
    for (let i = 0; i < 3; i++) {
        const newStory = template.cloneNode(true);
        newStory.removeAttribute('data-story-template');
        newStory.querySelector('.text-xs').textContent = userNames[i];
        newStory.querySelector('img').setAttribute('src', `https://placehold.co/52x52/a7f3d0/052e16?text=${userNames[i].substring(0,2)}`);

        storyList.appendChild(newStory);
    }
    lucide.createIcons();
}
// --- Infinite Scroll Setup ---
function setupInfiniteScroll() {
    const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
    };

    // 1. Observer for POSTS (Vertical)
    const postObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    loadMorePosts();

                    const feed = document.getElementById('post-feed');
                    const sentinel = document.getElementById('post-sentinel');

                    postObserver.unobserve(entry.target);

                    feed.appendChild(sentinel);

                    postObserver.observe(sentinel);
                }, 500);
            }
        });
    }, options);

    // Start watching the post sentinel
    const postSentinel = document.getElementById('post-sentinel');
    if (postSentinel) postObserver.observe(postSentinel);

    // 2. Observer for STORIES (Horizontal)
    const storyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    loadMoreStories();
                    storyObserver.unobserve(entry.target);

                    // Move the sentinel to the very end of the list
                    const list = document.getElementById('story-list');
                    const sentinel = document.getElementById('story-sentinel');
                    list.appendChild(sentinel);

                    storyObserver.observe(sentinel);
                }, 500);
            }
        });
    }, { ...options, root: document.getElementById('story-list-container') }); // Different root for horizontal

    // Start watching the story sentinel
    const storySentinel = document.getElementById('story-sentinel');
    if (storySentinel) storyObserver.observe(storySentinel);
}

// --- Event Listener Setup ---
function setupActionListeners() {
    document.querySelectorAll('[data-action="like"]').forEach(button => {
        button.onclick = null;
        button.onclick = () => toggleLike(button);
    });

    document.querySelectorAll('[data-action="bookmark"]').forEach(button => {
        button.onclick = null;
        button.onclick = () => toggleBookmark(button);
    });

    lucide.createIcons();
}

// --- View/Modal Management ---
function setNotificationBadge(shouldShow) {
    const badge = document.getElementById('desktop-notification-badge');
    if (badge) {
        if (shouldShow) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function updateNavStyles(viewId) {
    const allNavLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    allNavLinks.forEach(link => {
        link.classList.remove('text-primary');
        link.classList.add('text-secondary');
    });

    const activeLinks = document.querySelectorAll(`[onclick="changeView('${viewId}')"]`);
    activeLinks.forEach(link => {
        link.classList.remove('text-secondary');
        link.classList.add('text-primary');
    });
}

function changeView(viewId) {
    currentPage = viewId;
    const views = document.querySelectorAll('.view-content');
    views.forEach(view => {
        view.classList.add('hidden');
    });
    document.getElementById(viewId + 'View').classList.remove('hidden');

    if (viewId === 'notifications') {
        setNotificationBadge(false);
    }

    updateNavStyles(viewId);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('overflow-hidden');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
    }
}

// --- Modal Control ---

window.showModal = function(modalId) {
    const modal = document.getElementById(modalId);
    const fab = document.getElementById('fab-mobile');
    if (!modal) return;

    modal.classList.add('active');

    if (modalId === 'createPostModal') {
        // Activate FAB rotation
        if (fab) fab.classList.add('rotate-active');

        // Add mobile slide-up transition only on small screens
        if (window.innerWidth < 768) {
            setTimeout(() => {
                modal.classList.add('mobile-launch');
            }, 10); // Short delay for CSS transition hook
        }
    }
}

window.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    const fab = document.getElementById('fab-mobile');
    if (!modal) return;

    if (modalId === 'createPostModal') {
        // Deactivate FAB rotation
        if (fab) fab.classList.remove('rotate-active');
    }

    // Remove mobile transition classes
    modal.classList.remove('mobile-launch');

    // Timeout needed to allow transition to finish before hiding
    setTimeout(() => {
        modal.classList.remove('active');
    }, 300);
}

// Initialize theme, view, and set up all event listeners on load
window.onload = () => {
    setTheme(getPreferredTheme());
    changeView(currentPage);
    setupActionListeners();
    // Simulate initial notification load
    setNotificationBadge(true);

    // ACTIVATE INFINITE SCROLL
    setupInfiniteScroll();
};
