import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment variables");
    process.exit(1);
}

// API Endpoint
app.post('/api/generate', async (req, res) => {
    // console.log('Received request to /api/generate');
    try {
        const { contents } = req.body;

        // Log the request for debugging
        // console.log('Request body contents:', JSON.stringify(contents).substring(0, 100) + '...');

        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is missing');
            return res.status(500).json({ error: 'API key configuration error' });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        // console.log('Forwarding request to Gemini API...');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contents }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API error:', data);
            return res.status(response.status).json(data);
        }

        // console.log('Gemini API response received successfully');
        res.json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).json({ error: 'Failed to generate content' });
    }
});

// Serve static files in production
// Static file serving removed for extension backend
// if (process.env.NODE_ENV === 'production') { ... }

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
