chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateExplanation") {
        (async () => {
            try {
                const { selectedText, userPrompt, context } = request.payload;

                const fullPrompt = `
You are a helpful reading assistant.
TASK: ${userPrompt}

---
SELECTED TEXT:
"${selectedText}"

CONTEXT:
"${context || 'No context provided'}"
---

Provide a clear, direct response formatted in Markdown.
        `;

                // Construct the payload expected by the Gemini API (via our proxy)
                const contents = [{
                    parts: [{ text: fullPrompt }]
                }];

                const proxyUrl = process.env.GEMINI_PROXY_URL;
                if (!proxyUrl) {
                    throw new Error("Proxy URL not found. Please check your configuration.");
                }

                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ contents }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                // The proxy returns the raw Gemini API response
                // We need to extract the text from it
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

                sendResponse({ success: true, text: text });
            } catch (error: any) {
                console.error("Gemini API Error:", error);
                let errorMessage = error.message || "Unknown error";
                sendResponse({ success: false, error: errorMessage });
            }
        })();
        return true; // Indicates async response
    }
});
