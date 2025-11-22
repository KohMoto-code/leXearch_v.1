import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './ExtensionApp';


// Create a container for the extension
console.log('Lexearch Content Script Loaded');
const container = document.createElement('div');
container.id = 'lexearch-extension-root';
container.style.position = 'fixed';
container.style.top = '0';
container.style.left = '0';
container.style.width = '100vw';
container.style.height = '100vh';
container.style.zIndex = '2147483647';
container.style.pointerEvents = 'none'; // Let clicks pass through by default
document.body.appendChild(container);

// Create Shadow DOM to isolate styles
const shadowRoot = container.attachShadow({ mode: 'open' });
console.log('Lexearch: Shadow DOM attached');

// Inject CSS Resets for Shadow DOM
const resetStyle = document.createElement('style');
resetStyle.textContent = `
  :host {
    all: initial;
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
  }
  *, ::before, ::after {
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
    border-color: #e5e7eb;
  }
  button {
    cursor: pointer;
    background-color: transparent;
    background-image: none;
  }
  input, textarea {
    font-family: inherit;
    font-size: 100%;
    line-height: inherit;
    color: inherit;
    margin: 0;
    padding: 0;
  }
`;
shadowRoot.appendChild(resetStyle);

// Inject Inter Font
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
shadowRoot.appendChild(fontLink);

// Inject Main CSS via Fetch (Bypasses CSP)
const cssUrl = chrome.runtime.getURL('assets/style.css');
console.log('Lexearch: Fetching CSS from', cssUrl);

fetch(cssUrl)
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.text();
  })
  .then(css => {
    console.log('Lexearch: CSS loaded, length:', css.length);
    const style = document.createElement('style');
    style.textContent = css;
    shadowRoot.appendChild(style);
  })
  .catch(err => {
    console.error('Lexearch: CSS load failed', err);
  });

// Mount React App
const root = ReactDOM.createRoot(shadowRoot);

// Event Wall Wrapper
// This div traps all mouse events to prevent them from bubbling to the document
// and triggering the "click outside" logic that clears the selection.
const EventWall = ({ children }: { children: React.ReactNode }) => {
  const stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      id="lexearch-event-wall"
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onClick={stopPropagation}
      style={{ display: 'contents' }} // Don't affect layout
    >
      {children}
    </div>
  );
};

root.render(
  <EventWall>
    <App />
  </EventWall>
);
