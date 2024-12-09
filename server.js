require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
const { URL } = require('url');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Enable CORS for FCC testing
app.use(cors());

// Serve static files
app.use('/public', express.static(`${process.cwd()}/public`));

// Parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB connection error:', err));
db.once('open', () => console.log('Connected to MongoDB'));

// Define URL Schema
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});

const Url = mongoose.model('Url', urlSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'hello API' });
});

// POST endpoint for shortening URLs
app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body;

  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL');
    }

    // Validate domain using DNS lookup
    dns.lookup(parsedUrl.hostname, async (err) => {
      if (err) {
        return res.json({ error: 'invalid url' });
      }

      // Check if URL already exists in the database
      let existingUrl = await Url.findOne({ original_url: url });
      if (existingUrl) {
        return res.json({
          original_url: existingUrl.original_url,
          short_url: existingUrl.short_url,
        });
      }

      // Generate a new short URL
      const count = await Url.countDocuments({});
      const newUrl = new Url({ original_url: url, short_url: count + 1 });
      await newUrl.save();

      res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url,
      });
    });
  } catch (error) {
    res.json({ error: 'invalid url' });
  }
});

// GET endpoint for redirecting short URLs
app.get('/api/shorturl/:short_url', async (req, res) => {
  const { short_url } = req.params;

  if (!/^\d+$/.test(short_url)) {
    return res.json({ error: 'invalid short URL' });
  }

  try {
    const urlEntry = await Url.findOne({ short_url: parseInt(short_url, 10) });

    if (!urlEntry) {
      return res.json({ error: 'No short URL found for the given input' });
    }

    res.redirect(urlEntry.original_url);
  } catch (error) {
    res.json({ error: 'An error occurred' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
