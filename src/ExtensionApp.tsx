import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Info } from 'lucide-react';
import { FloatingMenu } from '../components/FloatingMenu';
import { DEFAULT_PROMPTS, SAMPLE_ARTICLE } from '../constants';
import { PromptTemplate, SelectionData } from '../types';
import { getContextForSelection } from './utils/contextExtractor';

const App: React.FC = () => {
  const [selection, setSelection] = useState<SelectionData | null>(null);
  // Store the Range object to re-calculate position on scroll
  const selectionRangeRef = React.useRef<Range | null>(null);

  // Lifted state for prompts to persist changes across selections
  // Initialize from localStorage if available
  // Lifted state for prompts to persist changes across selections
  const [prompts, setPrompts] = useState<PromptTemplate[]>(DEFAULT_PROMPTS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load prompts from chrome.storage.sync on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['lexearch_prompts'], (result) => {
        if (result.lexearch_prompts) {
          setPrompts(result.lexearch_prompts as PromptTemplate[]);
        } else {
          // Migration: Check localStorage if sync is empty
          const localSaved = localStorage.getItem('lexearch_prompts');
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              setPrompts(parsed as PromptTemplate[]);
              // Save to sync immediately to complete migration
              chrome.storage.sync.set({ lexearch_prompts: parsed });
            } catch (e) {
              console.error('Failed to parse local prompts during migration', e);
            }
          }
        }
        setIsLoaded(true);
      });

      // Listen for changes from other tabs/windows
      const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
        if (areaName === 'sync' && changes.lexearch_prompts) {
          setPrompts((changes.lexearch_prompts.newValue as PromptTemplate[]) || DEFAULT_PROMPTS);
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    } else {
      // Fallback for dev/web mode
      const saved = localStorage.getItem('lexearch_prompts');
      if (saved) {
        try {
          setPrompts(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved prompts', e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Persist prompts to storage whenever they change
  useEffect(() => {
    if (!isLoaded) return; // Don't save before loading to avoid overwriting with defaults

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ lexearch_prompts: prompts });
    } else {
      localStorage.setItem('lexearch_prompts', JSON.stringify(prompts));
    }
  }, [prompts, isLoaded]);

  // Update selection coordinates based on the current range
  const updateSelectionPosition = useCallback(() => {
    if (!selectionRangeRef.current) return;

    const range = selectionRangeRef.current;
    const boundingRect = range.getBoundingClientRect();
    const clientRects = Array.from(range.getClientRects());

    // If the element is no longer visible (e.g. scrolled way off), we might want to hide it
    // But for now, just update coordinates.

    const serializedRects = clientRects.map(r => ({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height
    }));

    setSelection(prev => prev ? {
      ...prev,
      boundingRect: {
        top: boundingRect.top,
        left: boundingRect.left,
        width: boundingRect.width,
        height: boundingRect.height,
        bottom: boundingRect.bottom
      },
      clientRects: serializedRects
    } : null);
  }, []);

  // Text Selection Handler
  const handleMouseUp = useCallback(() => {
    // Thanks to the "Event Wall" in content.tsx, this handler will ONLY fire
    // if the click happened OUTSIDE the extension.

    const windowSelection = window.getSelection();

    if (!windowSelection || windowSelection.isCollapsed) {
      if (selection) {
        setSelection(null);
        selectionRangeRef.current = null;
      }
      return;
    }

    const text = windowSelection.toString().trim();
    if (text.length > 0) {
      const range = windowSelection.getRangeAt(0);
      selectionRangeRef.current = range;

      // Capture context
      const context = getContextForSelection(windowSelection);

      // Initial calculation
      updateSelectionPosition();

      // We set the text immediately as it doesn't change on scroll
      setSelection(prev => ({
        text,
        context,
        boundingRect: { top: 0, left: 0, width: 0, height: 0, bottom: 0 }, // Will be updated by updateSelectionPosition
        clientRects: []
      }));
      // Trigger immediate update to fill rects
      requestAnimationFrame(updateSelectionPosition);
    }
  }, [selection, updateSelectionPosition]);

  // Listen for document clicks to handle selection logic
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // Listen for scroll and resize to update position
  useEffect(() => {
    if (!selection) return;

    const handleScrollOrResize = () => {
      requestAnimationFrame(updateSelectionPosition);
    };

    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [selection, updateSelectionPosition]);

  return (
    <div className="font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 relative pointer-events-none">

      {/* Custom Highlight Overlay - Rendered absolutely relative to document to scroll correctly */}
      {selection && (
        <div className="absolute inset-0 pointer-events-none z-20 mix-blend-multiply">
          {selection.clientRects.map((rect, i) => (
            <div
              key={i}
              className="absolute bg-yellow-300/50 animate-in fade-in duration-200 rounded-[2px]"
              style={{
                // Container is now fixed (viewport relative), so we use client rects directly
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }}
            />
          ))}
        </div>
      )}

      {/* Floating Menu */}
      <FloatingMenu
        selection={selection}
        prompts={prompts}
        onUpdatePrompts={setPrompts}
        onClose={() => {
          setSelection(null);
          window.getSelection()?.removeAllRanges();
        }}
      />

    </div>
  );
};

export default App;