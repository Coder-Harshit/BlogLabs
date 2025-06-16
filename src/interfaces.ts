// Defines the structure for a single line of displayable content in the terminal.
export interface DisplayLine {
  type: 'text' | 'highlight' | 'title' | 'code' | 'error' | 'welcome' | 'prompt';
  value: string;
  isInteractive?: boolean;
  optionIndex?: number;
  isHtml?: boolean
}

// Defines the structure for a blog post, including metadata and content.
// This type is now received as a prop, matching the output from minimal-blog.astro processing.
export interface BlogPost {
  slug: string;
  title: string;
  author: string;
  date: string; // YYYY-MM-DD
  summary: string; // Short description for list view
  content: string[]; // Array of strings for paragraph/line-by-line content
  codeBlocks?: { language: string; code: string; }[]; // Structured for code blocks
}

// Defines the structure for a project entry.
export interface Project {
  name: string;
  description: string;
  githubUrl: string;
  content: string[];
  liveUrl?: string; // Optional live URL for the project
}

// Defines the structure for settings options.
export interface SettingOption {
  key: string;
  label: string;
  type: 'select' | 'boolean';
  options?: string[]; // For 'select' type
  currentValue?: string | boolean; // For display
}

// Defines the structure for about content.
export interface AboutContent {
  title: string;
  bodyLines: string[];
}

// Props for the Terminal component
export interface TerminalProps {
  blogPosts: BlogPost[]; // Now receives blog posts as a prop
  aboutContent: AboutContent; // Now receives about content as a prop
  projects: Project[]; // Now receives projects as a prop
}

export interface BlogPostContent {
  slug: string;
  title: string;
  author: string;
  date: string;
  summary: string;
  content: string[];
  codeBlocks?: { language: string; code: string }[];
}

export interface ProjectContent {
  name: string;
  description: string;
  githubUrl: string;
  liveUrl?: string; // Optional live URL for the project
  content: string[];
}