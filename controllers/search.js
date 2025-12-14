const { supabase } = require('../utils/supabaseClient');

exports.searchGlobal = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length === 0) {
            return res.json({ users: [], hashtags: [] });
        }

        const query = q.trim();
        const searchTerm = `%${query}%`;

        // 1. Search Users
        const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .or(`username.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
            .limit(5);

        if (userError) throw userError;

        // 2. Search Hashtags in Posts
        const hashQuery = query.startsWith('#') ? query.substring(1) : query;
        const hashSearchTerm = `%#${hashQuery}%`;

        // Search for posts containing the hashtag
        const { data: posts, error: postError } = await supabase
            .from('posts')
            .select('content_text')
            .ilike('content_text', hashSearchTerm)
            .limit(20);

        if (postError) {
            console.error("Hashtag search error:", postError);
            // Non-fatal, continue with empty hashtags
        }

        // Extract unique hashtags from posts matched
        const hashtags = new Set();
        if (posts) {
            posts.forEach(post => {
                const tags = post.content_text.match(/#[a-zA-Z0-9_]+/g);
                if (tags) {
                    tags.forEach(tag => {
                        if (tag.toLowerCase().includes(hashQuery.toLowerCase())) {
                            hashtags.add(tag);
                        }
                    });
                }
            });
        }

        res.json({
            users: users || [],
            hashtags: Array.from(hashtags).slice(0, 15) // Limit to top 15
        });

    } catch (err) {
        console.error('Search Error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
};
