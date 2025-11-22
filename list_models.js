import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API key found");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
        console.log("Available models:");
        data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
        console.log("Error or no models found:", data);
    }
} catch (e) {
    console.error("Fetch error:", e);
}
