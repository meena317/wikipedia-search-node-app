const express = require('express');
const router = express.Router();
const Word = require('../models/Word');
const axios = require('axios');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });

  const token = authHeader.split(' ')[1];
  const jwt = require('jsonwebtoken');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// POST /api/search
router.post('/', authMiddleware, async (req, res) => {
  try {
    let { word } = req.body;
    if (!word || !word.trim()) return res.status(400).json({ message: 'Word required' });

    word = word.trim();
    const wordLower = word.toLowerCase();

    // If not present in DB, save it
    let saved = false;
    let wordDoc = await Word.findOne({ word: wordLower });
    if (!wordDoc) {
      wordDoc = new Word({ word: wordLower, addedBy: req.user.id });
      await wordDoc.save();
      saved = true;
    }

    // Wikipedia API URL
    const wikiApi = 'https://en.wikipedia.org/w/api.php';
    const params = {
      action: 'query',
      titles: word,
      format: 'json'
    };

    // ⭐ FIX: Add User-Agent header or Wikipedia returns 403
    const wikiResp = await axios.get(wikiApi, {
      params,
      headers: {
        "User-Agent": "my-node-app/1.0 (meena@example.com)"
      },
      timeout: 5000
    });

    // Parse Wikipedia response
    const pages = wikiResp.data.query && wikiResp.data.query.pages;
    let existsOnWikipedia = false;
    let wikipediaUrl = null;

    if (pages) {
      const pageKey = Object.keys(pages)[0];
      const page = pages[pageKey];

      if (!page.hasOwnProperty('missing')) {
        existsOnWikipedia = true;
        wikipediaUrl = `https://en.wikipedia.org/?curid=${page.pageid}`;
      }
    }

    res.json({ saved, existsOnWikipedia, wikipediaUrl });

  } catch (err) {
    console.error('Search error:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
