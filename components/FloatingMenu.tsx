import React, { useState, useEffect, useRef } from 'react';
import { PromptTemplate, SelectionData } from '../types';
import { Sparkles, Plus, Pencil, GripVertical, Check, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { generateExplanation } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface FloatingMenuProps {
  selection: SelectionData | null;
  prompts: PromptTemplate[];
  onClose: () => void;
  onUpdatePrompts: (prompts: PromptTemplate[]) => void;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

type MenuMode = 'CLOSED' | 'CHOOSE' | 'EDIT' | 'EDIT_FORM';

export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  selection,
  prompts,
  onClose,
  onUpdatePrompts,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Menu Logic
  const [menuMode, setMenuMode] = useState<MenuMode>('CLOSED');
  // Track where we came from to return correctly after adding/editing
  const [previousMenuMode, setPreviousMenuMode] = useState<MenuMode>('CHOOSE');

  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null); // The item currently being hovered over
  const [dragOverSection, setDragOverSection] = useState<'pinned' | 'unpinned' | null>(null); // The section currently being hovered

  // Hover state for animation
  const [isHovered, setIsHovered] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [customInput]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const promptListRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  // Reset UI state when selection changes
  // Track previous selection text to prevent resetting on scroll-induced coordinate updates
  const prevSelectionText = useRef<string | undefined>(undefined);

  // Reset UI state when selection text changes
  useEffect(() => {
    if (selection && selection.text !== prevSelectionText.current) {
      setIsOpen(false);
      setCustomInput('');
      setMessages([]);
      setMenuMode('CLOSED');
      setPreviousMenuMode('CHOOSE');
      setIsLoading(false);
      setPromptToDelete(null);
      prevSelectionText.current = selection.text;
    } else if (!selection) {
      prevSelectionText.current = undefined;
    }
  }, [selection]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle click outside the EXPANDED menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {

        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, isOpen, menuMode]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setCustomInput('');
    setMenuMode('CLOSED');
    setIsLoading(true);

    try {
      // Check if we are in a Chrome Extension environment
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        // Extension Mode
        try {
          chrome.runtime.sendMessage(
            {
              action: "generateExplanation",
              payload: { selectedText: selection!.text, context: selection!.context, userPrompt: text }
            },
            (response) => {
              if (chrome.runtime.lastError) {
                const errorMsg = chrome.runtime.lastError.message;
                console.error("Runtime Error:", errorMsg);
                // If context is invalidated, this usually happens here
                const errorStr = chrome.runtime.lastError.message || "Runtime error";
                if (errorStr.includes("Extension context invalidated")) {
                  const errorMsg: ChatMessage = { role: 'ai', text: "Extension updated. Please reload this page.", timestamp: Date.now() };
                  setMessages(prev => [...prev, errorMsg]);
                  setIsLoading(false);
                  return;
                }

                fallbackToWebMode(text);
                return;
              }

              if (response && response.success) {
                const aiMsg: ChatMessage = { role: 'ai', text: response.text, timestamp: Date.now() };
                setMessages(prev => [...prev, aiMsg]);
                setIsLoading(false);
              } else {
                const errorText = response?.error ? `Error: ${response.error}` : "Sorry, I couldn't process that request (No response).";
                const errorMsg: ChatMessage = { role: 'ai', text: errorText, timestamp: Date.now() };
                setMessages(prev => [...prev, errorMsg]);
                setIsLoading(false);
              }
            }
          );
        } catch (e: any) {
          // Catch synchronous errors like "Extension context invalidated" if accessing chrome.runtime throws
          console.error("Sync Runtime Error:", e);
          const errorMsg: ChatMessage = { role: 'ai', text: `Extension Error: ${e.message || e}. Please reload the page.`, timestamp: Date.now() };
          setMessages(prev => [...prev, errorMsg]);
          setIsLoading(false);
        }
      } else {
        // Web Mode (Localhost)
        await fallbackToWebMode(text);
      }
    } catch (e: any) {
      console.error("Send Error:", e);
      const errorMsg: ChatMessage = { role: 'ai', text: `System Error: ${e.message || e}`, timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
      setIsLoading(false);
    }
  };

  const fallbackToWebMode = async (text: string) => {
    try {
      const response = await generateExplanation(selection!.text, text, selection!.context);
      const aiMsg: ChatMessage = { role: 'ai', text: response, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      console.error("Web Mode Error:", e);
      const errorMsg: ChatMessage = { role: 'ai', text: `Fallback Error: ${e.message || e}`, timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(customInput);
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverItem = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Critical: Prevent bubbling to section container
    if (draggedId === targetId) return;
    setDragOverId(targetId);
    setDragOverSection(null);
  };

  const handleDragOverSection = (e: React.DragEvent, section: 'pinned' | 'unpinned') => {
    e.preventDefault();
    setDragOverSection(section);
    // Critical fix: Clear specific item target so dropping on empty section works
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    setDragOverSection(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string | null, targetIsPinned: boolean) => {
    e.preventDefault();
    e.stopPropagation(); // Stop bubbling
    setDragOverId(null);
    setDragOverSection(null);

    if (!draggedId) return;
    if (draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const prev = [...prompts];
    const draggedItem = prev.find(p => p.id === draggedId);
    if (!draggedItem) return;

    // Remove dragged item from list
    const newList = prev.filter(p => p.id !== draggedId);

    // Update pinned status based on drop target section
    const updatedItem = { ...draggedItem, pinned: targetIsPinned };

    if (targetId) {
      // Dropped onto another item
      const targetIndex = newList.findIndex(p => p.id === targetId);
      if (targetIndex !== -1) {
        // Insert before target
        newList.splice(targetIndex, 0, updatedItem);
      } else {
        newList.push(updatedItem);
      }
    } else {
      // Dropped onto a section header or empty area
      if (targetIsPinned) {
        const firstPinnedIdx = newList.findIndex(p => p.pinned);
        if (firstPinnedIdx !== -1) newList.splice(firstPinnedIdx, 0, updatedItem);
        else newList.unshift(updatedItem); // No pinned items, put at very start
      } else {
        // For unpinned
        newList.push(updatedItem);
      }
    }
    onUpdatePrompts(newList);
    setDraggedId(null);
  };

  // --- CRUD Logic ---

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPromptToDelete(id);
  };

  const confirmDelete = () => {
    if (promptToDelete) {
      const newList = prompts.filter(p => p.id !== promptToDelete);
      onUpdatePrompts(newList);
      setPromptToDelete(null);
    }
  };

  const cancelDelete = () => {
    setPromptToDelete(null);
  };

  const handleAddPrompt = () => {
    setPreviousMenuMode(menuMode);
    setEditingPrompt({
      id: '', // Empty ID indicates new prompt
      label: '',
      promptText: '',
      iconName: 'Sparkles',
      color: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
      pinned: false,
    });
    setMenuMode('EDIT_FORM');
  };

  const handleEditPrompt = (e: React.MouseEvent, prompt: PromptTemplate) => {
    e.stopPropagation();
    setPreviousMenuMode('EDIT');
    setEditingPrompt(prompt);
    setMenuMode('EDIT_FORM');
  };

  const savePromptEdit = (id: string, newLabel: string, newText: string) => {
    let newList: PromptTemplate[];
    if (id) {
      // Edit existing
      newList = prompts.map(p =>
        p.id === id ? { ...p, label: newLabel, promptText: newText } : p
      );
    } else {
      // Create new
      const newPrompt: PromptTemplate = {
        id: Date.now().toString(), // Simple ID generation
        label: newLabel || 'New Prompt',
        promptText: newText,
        iconName: 'Sparkles',
        color: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
        pinned: false
      };
      newList = [...prompts, newPrompt];
    }
    onUpdatePrompts(newList);
    setEditingPrompt(null);
    // Return to previous mode (Choose or Edit)
    setMenuMode(previousMenuMode === 'CLOSED' ? 'CHOOSE' : previousMenuMode);
  };

  const handleBackFromEdit = () => {
    setEditingPrompt(null);
    setMenuMode(previousMenuMode === 'CLOSED' ? 'CHOOSE' : previousMenuMode);
  };

  // --- Render Helpers ---

  if (!selection) return null;

  // Position logic
  // Use the last client rect to anchor the menu to the end of the selection (last line)
  // This prevents the menu from appearing detached in multi-line selections
  const lastRect = selection.clientRects && selection.clientRects.length > 0
    ? selection.clientRects[selection.clientRects.length - 1]
    : null;

  let referenceBottom = selection.boundingRect.bottom;
  let referenceLeft = selection.boundingRect.left;
  let referenceWidth = selection.boundingRect.width;

  if (lastRect) {
    referenceBottom = lastRect.top + lastRect.height;
    referenceLeft = lastRect.left;
    referenceWidth = lastRect.width;
  }

  const top = referenceBottom + 12; // No scrollY needed for fixed positioning
  const centerX = referenceLeft + (referenceWidth / 2); // No scrollX needed

  let left = centerX;

  if (isOpen) {
    left = Math.min(Math.max(centerX - 250, 10), window.innerWidth - 520);
  } else {
    // Center the 32px touch target (16px dot + 16px padding from p-2)
    left = centerX - 16;
  }

  const pinnedPrompts = prompts.filter(p => p.pinned);
  const unpinnedPrompts = prompts.filter(p => !p.pinned);

  if (!isOpen) {
    return (
      <div
        className="absolute z-50"
        style={{
          top,
          left,
          pointerEvents: 'auto' // FORCE interactivity
        }}
        onMouseDown={(e) => {
          // Prevent selection clearing when clicking the menu
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseEnter={() => {
            setIsHovered(true);
            setIsOpen(true);
          }}
          onMouseLeave={() => setIsHovered(false)}
          className="rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            colorScheme: 'normal',
            filter: 'none',
          }}
        >
          <div
            className="rounded-full transition-transform duration-200"
            style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#000000',
              colorScheme: 'normal',
              filter: 'none',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            }}
          />
        </button>
      </div>
    );
  }


  const renderPromptItem = (p: PromptTemplate, isEditMode: boolean) => {
    const isDraggingThis = draggedId === p.id;
    const isDropTarget = dragOverId === p.id;

    return (
      <div
        key={p.id}
        draggable={isEditMode}
        onDragStart={(e) => isEditMode && handleDragStart(e, p.id)}
        onDragOver={(e) => isEditMode && handleDragOverItem(e, p.id)}
        onDrop={(e) => isEditMode && handleDrop(e, p.id, p.pinned)}
        onDragEnd={handleDragEnd}
        onClick={() => !isEditMode && handleSend(p.promptText)}
        className={`relative w-full px-4 h-12 text-sm text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-solid border-slate-200 last:border-none cursor-pointer group ${isDraggingThis ? 'opacity-40 bg-slate-100' : ''}`}
        style={{ borderBottom: '1px solid #e2e8f0' }}
      >
        {/* Visual Insertion Indicator */}
        {isEditMode && isDropTarget && !isDraggingThis && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-600 z-10 shadow-[0_0_4px_rgba(79,70,229,0.6)]" />
        )}

        {isEditMode && (
          <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500">
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        <span className="truncate flex-1 font-medium text-slate-600">{p.label}</span>

        {isEditMode && (
          <div className="flex items-center gap-1 invisible group-hover:visible transition-all">
            {/* Delete Action */}
            <div className="relative group/btn">
              <button
                onClick={(e) => handleDeleteClick(e, p.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/btn:block bg-slate-900 text-white text-[10px] font-medium py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                Delete
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>

            {/* Edit Action */}
            <button
              onClick={(e) => handleEditPrompt(e, p)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  };

  const renderEditForm = () => {
    if (!editingPrompt) return null;
    const isNew = !editingPrompt.id;

    return (
      <div className="w-full h-[400px] bg-white rounded-xl shadow-2xl border border-solid border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200 p-4 gap-4" style={{ border: '1px solid #e2e8f0', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <button onClick={handleBackFromEdit} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isNew ? 'Create Prompt' : 'Edit Prompt'}
          </span>
        </div>

        <form
          id="edit-prompt-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const label = (form.elements.namedItem('label') as HTMLInputElement).value;
            const text = (form.elements.namedItem('text') as HTMLTextAreaElement).value;
            savePromptEdit(editingPrompt.id, label, text);
          }}
          className="flex flex-col gap-3 flex-1 h-full"
        >
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Label</label>
            <input
              name="label"
              defaultValue={editingPrompt.label}
              placeholder="e.g., Explain like I'm 5"
              style={{ padding: '12px 20px' }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1 flex-1 flex flex-col">
            <label className="text-xs font-semibold text-slate-500">Prompt Text</label>
            <textarea
              name="text"
              defaultValue={editingPrompt.promptText}
              placeholder="e.g., Explain the selected text in very simple terms."
              style={{ padding: '16px 20px' }}
              className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-all"
              required
            />
          </div>
          <button type="submit" className="mt-auto w-full py-3 !bg-slate-900 !text-white rounded-full text-sm font-bold shadow-lg hover:!bg-slate-800 transition-all transform active:scale-[0.98]">
            {isNew ? 'Create Prompt' : 'Save Changes'}
          </button>
        </form>
      </div>
    );
  };

  const renderPromptList = () => {
    const isEditMode = menuMode === 'EDIT';

    if (menuMode === 'EDIT_FORM') return renderEditForm();

    return (
      <div
        className="w-full h-[400px] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-solid border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 origin-bottom-right relative font-sans"
        style={{ pointerEvents: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >

        {/* Delete Confirmation Overlay */}
        {promptToDelete && (
          <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-5 w-full max-w-[260px] ring-1 ring-black/5 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Delete Prompt?</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Are you sure you want to remove this prompt? This cannot be undone.
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-white !bg-red-600 hover:!bg-red-700 rounded-lg shadow-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {isEditMode ? 'Edit Prompts' : 'Choose Prompt'}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddPrompt}
              className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMenuMode(isEditMode ? 'CHOOSE' : 'EDIT')}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              {isEditMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Pinned Section */}
          <div
            className={`px-4 py-2 bg-slate-50/50 border-b border-solid border-slate-200 transition-colors duration-200 ${isEditMode && draggedId ? 'cursor-copy' : ''
              } ${isEditMode && (dragOverSection === 'pinned' || (draggedId && !dragOverSection))
                ? 'bg-indigo-50 border-indigo-100'
                : ''
              }`}
            onDragOver={(e) => isEditMode && handleDragOverSection(e, 'pinned')}
            onDrop={(e) => isEditMode && handleDrop(e, null, true)}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isEditMode && dragOverSection === 'pinned' ? 'text-indigo-600' : 'text-slate-400'
              }`}>
              Pinned
            </span>
          </div>
          <div
            className={`min-h-[10px] ${isEditMode && draggedId && dragOverSection === 'pinned' ? 'bg-indigo-50/30' : ''}`}
            onDragOver={(e) => isEditMode && handleDragOverSection(e, 'pinned')}
            onDrop={(e) => isEditMode && handleDrop(e, null, true)}
          >
            {pinnedPrompts.length > 0 ? (
              pinnedPrompts.map(p => renderPromptItem(p, isEditMode))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400 italic bg-white pointer-events-none">No pinned prompts</div>
            )}
          </div>

          {/* Unpinned Section */}
          <div
            className={`px-4 py-2 bg-slate-50/50 border-b border-solid border-slate-200 border-t transition-colors duration-200 ${isEditMode && draggedId ? 'cursor-copy' : ''
              } ${isEditMode && dragOverSection === 'unpinned'
                ? 'bg-indigo-50 border-indigo-100'
                : ''
              }`}
            onDragOver={(e) => isEditMode && handleDragOverSection(e, 'unpinned')}
            onDrop={(e) => isEditMode && handleDrop(e, null, false)}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isEditMode && dragOverSection === 'unpinned' ? 'text-indigo-600' : 'text-slate-400'
              }`}>
              Unpinned
            </span>
          </div>
          <div
            className={`min-h-[40px] pb-2 ${isEditMode && draggedId && dragOverSection === 'unpinned' ? 'bg-indigo-50/30' : ''}`}
            onDragOver={(e) => isEditMode && handleDragOverSection(e, 'unpinned')}
            onDrop={(e) => isEditMode && handleDrop(e, null, false)}
          >
            {unpinnedPrompts.length > 0 ? (
              unpinnedPrompts.map(p => renderPromptItem(p, isEditMode))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400 italic bg-white pointer-events-none">No other prompts</div>
            )}
          </div>
        </div>
      </div>
    )
  };



  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-[500px] max-w-[95vw] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-solid border-slate-200 flex flex-col font-sans pointer-events-auto"
      style={{ top, left, pointerEvents: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        // Close prompt list if clicked outside of it within the menu container
        if (menuMode !== 'CLOSED' && promptListRef.current && !promptListRef.current.contains(e.target as Node)) {
          // Ignore clicks on the toggle button as it handles its own logic
          if (toggleBtnRef.current && toggleBtnRef.current.contains(e.target as Node)) {
            return;
          }

          setMenuMode('CLOSED');
        }
      }}
    >
      {/* Chat Content Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 p-6 overflow-y-auto max-h-[60vh] min-h-[160px] bg-white custom-scrollbar space-y-6 relative rounded-t-2xl"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col h-full justify-end items-end space-y-2 pb-2">
            {/* Show ALL PINNED prompts in the chat bubble suggestions */}
            {pinnedPrompts.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSend(p.promptText)}
                style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#cbd5e1' }} // slate-300 default
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#94a3b8'} // slate-400 hover
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                className="px-4 py-2 bg-white text-slate-600 text-sm rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all shadow-sm text-left max-w-[90%]"
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="w-full">
              {msg.role === 'user' ? (
                <div className="flex justify-end mb-4">
                  <div className="bg-slate-100 text-slate-600 px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[85%]">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* Content - Full Width, No Bubble */}
                  <div className="prose prose-sm prose-slate max-w-none text-slate-800 leading-relaxed">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="w-full animate-pulse pt-2">
            <div className="flex items-center gap-2 mb-2 text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Thinking...</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-slate-100 rounded w-3/4"></div>
              <div className="h-2 bg-slate-100 rounded w-1/2"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Removed border-t */}
      <div className="p-4 bg-white relative z-20 rounded-b-2xl">

        {/* Choose Prompt / Edit Prompt Overlay */}
        {menuMode !== 'CLOSED' && (
          <div ref={promptListRef} className="absolute bottom-[calc(100%-8px)] right-4 w-[320px] z-40 shadow-xl rounded-xl">
            {renderPromptList()}
          </div>
        )}

        <form
          onSubmit={handleCustomSubmit}
          style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#cbd5e1' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
          className="relative flex flex-col bg-white rounded-[28px] shadow-sm transition-all focus-within:ring-2 focus-within:ring-slate-200 overflow-hidden"
        >
          <textarea
            ref={inputRef}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCustomSubmit(e);
              }
            }}
            rows={1}
            placeholder="Ask anything about the text..."
            style={{ padding: '20px 32px', boxSizing: 'border-box' }}
            className="w-full min-h-[2.5rem] bg-transparent border-none text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm resize-none overflow-hidden whitespace-pre-wrap break-words"
          />

          {/* Combined Send/Dropdown Button */}
          <div className="flex justify-end px-2 pb-2">
            <div className="flex items-center h-10 bg-[#0F172A] rounded-full shadow-md group transition-all overflow-hidden ring-1 ring-white/10">
              <button
                type="submit"
                disabled={!customInput.trim() && !isLoading}
                className="flex items-center justify-center h-full pl-5 pr-3 text-white hover:text-white/80 transition-colors disabled:opacity-50 disabled:text-slate-400"
              >
                <span className="text-sm font-medium">Send</span>
              </button>

              {/* Divider */}
              <div className="w-[1px] h-full bg-white/40"></div>

              <button
                ref={toggleBtnRef}
                type="button"
                onClick={() => {
                  if (menuMode === 'EDIT' || menuMode === 'EDIT_FORM') return;
                  setMenuMode(prev => prev === 'CLOSED' ? 'CHOOSE' : 'CLOSED');
                }}
                className="flex items-center justify-center h-full pl-2 pr-3 text-white hover:text-white/80 transition-colors"
              >
                <div className={`transition-transform duration-200 ${menuMode !== 'CLOSED' ? 'rotate-180' : ''}`}>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
