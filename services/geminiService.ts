export const generateExplanation = async (
  selectedText: string,
  userPrompt: string,
  context?: string
): Promise<string> => {
  try {
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
  } catch (error) {
    console.error("API Error:", error);
    return "Sorry, I encountered an error while processing your request. Please check your connection or try again.";
  }
};
