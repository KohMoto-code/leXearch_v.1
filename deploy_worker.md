# How to Deploy Your Free Cloudflare Worker

Follow these steps to secure your API key using Cloudflare Workers.

## 1. Create a Cloudflare Account
1.  Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2.  Sign up for a free account (if you don't have one).

## 2. Create a Worker
1.  On the dashboard sidebar, click **Workers & Pages**.
2.  Click the **Create** button (or "Create Application").
3.  Click **Create Worker**.
4.  You can leave the default name (e.g., `mute-mountain-1234`) or change it to something like `lexearch-proxy`.
5.  Click **Deploy**.

## 3. Add Your Code
1.  Click **Edit code**.
2.  In the code editor on the left, delete the existing code.
3.  Copy the content of the `worker.js` file from your project and paste it into the editor.
4.  Click **Save and Deploy** (top right).

## 4. Add Your API Key
1.  Go back to the Worker's dashboard (click the back arrow or navigate to Workers & Pages > Your Worker).
2.  Click on the **Settings** tab.
3.  Click on **Variables and Secrets**.
4.  Click **Add**.
5.  **Variable name**: `GEMINI_API_KEY`
6.  **Value**: Paste your actual Google Gemini API key here.
7.  Click **Encrypt** (so it's hidden).
8.  Click **Save**.

## 5. Get Your Worker URL
1.  Go to the **Overview** tab of your Worker.
2.  You will see a "Preview" section with a URL ending in `.workers.dev` (e.g., `https://lexearch-proxy.yourname.workers.dev`).
3.  **Copy this URL.**

## 6. Update Your Extension
1.  Open your `.env.local` file in this project.
2.  Add your worker URL:
    ```
    VITE_GEMINI_PROXY_URL=https://lexearch-proxy.yourname.workers.dev
    ```
3.  (Optional) You can remove `GEMINI_API_KEY` from `.env.local` if you want, but keeping it doesn't hurt as long as the code doesn't use it.
