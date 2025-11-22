import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Info } from 'lucide-react';
import { FloatingMenu } from './components/FloatingMenu';
import { DEFAULT_PROMPTS, SAMPLE_ARTICLE } from './constants';
import { PromptTemplate, SelectionData } from './types';

const App: React.FC = () => {
  const [selection, setSelection] = useState<SelectionData | null>(null);

  // Lifted state for prompts to persist changes across selections
  // Initialize from localStorage if available
  const [prompts, setPrompts] = useState<PromptTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lexearch_prompts');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved prompts', e);
        }
      }
    }
    return DEFAULT_PROMPTS;
  });

  // Persist prompts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('lexearch_prompts', JSON.stringify(prompts));
  }, [prompts]);

  // Text Selection Handler
  const handleMouseUp = useCallback(() => {
    const windowSelection = window.getSelection();

    if (!windowSelection || windowSelection.isCollapsed) {
      // If user clicked somewhere else (collapsed selection), we clear our custom selection
      // UNLESS the click was inside the menu (which stops propagation, so this handler won't fire)
      if (selection) {
        setSelection(null);
      }
      return;
    }

    const text = windowSelection.toString().trim();
    if (text.length > 0) {
      const range = windowSelection.getRangeAt(0);
      const boundingRect = range.getBoundingClientRect();
      const clientRects = Array.from(range.getClientRects());

      // Convert DOMRects to simple objects and adjust for scroll
      // We store viewport-relative coords for calculation but render them absolutely relative to document
      const serializedRects = clientRects.map(r => ({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height
      }));

      setSelection({
        text,
        boundingRect: {
          top: boundingRect.top,
          left: boundingRect.left,
          width: boundingRect.width,
          height: boundingRect.height,
          bottom: boundingRect.bottom
        },
        clientRects: serializedRects
      });
    }
  }, [selection]);

  // Listen for document clicks to handle selection logic
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 relative">

      {/* Custom Highlight Overlay - Rendered absolutely relative to document to scroll correctly */}
      {selection && (
        <div className="absolute inset-0 pointer-events-none z-20 mix-blend-multiply">
          {selection.clientRects.map((rect, i) => (
            <div
              key={i}
              className="absolute bg-yellow-300/50 animate-in fade-in duration-200 rounded-[2px]"
              style={{
                // Add window.scrollY because the container is absolute relative to the document top
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height,
              }}
            />
          ))}
        </div>
      )}

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-30 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
            L
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight tracking-tight">leXearch</h1>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Chrome Extension Demo</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
            <Info className="w-3.5 h-3.5" />
            Select text to trigger AI
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <main className="pt-28 pb-20 px-6 md:px-12 max-w-[900px] mx-auto z-10 relative">

        {/* Article Area */}
        <article className="prose prose-lg prose-slate max-w-none bg-white p-8 md:p-16 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-8 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Interactive Demo Article
          </div>
          <ReactMarkdown components={{
            h1: ({ node, ...props }) => <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-6" {...props} />,
            p: ({ node, ...props }) => <p className="leading-loose text-slate-600 mb-6" {...props} />
          }}>
            {SAMPLE_ARTICLE}
          </ReactMarkdown>

          <div className="mt-16 p-8 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 not-prose">
            <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">?</span>
              How it works
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50">
                <div className="text-indigo-600 font-bold mb-1">01. Select</div>
                <p className="text-sm text-slate-500">Highlight any text in the article above.</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50">
                <div className="text-indigo-600 font-bold mb-1">02. Trigger</div>
                <p className="text-sm text-slate-500">Hover over the dot that appears near selection.</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50">
                <div className="text-indigo-600 font-bold mb-1">03. Insight</div>
                <p className="text-sm text-slate-500">Chat with AI directly in the popover.</p>
              </div>
            </div>
          </div>
        </article>

      </main>

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