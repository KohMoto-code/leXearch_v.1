/**
 * Extracts relevant context around the user's selection.
 * 
 * Strategy:
 * 1. Identify the block-level parent of the selection.
 * 2. Extract the text content of that parent.
 * 3. If the content is too long, truncate it around the selection to save tokens.
 */
export const getContextForSelection = (selection: Selection): string => {
    if (selection.rangeCount === 0) return '';

    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;

    // If the container is a text node, get its parent element
    if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement as Element;
    }

    // Traverse up to find a block-level element
    // We want to avoid getting the entire body or html
    const blockTags = ['P', 'DIV', 'ARTICLE', 'SECTION', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    let currentElement = container as HTMLElement;

    while (currentElement && currentElement.parentElement) {
        if (blockTags.includes(currentElement.tagName)) {
            break;
        }
        // Stop if we hit the body to avoid grabbing too much
        if (currentElement.tagName === 'BODY') {
            break;
        }
        currentElement = currentElement.parentElement;
    }

    // Fallback: if we somehow didn't find a block tag but hit body, just use the container we started with
    // (unless it was the body itself, then maybe just use the text node's data if possible, but let's stick to element text)
    if (!currentElement) return '';

    const fullText = currentElement.innerText || currentElement.textContent || '';
    const selectedText = selection.toString();

    // If text is reasonable size, return it all
    if (fullText.length < 1000) {
        return fullText;
    }

    // If text is too long, we need to find where the selection is within it
    // Note: simple string.indexOf might be inaccurate if the selected text appears multiple times.
    // A more robust way is to use the range offsets, but mapping DOM offsets to innerText offsets is complex.
    // For this MVP, we'll try to find the selected text. If it appears multiple times, we might grab the wrong context,
    // but it's a reasonable trade-off for simplicity.

    const index = fullText.indexOf(selectedText);
    if (index === -1) {
        // Fallback: just return the first 1000 chars if we can't find the exact match (should be rare)
        return fullText.substring(0, 1000) + '...';
    }

    // Calculate window
    const contextLength = 1000;
    const halfContext = contextLength / 2;

    let start = Math.max(0, index - halfContext);
    let end = Math.min(fullText.length, index + selectedText.length + halfContext);

    // Adjust if we are near the start or end
    if (start === 0) {
        end = Math.min(fullText.length, contextLength);
    } else if (end === fullText.length) {
        start = Math.max(0, fullText.length - contextLength);
    }

    let context = fullText.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < fullText.length) context = context + '...';

    return context;
};
