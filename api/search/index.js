const express = require('express');
const router = express.Router();
const search = require('../../controllers/search');
const guestMiddleware = require('../../utils/guestMiddleware');

// GET /api/search?q=...
router.get('/', guestMiddleware, search.searchGlobal);

module.exports = router;
