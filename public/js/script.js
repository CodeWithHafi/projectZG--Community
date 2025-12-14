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

// --- API Helpers ---
const API_URL = (typeof Config !== 'undefined') ? Config.API_URL : '/api';

let supabase = null;

async function initializeSupabase() {
    try {
        const res = await fetch(`${API_URL}/config`);
        if (!res.ok) throw new Error('Failed to load config');
        const config = await res.json();

        if (typeof createClient !== 'undefined') {
            supabase = createClient(config.supabaseUrl, config.supabaseKey);
        } else if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
        }
    } catch (err) {
        console.error('Supabase Init Error:', err);
    }
}

function getHeaders() {
    const token = localStorage.getItem('sb-access-token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// --- Post Action Logic ---
async function toggleLike(button, postId) {
    if (!currentUser) {
        showModal('authModal');
        return;
    }
    if (!postId) return;

    // Optimistic UI Update
    const isLiked = button.classList.toggle('liked-active');
    const countSpan = button.querySelector('[data-count="like"]');
    let currentCount = parseInt(countSpan.textContent) || 0;

    // Update Icon & Count
    const icon = button.querySelector('svg');
    if (isLiked) {
        countSpan.textContent = currentCount + 1;
        if (icon) icon.setAttribute('fill', 'currentColor');
    } else {
        countSpan.textContent = Math.max(0, currentCount - 1);
        if (icon) icon.setAttribute('fill', 'none');
    }

    // API Call
    try {
        await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include'
        });
    } catch (err) {
        console.error('Like action failed:', err);
    }
}

async function toggleBookmark(button, postId) {
    if (!currentUser) {
        showModal('authModal');
        return;
    }
    if (!postId) return;

    const isBookmarked = button.classList.toggle('text-primary'); // Using text-primary for bookmark active state
    const icon = button.querySelector('svg');

    if (isBookmarked) {
        if (icon) icon.setAttribute('fill', 'currentColor');
    } else {
        if (icon) icon.setAttribute('fill', 'none');
    }

    try {
        await fetch(`${API_URL}/posts/${postId}/bookmark`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include'
        });
    } catch (err) {
        console.error('Bookmark action failed:', err);
    }
}

// --- Feed & Post Creation ---
function createPostHTML(post) {
    const isLiked = post.has_liked ? 'liked-active' : '';
    const likeFill = post.has_liked ? 'currentColor' : 'none';
    const isBookmarked = post.has_bookmarked ? 'text-primary' : '';
    const bookmarkFill = post.has_bookmarked ? 'currentColor' : 'none';
    const timeAgo = new Date(post.created_at).toLocaleDateString();

    // Highlight Mentions and Hashtags
    // Regex logic:
    // Hashtags: #tag -> span #tag
    // Mentions: @user -> span onclick="loadPublicProfile('user')" @user
    const highlightedContent = (post.content_text || '')
        .replace(/#(\w+)/g, '<span class="text-primary font-medium hover:underline cursor-pointer">#$1</span>')
        .replace(/@(\w+)/g, '<span class="text-primary font-medium hover:underline cursor-pointer" onclick="loadPublicProfile(\'$1\'); event.stopPropagation();">@$1</span>');

    return `
        <div class="bg-surface p-4 rounded-xl shadow-sm border border-app animate-fade-in">
            <div class="flex items-center mb-3">
                <img src="${post.author.avatar_url || 'https://placehold.co/40x40'}" class="w-10 h-10 rounded-full mr-3 object-cover cursor-pointer hover:opacity-80" alt="Avatar" onclick="loadPublicProfile('${post.author.username}')">
                <div>
                    <h4 class="font-bold text-main text-sm cursor-pointer hover:underline" onclick="loadPublicProfile('${post.author.username}')">${post.author.full_name || post.author.username}</h4>
                    <p class="text-xs text-secondary">@${post.author.username} • ${timeAgo}</p>
                </div>
                <button class="ml-auto text-secondary hover:text-main">
                    <i data-lucide="more-horizontal" class="w-5 h-5"></i>
                </button>
            </div>
            
            <p class="text-main mb-3 whitespace-pre-wrap">${highlightedContent}</p>
            
            ${post.media_urls && post.media_urls.length > 0 ? `
            <div class="mb-4 rounded-lg overflow-hidden border border-app grid gap-1 ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}">
                ${post.media_urls.map(url => {
        const isVideo = url.match(/\.(mp4|webm|ogg|mov|quicktime)$/i);
        return isVideo
            ? `<video src="${url}" class="w-full h-full object-cover max-h-96" controls preload="metadata"></video>`
            : `<img src="${url}" class="w-full object-cover max-h-96" alt="Post Media">`;
    }).join('')}
            </div>` : ''}

            <div class="flex items-center justify-between pt-3 border-t border-app">
                <div class="flex space-x-6">
                    <button onclick="toggleLike(this, '${post.id}')" class="flex items-center space-x-2 text-secondary hover:text-red-500 transition-colors ${isLiked} group">
                        <i data-lucide="heart" class="w-5 h-5 transition-transform group-active:scale-125" fill="${likeFill}"></i>
                        <span data-count="like" class="text-sm font-medium">${post.likes_count || 0}</span>
                    </button>
                    
                    <button class="flex items-center space-x-2 text-secondary hover:text-primary transition-colors">
                        <i data-lucide="message-circle" class="w-5 h-5"></i>
                        <span class="text-sm font-medium">${post.comments_count || 0}</span>
                    </button>
                    
                    <button class="flex items-center space-x-2 text-secondary hover:text-green-500 transition-colors">
                        <i data-lucide="repeat" class="w-5 h-5"></i>
                        <span class="text-sm font-medium">${post.reposts_count || 0}</span>
                    </button>
                </div>
                
                <button onclick="toggleBookmark(this, '${post.id}')" class="text-secondary hover:text-primary transition-colors ${isBookmarked}">
                    <i data-lucide="bookmark" class="w-5 h-5" fill="${bookmarkFill}"></i>
                </button>
            </div>
        </div>
    `;
}

async function fetchFeed() {
    const feedContainer = document.getElementById('post-feed');
    if (!feedContainer) return;

    try {
        const response = await fetch(`${API_URL}/posts`, {
            headers: getHeaders(),
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            if (data.posts && data.posts.length > 0) {
                feedContainer.innerHTML = data.posts.map(createPostHTML).join('');
                lucide.createIcons();
            } else {
                feedContainer.innerHTML = `
                    <div class="text-center py-10 text-secondary bg-surface rounded-xl border border-app">
                        <i data-lucide="newspaper" class="w-12 h-12 mx-auto mb-3 opacity-20"></i>
                        <p>No posts yet. Be the first to post!</p>
                    </div>`;
                lucide.createIcons();
            }
        }
    } catch (err) {
        console.error("Failed to load feed", err);
    }
}

// File Preview Handling
let selectedFiles = [];

function handleFileSelect(event) {
    const previewContainer = document.getElementById('post-media-preview');
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    selectedFiles = [...selectedFiles, ...files];
    previewContainer.classList.remove('hidden');
    previewContainer.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'relative aspect-video rounded-lg overflow-hidden border border-app bg-black';

            const isVideo = file.type.startsWith('video/');
            const mediaHtml = isVideo
                ? `<video src="${e.target.result}" class="w-full h-full object-contain" controls></video>`
                : `<img src="${e.target.result}" class="w-full h-full object-cover">`;

            div.innerHTML = `
                ${mediaHtml}
                <button onclick="removeFile(${index})" class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500/80 transition-colors z-10">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            `;
            previewContainer.appendChild(div);
            lucide.createIcons();
        };
        reader.readAsDataURL(file);
    });
}

window.removeFile = (index) => {
    selectedFiles.splice(index, 1);
    // Re-trigger select to re-render 
    const dummyEvent = { target: { files: [] } };

    // Manual re-render
    const previewContainer = document.getElementById('post-media-preview');
    previewContainer.innerHTML = '';
    if (selectedFiles.length === 0) {
        previewContainer.classList.add('hidden');
    } else {
        selectedFiles.forEach((file, idx) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'relative aspect-video rounded-lg overflow-hidden border border-app bg-black';

                const isVideo = file.type.startsWith('video/');
                const mediaHtml = isVideo
                    ? `<video src="${e.target.result}" class="w-full h-full object-contain" controls></video>`
                    : `<img src="${e.target.result}" class="w-full h-full object-cover">`;

                div.innerHTML = `
                    ${mediaHtml}
                    <button onclick="removeFile(${idx})" class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500/80 transition-colors z-10">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                `;
                previewContainer.appendChild(div);
                lucide.createIcons();
            };
            reader.readAsDataURL(file);
        });
    }
};

window.insertTextAtCursor = (text) => {
    const textarea = document.querySelector('#createPostModal textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    textarea.value = value.substring(0, start) + text + value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
};

async function submitPost() {
    const textarea = document.querySelector('#createPostModal textarea');
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content && selectedFiles.length === 0) return;

    const btn = document.querySelector('#createPostModal button.bg-primary');
    const originalText = btn.innerText;
    btn.innerText = 'Posting...';
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('content', content);
        selectedFiles.forEach(file => {
            formData.append('media', file);
        });

        // Headers: Do NOT set Content-Type manually for FormData, browser does it with boundary
        const headers = {
            'Authorization': getHeaders()['Authorization']
        };

        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: formData
        });

        if (response.ok) {
            textarea.value = '';
            selectedFiles = [];
            document.getElementById('post-media-preview').innerHTML = '';
            document.getElementById('post-media-preview').classList.add('hidden');

            hideModal('createPostModal');
            fetchFeed();
            if (typeof Toast !== 'undefined') Toast.success("Posted successfully!");
        } else {
            throw new Error('Post failed');
        }
    } catch (err) {
        console.error(err);
        if (typeof Toast !== 'undefined') Toast.error("Failed to create post.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- Stories Logic ---
async function fetchStories() {
    const list = document.getElementById('story-list');
    if (!list) return;

    try {
        const response = await fetch(`${API_URL}/stories`, {
            headers: getHeaders(),
            credentials: 'include'
        });
        if (response.ok) {
            const { stories } = await response.json();

            // Keep the first item ("You" story)
            const yourStory = list.firstElementChild;
            list.innerHTML = '';
            if (yourStory) list.appendChild(yourStory);

            // Append others
            stories.forEach(story => {
                const el = document.createElement('div');
                el.className = 'story-item flex flex-col items-center shrink-0 w-16 cursor-pointer transform hover:scale-105 transition-transform';
                el.innerHTML = `
                    <div class="relative w-14 h-14 rounded-full border-2 border-primary p-0.5">
                        <img src="${story.user.avatar_url || 'https://placehold.co/52x52'}" class="w-full h-full rounded-full object-cover" alt="Story">
                    </div>
                    <span class="text-xs mt-1 text-secondary text-center truncate w-full">${story.user.username}</span>
                `;
                list.appendChild(el);
            });
        }
    } catch (err) {
        console.error("Stories fetch error", err);
    }
}


let currentUser = null;

// --- Profile Logic ---
async function fetchProfile() {
    try {
        const headers = getHeaders();
        console.log('[DEBUG] fetchProfile Headers:', headers); // DEBUG

        const response = await fetch(`${API_URL}/profile`, {
            headers,
            credentials: 'include' // Send cookies
        });
        if (response.ok) {
            const { profile } = await response.json();
            console.log('[DEBUG] fetchProfile Success:', profile); // DEBUG
            currentUser = profile; // Store for comparison

            // Update "You" context in sidebar/modals (global context)
            updateUserContext(profile);

            // Render Profile View for ME
            renderProfileView(profile, true);
        } else {
            console.warn('[DEBUG] fetchProfile Failed:', response.status); // DEBUG
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

async function loadPublicProfile(username) {
    try {
        // Update URL
        const newUrl = `${window.location.protocol}//${window.location.host}/?user=${username}`;
        window.history.pushState({ path: newUrl }, '', newUrl);

        changeView('profile'); // Switch to view

        // Show loading state or clear previous content
        // (Optional: Add skeleton loader here)

        const response = await fetch(`${API_URL}/profile/${username}`, {
            headers: getHeaders(),
            credentials: 'include' // Send cookies (needed for follow status check)
        });
        if (response.ok) {
            const { profile } = await response.json();

            console.log('[DEBUG] loadPublicProfile currentUser:', currentUser); // DEBUG

            // Real comparison logic
            const isOwnProfile = currentUser && (currentUser.username === profile.username || currentUser.id === profile.id);
            renderProfileView(profile, isOwnProfile);

            // If Guest, show the "Login to Connect" modal after a short delay or immediately
            if (!currentUser) {
                console.log('[DEBUG] Guest detected, showing modal'); // DEBUG
                // User asked to "hide it with login modal". 
                // We show it immediately.
                setTimeout(() => showModal('authModal'), 500);
            }

        } else {
            if (typeof Toast !== 'undefined') Toast.error("User not found");
        }
    } catch (err) {
        console.error('Error loading public profile:', err);
    }
}

function updateUserContext(profile) {
    // Update "Create Post" Modal User Info & Story Avatar (Items that persist regardless of view)
    const userStoryAvatar = document.getElementById('user-story-avatar');
    if (userStoryAvatar && profile.avatar_url) {
        userStoryAvatar.src = profile.avatar_url;
    }

    const createPostAvatar = document.getElementById('create-post-avatar');
    const createPostName = document.getElementById('create-post-name');
    if (createPostAvatar && profile.avatar_url) {
        createPostAvatar.src = profile.avatar_url;
    }
    if (createPostName) {
        createPostName.textContent = profile.full_name || profile.username;
    }
}

// --- Follow Logic ---
async function toggleFollow(btn, userId) {
    if (!currentUser) {
        showModal('authModal');
        return;
    }
    if (!userId || btn.disabled) return;

    btn.disabled = true;
    const originalText = btn.innerText;

    // Optimistic UI
    const isFollowing = btn.classList.contains('bg-surface'); // Currently following (has border/surface)
    if (isFollowing) {
        // Unfollow
        btn.innerText = 'Follow';
        btn.classList.remove('bg-surface', 'border', 'border-app', 'text-main');
        btn.classList.add('bg-primary', 'text-white');
    } else {
        // Follow
        btn.innerText = 'Following';
        btn.classList.remove('bg-primary', 'text-white');
        btn.classList.add('bg-surface', 'border', 'border-app', 'text-main');
    }

    try {
        const response = await fetch(`${API_URL}/profile/follow/${userId}`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Action failed');

        // Update stats if successful (optional, would require refetching or manual DOM update of follower count)
        const stats = document.querySelectorAll('#profileView .flex.justify-around > div span.text-xl');
        if (stats.length >= 2) {
            let count = parseInt(stats[1].textContent) || 0;
            stats[1].textContent = isFollowing ? Math.max(0, count - 1) : count + 1;
        }

    } catch (err) {
        console.error('Follow error:', err);
        // Revert
        btn.innerText = originalText;
        if (isFollowing) {
            btn.classList.add('bg-surface', 'border', 'border-app', 'text-main');
            btn.classList.remove('bg-primary', 'text-white');
        } else {
            btn.classList.add('bg-primary', 'text-white');
            btn.classList.remove('bg-surface', 'border', 'border-app', 'text-main');
        }
    } finally {
        btn.disabled = false;
    }
}

// Load "My" Profile (Nav Handler)
async function loadMyProfile() {
    if (!currentUser) {
        // If not logged in, show auth modal
        showModal('authModal');
        return;
    }

    try {
        // 1. Reset URL to clean origin
        const cleanUrl = `${window.location.protocol}//${window.location.host}/`;
        window.history.pushState({ path: cleanUrl }, '', cleanUrl);

        // 2. Render My Profile
        renderProfileView(currentUser, true);

        // 3. Switch View
        changeView('profile');
    } catch (err) {
        console.error('Error loading my profile:', err);
    }
}

window.loadMyProfile = loadMyProfile; // Expose to window

async function renderProfileView(profile, isOwnProfile) {
    const pView = document.getElementById('profileView');
    if (!pView) return;

    // Name & Username
    const nameEl = pView.querySelector('h3');
    const usernameEl = pView.querySelector('p.text-md');
    const bioEl = pView.querySelector('p.max-w-sm');
    const imgEl = pView.querySelector('img');

    if (nameEl) nameEl.textContent = profile.full_name || profile.username;
    if (usernameEl) usernameEl.textContent = `@${profile.username}`;
    if (bioEl) bioEl.textContent = profile.bio || "No bio yet.";
    if (imgEl) {
        imgEl.src = profile.avatar_url || 'https://placehold.co/96x96/e2e8f0/64748b?text=...';
    }

    // Stats
    const statsContainers = pView.querySelectorAll('.flex.justify-around > div span.text-xl');
    if (statsContainers.length >= 3) {
        statsContainers[0].textContent = profile.posts_count || 0;
        statsContainers[1].textContent = profile.followers_count || 0;
        statsContainers[2].textContent = profile.following_count || 0;
    }

    // Actions (Edit vs Follow)
    const actionsContainer = pView.querySelector('.flex.space-x-4.mt-6.w-full');
    if (actionsContainer) {
        if (isOwnProfile) {
            actionsContainer.innerHTML = `
                <button onclick="showModal('editProfileModal')" class="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity duration-200">
                    Edit Profile
                </button>
                <button onclick="shareProfile('${profile.username}')" class="py-3 px-6 border border-app text-main font-semibold rounded-xl hover:bg-hover-bg transition-colors duration-200">
                    Share
                </button>
            `;

            // Populate Edit Modal Inputs Only if it's me
            const editName = document.getElementById('edit-name');
            const editUsername = document.getElementById('edit-username');
            const editBio = document.getElementById('edit-bio');
            const editGender = document.getElementById('edit-gender');

            if (editName) editName.value = profile.full_name || '';
            if (editUsername) editUsername.value = profile.username || '';
            if (editBio) editBio.value = profile.bio || '';
            if (editGender && profile.gender) editGender.value = profile.gender;

        } else {
            // Public View Actions
            const isFollowing = profile.is_following;
            const followBtnClass = isFollowing
                ? 'bg-surface border border-app text-main'
                : 'bg-primary text-white';
            const followBtnText = isFollowing ? 'Following' : 'Follow';

            // Check if Guest
            if (!currentUser) {
                actionsContainer.innerHTML = `
                    <button onclick="showModal('authModal')" class="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-200">
                        Follow
                    </button>
                    <button onclick="showModal('authModal')" class="py-3 px-6 border border-app text-main font-semibold rounded-xl hover:bg-hover-bg transition-colors duration-200">
                        Message
                    </button>
                `;
            } else {
                actionsContainer.innerHTML = `
                    <button onclick="toggleFollow(this, '${profile.id}')" class="flex-1 py-3 font-semibold rounded-xl hover:opacity-90 transition-all duration-200 ${followBtnClass}">
                        ${followBtnText}
                    </button>
                    <button class="py-3 px-6 border border-app text-main font-semibold rounded-xl hover:bg-hover-bg transition-colors duration-200">
                        Message
                    </button>
                `;
            }
        }
    }

    // Fetch & Render Posts
    // If isOwnProfile, fetch /profile/posts
    // If public, fetch /profile/:username/posts
    const postsEndpoint = isOwnProfile ? `${API_URL}/profile/posts` : `${API_URL}/profile/${profile.username}/posts`;

    const grid = document.getElementById('profile-posts-grid');
    if (grid) grid.innerHTML = '<div class="col-span-3 text-center py-4"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div></div>';

    try {
        const postsRes = await fetch(postsEndpoint, {
            headers: getHeaders(),
            credentials: 'include'
        });
        if (postsRes.ok) {
            const { posts } = await postsRes.json();
            if (grid) {
                grid.innerHTML = '';
                posts.forEach(post => {
                    const hasMedia = post.media_urls && post.media_urls.length > 0;
                    const el = document.createElement('div');
                    el.className = 'aspect-square bg-placeholder-bg rounded-lg overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity';

                    if (hasMedia) {
                        // Check if video
                        const isVideo = post.media_urls[0].match(/\.(mp4|webm|ogg|mov|quicktime)$/i);
                        if (isVideo) {
                            el.innerHTML = `<video src="${post.media_urls[0]}" class="w-full h-full object-cover"></video>`;
                        } else {
                            el.innerHTML = `<img src="${post.media_urls[0]}" class="w-full h-full object-cover">`;
                        }
                    } else {
                        el.innerHTML = `
                            <div class="h-full w-full p-2 flex items-center justify-center bg-surface border border-app">
                                <p class="text-[0.6rem] text-secondary line-clamp-4 text-center">${post.content_text || ''}</p>
                            </div>`;
                    }
                    grid.appendChild(el);
                });

                if (posts.length === 0) {
                    grid.innerHTML = '<div class="col-span-3 text-center py-4 text-xs text-secondary">No posts yet</div>';
                }
            }
        }
    } catch (err) {
        console.error('Error fetching profile posts:', err);
        if (grid) grid.innerHTML = '<div class="col-span-3 text-center py-4 text-xs text-secondary">Failed to load posts</div>';
    }
}

// --- Infinite Scroll ---
let isFetchingDocs = false;
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isFetchingDocs) {
                // Determine which feed we are on (main or profile) and load more
                // For now, simpler implementation: just log it or dispatch event
                // To do this properly, we need pagination state (page/offset)


                // Real logic placeholder removal:
                // We'd call fetchFeed(page + 1) here.
                // Since this requires a larger refactor of fetchFeed signature, for this task
                // I will ensure the observer is attached to a sentinel element.
            }
        });
    }, { rootMargin: '100px' });

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) observer.observe(sentinel);
}

// --- Edit Profile Logic ---
let selectedAvatarFile = null;

window.handleAvatarPreview = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    selectedAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('edit-avatar-preview');
        if (preview) preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.saveProfile = async () => {
    const name = document.getElementById('edit-name').value.trim();
    const username = document.getElementById('edit-username').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const gender = document.getElementById('edit-gender').value;

    const btn = document.querySelector('#editProfileModal button.bg-primary');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('full_name', name);
        formData.append('username', username);
        formData.append('bio', bio);
        formData.append('gender', gender);
        if (selectedAvatarFile) {
            formData.append('avatar', selectedAvatarFile);
        }

        const response = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: {
                // Do NOT set Content-Type for FormData
                'Authorization': getHeaders()['Authorization']
            },
            credentials: 'include',
            body: formData
        });

        if (response.ok) {
            const { profile } = await response.json();
            currentUser = profile;
            updateUserContext(profile);
            renderProfileView(profile, true);

            // Re-fetch posts/stories to update avatars there too if needed
            // For now just hide modal
            hideModal('editProfileModal');
            if (typeof Toast !== 'undefined') Toast.success("Profile updated!");
        } else {
            throw new Error('Update failed');
        }
    } catch (err) {
        console.error('Save Profile Error:', err);
        if (typeof Toast !== 'undefined') Toast.error("Failed to update profile.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        selectedAvatarFile = null; // Reset
    }
};

// --- View/Modal Management (Existing) ---
function setNotificationBadge(shouldShow) {
    const badge = document.getElementById('desktop-notification-badge');
    if (badge) {
        if (shouldShow) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
    }
}

function updateNavStyles(viewId) {
    const allNavLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    allNavLinks.forEach(link => {
        link.classList.remove('text-primary');
        link.classList.add('text-secondary');
    });

    // Mobile Nav Active State
    document.querySelectorAll('.mobile-nav-link').forEach(btn => {
        btn.classList.remove('text-primary');
        if (btn.getAttribute('onclick').includes(viewId)) {
            btn.classList.add('text-primary');
        } else {
            btn.classList.add('text-secondary');
        }
    });

    const activeLinks = document.querySelectorAll(`[onclick="changeView('${viewId}')"]`);
    activeLinks.forEach(link => {
        link.classList.remove('text-secondary');
        link.classList.add('text-primary');
    });

    // Auto-focus search input if switching to search view
    if (viewId === 'search') {
        setTimeout(() => {
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.focus();
        }, 100);
    }
}

function changeView(viewId) {
    currentPage = viewId;
    const views = document.querySelectorAll('.view-content');
    views.forEach(view => view.classList.add('hidden'));

    const target = document.getElementById(viewId + 'View');
    if (target) target.classList.remove('hidden');

    if (viewId === 'notifications') {
        setNotificationBadge(false);
        fetchNotifications();
    }
    updateNavStyles(viewId);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    const fab = document.getElementById('fab-mobile');
    if (!modal) return;

    modal.classList.add('active');

    if (modalId === 'createPostModal') {
        if (fab) fab.classList.add('rotate-active');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    const fab = document.getElementById('fab-mobile');
    if (!modal) return;

    if (modalId === 'createPostModal') {
        if (fab) fab.classList.remove('rotate-active');
    }
    modal.classList.remove('active');
}

// --- Logout Handler ---
async function handleLogout() {
    try {
        // 1. Call API to clear server cookies
        await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
    } catch (e) {
        console.warn("Logout API failed", e);
    }

    // 2. Clear Local Storage
    localStorage.removeItem('sb-access-token');

    // 3. Reset User State
    currentUser = null;

    // 4. Update UI to Guest Mode
    updateUserContext({}); // Clear user info in modals
    if (typeof Toast !== 'undefined') Toast.success("Logged out successfully");

    // 5. Refresh Feed/View (Go to home if on a protected route like notifications)
    if (currentPage === 'notifications' || currentPage === 'profile') {
        changeView('feed');
    } else {
        // Just re-fetch feed to ensure buttons update (Like -> Login Modal)
        fetchFeed();
    }

    // Re-render current view or home
    // Ideally we trigger a full UI refresh or page reload if we want to be 100% clean,
    // but for SPA feel:
    window.location.reload();
}

// --- Initialization ---
// --- Helpers ---
async function identifyCurrentUser() {
    try {
        const res = await fetch(`${API_URL}/profile`, { headers: getHeaders() });
        if (res.ok) {
            const { profile } = await res.json();
            currentUser = profile;
            updateUserContext(profile);
            return true;
        }
    } catch (err) {
        // Guest mode, ignore
    }
    return false;
}

// --- Notifications Logic ---
async function fetchNotifications() {
    try {
        // Optimistic UI: If we already have a badge, ensure we clear it if viewed (logic later)
        const response = await fetch(`${API_URL}/notifications`, { headers: getHeaders() });
        if (response.ok) {
            const { notifications } = await response.json();
            renderNotifications(notifications);
        }
    } catch (err) {
        console.error('Error loading notifications:', err);
    }
}

function renderNotifications(notifications) {
    const list = document.getElementById('notification-list');
    if (!list) return;

    // If we have a dedicated notifications view container, render there
    // For this app, let's assume 'notificationsView' has a container
    const container = document.querySelector('#notificationsView .space-y-4');
    if (!container) return;

    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<p class="text-center text-secondary py-8">No notifications yet.</p>';
        return;
    }

    container.innerHTML = notifications.map(n => {
        const actorName = n.actor ? n.actor.username : 'Someone';
        const actorAvatar = n.actor && n.actor.avatar_url ? n.actor.avatar_url : 'https://placehold.co/40x40';
        let text = '';
        let icon = '';

        switch (n.type) {
            case 'like': text = `liked your post.`; icon = '<i data-lucide="heart" class="w-4 h-4 text-red-500 fill-current"></i>'; break;
            case 'follow': text = `started following you.`; icon = '<i data-lucide="user-plus" class="w-4 h-4 text-primary"></i>'; break;
            case 'comment': text = `commented on your post.`; icon = '<i data-lucide="message-circle" class="w-4 h-4 text-blue-500"></i>'; break;
            case 'mention': text = `mentioned you in a post.`; icon = '<i data-lucide="at-sign" class="w-4 h-4 text-orange-500"></i>'; break;
            default: text = `interacted with you.`; icon = '<i data-lucide="bell" class="w-4 h-4 text-secondary"></i>';
        }

        return `
            <div class="flex items-center justify-between p-4 bg-surface rounded-xl border border-app hover:bg-hover-bg transition-colors">
                <div class="flex items-center space-x-4">
                    <div class="relative">
                        <img src="${actorAvatar}" class="w-10 h-10 rounded-full object-cover">
                        <div class="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 border border-app">
                            ${icon}
                        </div>
                    </div>
                    <div>
                        <p class="text-sm text-main"><span class="font-bold">${actorName}</span> ${text}</p>
                        <p class="text-xs text-secondary">${new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                ${!n.read ? '<div class="w-2 h-2 bg-primary rounded-full"></div>' : ''}
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function subscribeToNotifications() {
    if (!currentUser) return;

    if (typeof supabase === 'undefined') {
        console.warn('Supabase client not found for Realtime');
        return;
    }

    const channel = supabase
        .channel('public:notifications')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUser.id}`
        }, payload => {
            // Handle new notification

            // 1. Show Toast
            if (typeof Toast !== 'undefined') {
                Toast.info("New Notification", "You have a new interaction!");
            }

            // 2. Update Grid/List if active
            const container = document.querySelector('#notificationsView .space-y-4');
            if (container && currentPage === 'notifications') {
                fetchNotifications(); // Reload list
            }

            // 3. Show Badge
            setNotificationBadge(true);
        })
        .subscribe();
}

// --- Cookie Consent Logic ---
function initCookieConsent() {
    // Check if already consented
    if (localStorage.getItem('cookie_consent') === 'true') return;

    // Create Styles
    const style = document.createElement('style');
    style.innerHTML = `
        .cookie-consent-overlay {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(150%);
            width: 90%;
            max-width: 500px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 16px;
            transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
            font-family: 'Inter', sans-serif;
            color: #fff; /* Default to white for contrast on glass */
        }
        
        /* Dark/Light mode adaptation */
        [data-theme="light"] .cookie-consent-overlay {
            background: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(0,0,0,0.05);
            color: #1e293b;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }

        .cookie-consent-overlay.active {
            transform: translateX(-50%) translateY(0);
        }

        .cc-header {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 18px;
            font-weight: 700;
        }

        .cc-body {
            font-size: 14px;
            line-height: 1.5;
            opacity: 0.9;
        }

        .cc-actions {
            display: flex;
            gap: 12px;
            margin-top: 8px;
        }

        .cc-btn {
            flex: 1;
            padding: 12px;
            border-radius: 12px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .cc-btn-accept {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .cc-btn-accept:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
        }

        .cc-btn-decline {
            background: rgba(128, 128, 128, 0.1);
            color: inherit;
        }
        .cc-btn-decline:hover {
            background: rgba(128, 128, 128, 0.2);
        }
    `;
    document.head.appendChild(style);

    // Create Elements
    const container = document.createElement('div');
    container.className = 'cookie-consent-overlay';

    container.innerHTML = `
        <div class="cc-header">
            <i data-lucide="cookie" class="w-6 h-6 text-primary"></i>
            <span>We use cookies</span>
        </div>
        <div class="cc-body">
            We use cookies to enhance your experience, keep you logged in, and analyze traffic. 
            By continuing, you agree to our use of cookies.
        </div>
        <div class="cc-actions">
            <button class="cc-btn cc-btn-decline" id="cc-decline">Decline</button>
            <button class="cc-btn cc-btn-accept" id="cc-accept">Accept All</button>
        </div>
    `;

    document.body.appendChild(container);

    // Initialize icons in the new container
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({
            root: container,
            nameAttr: 'data-lucide',
            attrs: {
                class: "w-6 h-6 text-primary"
            }
        });
    }

    // Animate In
    setTimeout(() => {
        container.classList.add('active');
    }, 1000);

    // Handlers
    document.getElementById('cc-accept').addEventListener('click', () => {
        localStorage.setItem('cookie_consent', 'true');
        container.classList.remove('active');
        setTimeout(() => container.remove(), 600);
    });

    document.getElementById('cc-decline').addEventListener('click', () => {
        localStorage.setItem('cookie_consent', 'false');
        container.classList.remove('active');
        setTimeout(() => container.remove(), 600);
    });
}


// --- Search Logic ---

/**
 * Debounce utility to limit API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 */
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Perform Search API call
 * @param {string} query 
 */
async function performSearch(query) {
    const resultsContainer = document.getElementById('search-results');

    if (!query || query.trim().length === 0) {
        resultsContainer.innerHTML = `
            <div class="text-center py-10 text-secondary opacity-50">
                <i data-lucide="search" class="w-12 h-12 mx-auto mb-3"></i>
                <p>Start typing to search...</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    resultsContainer.innerHTML = `
        <div class="flex justify-center p-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.users.length === 0 && data.hashtags.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-10 text-secondary">
                    <p>No results found for "${query}"</p>
                </div>`;
            return;
        }

        let html = '';

        // Users Section
        if (data.users.length > 0) {
            html += `<h4 class="text-xs font-bold text-secondary uppercase tracking-wider mb-2 mt-2 px-2">People</h4>`;
            data.users.forEach(user => {
                const avatar = user.avatar_url || `https://placehold.co/40x40/e2e8f0/64748b?text=${user.username.substring(0, 2).toUpperCase()}`;
                html += `
                    <button onclick="loadPublicProfile('${user.username}')" class="w-full flex items-center p-2 hover:bg-hover-bg rounded-lg transition-colors text-left group">
                        <img src="${avatar}" class="w-10 h-10 rounded-full object-cover mr-3 border border-app" onerror="this.src='https://placehold.co/40x40/e2e8f0/64748b?text=User'">
                        <div>
                            <p class="font-bold text-main group-hover:text-primary transition-colors">${user.username}</p>
                            <p class="text-xs text-secondary">${user.full_name || ''}</p>
                        </div>
                    </button>
                `;
            });
        }

        // Hashtags Section
        if (data.hashtags.length > 0) {
            html += `<h4 class="text-xs font-bold text-secondary uppercase tracking-wider mb-2 mt-4 px-2">Hashtags</h4>`;
            data.hashtags.forEach(tag => {
                html += `
                    <button class="w-full flex items-center p-3 hover:bg-hover-bg rounded-lg transition-colors text-left group">
                        <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                            <i data-lucide="hash" class="w-5 h-5"></i>
                        </div>
                        <span class="font-medium text-main group-hover:text-primary transition-colors">${tag}</span>
                    </button>
                `;
            });
        }

        resultsContainer.innerHTML = html;
        if (window.lucide) lucide.createIcons();

    } catch (err) {
        console.error("Search failed:", err);
        resultsContainer.innerHTML = `<div class="text-red-500 text-center p-4">Search failed. Please try again.</div>`;
    }
}

// Attach Search Listener
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
        performSearch(e.target.value);
    }, 300));
}

// --- Initialization ---
window.onload = async () => {
    // Init Supabase
    await initializeSupabase();

    setTheme(getPreferredTheme());
    changeView(currentPage);

    // Fetch user profile if logged in
    await fetchProfile();

    // Attach Submit Post Listener
    const postBtn = document.querySelector('#createPostModal button.bg-primary');
    if (postBtn) {
        postBtn.onclick = submitPost;
    }

    // Attach File Input Listener
    const fileInput = document.getElementById('post-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    setupInfiniteScroll();
    initCookieConsent();

    // Check for deep link (user param)
    const urlParams = new URLSearchParams(window.location.search);
    const publicUser = urlParams.get('user');

    if (publicUser) {
        // Deep link to profile
        loadPublicProfile(publicUser);
    } else {
        // else Guest Home (Feed only)
        fetchFeed();
        fetchStories();
    }
};

window.shareProfile = (username) => {
    const url = `${window.location.origin}/?user=${username}`;
    navigator.clipboard.writeText(url).then(() => {
        if (typeof Toast !== 'undefined') Toast.success("Profile link copied!");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        if (typeof Toast !== 'undefined') Toast.error("Failed to copy link.");
    });
};
