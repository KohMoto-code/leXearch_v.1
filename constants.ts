
import { PromptTemplate } from './types';

export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: 'easy_summary',
    label: 'Easy Summary',
    iconName: 'Sparkles',
    promptText: 'Summarize the selected text so a high school student can easily understand it.',
    color: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
    pinned: true,
  },
  {
    id: 'context_deep_dive',
    label: 'Contextual Deep Dive',
    iconName: 'BookOpen',
    promptText: 'Provide a detailed explanation of the selected word or sentence, considering its meaning within the current context.',
    color: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
    pinned: true,
  },
  {
    id: 'critical_analysis',
    label: 'Critical Analysis',
    iconName: 'Scale',
    promptText: 'Critically analyze the selected passage and summarize the arguments for and against the viewpoints presented.',
    color: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
    pinned: true,
  },
  {
    id: 'next_steps',
    label: 'Next Steps / 3 Questions',
    iconName: 'HelpCircle',
    promptText: 'Suggest three related questions to facilitate further learning about this content.',
    color: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
    pinned: false,
  },
  {
    id: 'translate_english',
    label: 'Translate to English',
    iconName: 'Languages',
    promptText: 'Translate the selected text into natural-sounding English.',
    color: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
    pinned: false,
  }
];

export const SAMPLE_ARTICLE = `
# The Paradox of Choice in the Age of AI

In modern society, we are often told that more choice means more freedom, and more freedom means more welfare. However, psychologist Barry Schwartz argues that this is not always true. When presented with too many options, people often experience "choice paralysis" rather than liberation.

This phenomenon is increasingly relevant in the context of Artificial Intelligence. As Generative AI models proliferate, offering us infinite variations of text, images, and code, the cognitive load required to discern quality increases exponentially.

## The Jam Study

Consider the "Jam Study" conducted by Sheena Iyengar and Mark Lepper. In a gourmet food store, researchers set up a display of jams. In one condition, they offered 6 varieties; in another, they offered 24. While the larger display attracted more attention, the result was counterintuitive: consumers seeing the larger display were one-tenth as likely to buy jam as people seeing the small display.

## Implications for Design

The implication for AI interface design is profound. We are moving from a scarcity economy of information to an abundance economy of generation. The value proposition shifts from "creating content" to "curating content."

Therefore, tools that limit scope—that constrain the infinite canvas of AI into manageable, intent-driven workflows—may ironically provide the greatest sense of creative agency. This is the "Constraint-Creativity Hypothesis": the idea that boundaries, rather than total freedom, are the true catalysts of innovation.
`;
