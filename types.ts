
export interface PromptTemplate {
  id: string;
  label: string;
  iconName: string; // Lucide icon name
  promptText: string; // The actual instruction sent to LLM
  color: string; // Tailwind color class for badge/button
  pinned: boolean;
}

export interface SelectionData {
  text: string;
  context?: string; // Surrounding text for context
  // The bounding rect of the entire selection (for menu positioning)
  boundingRect: { top: number; left: number; width: number; height: number; bottom: number };
  // The individual rects for each line/segment (for visual highlighting)
  clientRects: { top: number; left: number; width: number; height: number }[];
}

export interface HistoryItem {
  id: string;
  selectedText: string;
  promptUsed: string;
  response: string;
  timestamp: number;
}

export enum ViewMode {
  READING = 'READING',
  SETTINGS = 'SETTINGS',
}
