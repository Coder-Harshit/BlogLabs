// src/components/Terminal.tsx
// This is the main React component that simulates a Text User Interface (TUI)
// for the Minimal Blog Experience. It focuses on keyboard-centric navigation
// through various content sections (blogs, about, projects, settings).
// Updated: Removed the CLI input prompt, made nano bar dynamic,
// and refined display for TUI-only navigation.
// Further updated: Integrated language-based syntax highlighting for code blocks,
// refined ASCII art bounding boxes, and now accepts blog posts as a prop.
// Fix: Safely handle localStorage access to prevent ReferenceError during SSR.
// Enhancement: Ensures fixed width for code blocks by calculating max raw line length
// and applying padding before highlighting.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript.js'; // JavaScript
import 'prismjs/components/prism-markup.js'; // HTML
import 'prismjs/components/prism-python.js'; // Python
import 'prismjs/components/prism-bash.js'; // Bash

// --- Type Definitions ---

// Defines the structure for a single line of displayable content in the terminal.
interface DisplayLine {
  type: 'text' | 'highlight' | 'title' | 'code' | 'error' | 'welcome' | 'prompt';
  value: string;
}

// Defines the structure for a blog post, including metadata and content.
// This type is now received as a prop, matching the output from minimal-blog.astro processing.
interface BlogPost {
  slug: string;
  title: string;
  author: string;
  date: string; // YYYY-MM-DD
  summary: string; // Short description for list view
  content: string[]; // Array of strings for paragraph/line-by-line content
  codeBlocks?: { language: string; code: string; }[]; // Structured for code blocks
}

// Defines the structure for a project entry.
interface Project {
  name: string;
  description: string;
  githubUrl: string;
}

// Defines the structure for settings options.
interface SettingOption {
  key: string;
  label: string;
  type: 'select' | 'boolean';
  options?: string[]; // For 'select' type
  currentValue?: string | boolean; // For display
}

// Props for the Terminal component
interface TerminalProps {
  blogPosts: BlogPost[]; // Now receives blog posts as a prop
}

// --- Mock Data (Only for projects and settings now, blogs come from props) ---

// Dummy projects data
const mockProjects: Project[] = [
  {
    name: 'BlogLabs Project',
    description: 'This very website, demonstrating TUI/CLI principles with Astro and React.',
    githubUrl: 'https://github.com/yourusername/bloglabs'
  },
  {
    name: 'CLI Game Engine',
    description: 'A personal project building a simple text-based adventure game engine.',
    githubUrl: 'https://github.com/yourusername/cli-game'
  }
];

// Dummy settings data. Values will be managed by localStorage.
const defaultSettings: SettingOption[] = [
  { key: 'themeMode', label: 'Theme Mode', type: 'select', options: ['terminal', 'light', 'dark'], currentValue: 'terminal' }, // 'terminal' is default for minimal
  { key: 'fontSize', label: 'Font Size', type: 'select', options: ['small', 'medium', 'large'], currentValue: 'medium' },
  { key: 'fontFamily', label: 'Font Family', type: 'select', options: ['Courier New', 'Ubuntu', 'IBM Plex Mono', 'Fira Code', 'JetBrains Mono', 'Tektur'], currentValue: 'Courier New' }, // Added more monospace fonts
  { key: 'showWelcome', label: 'Show Welcome on Home', type: 'boolean', currentValue: true },
  // { key: 'showHelpMenu', label: 'Show Help Menu', type: 'boolean', currentValue: true }
];


// --- Helper Functions for Content Rendering ---

const getWelcomeScreen = (): DisplayLine[] => {
  return [
    { type: 'welcome', value: '┌───────────────────────────────────┐' },
    { type: 'welcome', value: '│       Welcome to BlogLabs!        │' },
    { type: 'welcome', value: '└───────────────────────────────────┘' },
    { type: 'text', value: '' },
    { type: 'text', value: 'Navigate using ↑↓ arrows and Enter.' },
    // { type: 'text', value: 'Press \'h\' for Help, \'a\' for About, \'p\' for Projects, \'s\' for Settings.' },
    { type: 'text', value: 'Press \'a\' for About, \'p\' for Projects, \'s\' for Settings.' },
    { type: 'text', value: '' },
    { type: 'prompt', value: 'Choose an option below:' },
    { type: 'text', value: '' } // Empty line for spacing
  ];
};

const getMainMenuOptions = (): string[] => [
  'Blogs',
  'About Me',
  'Projects',
  'Settings',
  // 'Return to Grub Screen' // Optional: if we want a way to go back to the boot menu from here
];

const getBlogListDisplay = (highlightedIndex: number, blogs: BlogPost[]): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: '─── Blog Posts ───────────────────────' },
    { type: 'text', value: '' }
  ];
  blogs.forEach((blog, index) => {
    const isSelected = index === highlightedIndex;
    lines.push({
      type: isSelected ? 'highlight' : 'text',
      value: `${isSelected ? '> ' : '  '}${blog.title} (${blog.date})`
    });
  });
  lines.push({ type: 'text', value: '' });
  if (blogs[highlightedIndex]) {
    lines.push({ type: 'text', value: '─── Summary ──────────────────────────' });
    lines.push({ type: 'text', value: blogs[highlightedIndex].summary });
    lines.push({ type: 'text', value: '' });
  }
  return lines;
};

const getBlogPostDisplay = (blog: BlogPost): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: `─── ${blog.title} ───────────────────` },
    { type: 'text', value: `Author: ${blog.author} | Date: ${blog.date}` },
    { type: 'text', value: '──────────────────────────────────────' },
    { type: 'text', value: '' }
  ];

  // plain paragraphs
  blog.content.forEach(p => {
    lines.push({ type: 'text', value: p });
    lines.push({ type: 'text', value: '' });
  });

  // Prism‐highlighted fences
  if (blog.codeBlocks?.length) {
    lines.push({ type: 'title', value: '─── Code Samples ─────────────────────' });
    lines.push({ type: 'text', value: '' });

    blog.codeBlocks.forEach(({ language, code }) => {
      // Prism highlight
      const grammar = Prism.languages[language] || Prism.languages.javascript;
      const highlighted = Prism.highlight(code, grammar, language);
      const htmlBlock =
        `<pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>`;

      lines.push({ type: 'code', value: htmlBlock });
      lines.push({ type: 'text', value: '' });
    });
  }

  return lines;
};

const getAboutMeDisplay = (): DisplayLine[] => {
  return [
    { type: 'title', value: '─── About Me ─────────────────────────' },
    { type: 'text', value: '' },
    { type: 'text', value: 'Hello! I\'m BlogLabs Admin, a passionate developer and learner.' },
    { type: 'text', value: 'I love building web applications and exploring new technologies.' },
    { type: 'text', value: 'This platform is my space to share knowledge and projects.' },
    { type: 'text', value: 'You can reach me at: admin@bloglabs.com' },
    { type: 'text', value: '' },
    { type: 'text', value: '──────────────────────────────────────' },
    { type: 'text', value: '' }
  ];
};

const getProjectsDisplay = (projects: Project[]): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: '─── My Projects ──────────────────────' },
    { type: 'text', value: '' }
  ];
  projects.forEach(project => {
    lines.push({ type: 'text', value: `- ${project.name}` });
    lines.push({ type: 'text', value: `  ${project.description}` });
    lines.push({ type: 'text', value: `  GitHub: ${project.githubUrl}` });
    lines.push({ type: 'text', value: '' });
  });
  return lines;
};

const getSettingsDisplay = (settings: SettingOption[], highlightedIndex: number): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: '─── Settings ─────────────────────────' },
    { type: 'text', value: '' }
  ];

  settings.forEach((setting, index) => {
    const isSelected = index === highlightedIndex;
    let displayValue = '';
    if (setting.type === 'boolean') {
      displayValue = setting.currentValue ? '[X]' : '[ ]';
    } else if (setting.type === 'select' && setting.options) {
      displayValue = `[${setting.currentValue || 'N/A'}]`;
    }
    lines.push({
      type: isSelected ? 'highlight' : 'text',
      value: `${isSelected ? '> ' : '  '}${setting.label.padEnd(20)} ${displayValue}`
    });
  });

  lines.push({ type: 'text', value: '' });
  return lines;
};


// --- Main Terminal Component ---

const Terminal: React.FC<TerminalProps> = ({ blogPosts }) => { // Accept blogPosts as prop
  // Initialize userSettings with default values for SSR
  const [userSettings, setUserSettings] = useState<SettingOption[]>(defaultSettings);
  const [displayedContent, setDisplayedContent] = useState<DisplayLine[]>([]); // Current content to show
  const [currentView, setCurrentView] = useState<'main' | 'blogList' | 'blogContent' | 'about' | 'projects' | 'settings'>('main');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0); // For TUI menu navigation
  const [history, setHistory] = useState<('main' | 'blogList' | 'blogContent' | 'about' | 'projects' | 'settings')[]>(['main']); // To track navigation
  const [currentBlogSlug, setCurrentBlogSlug] = useState<string | null>(null); // For blogContent view

  // pull our settings flags
  const themeMode = userSettings.find(s => s.key === 'themeMode')?.currentValue as string || 'terminal';
  const showWelcome = userSettings.find(s => s.key === 'showWelcome')?.currentValue as boolean || false;
  const showHelpMenu = userSettings.find(s => s.key === 'showHelpMenu')?.currentValue as boolean || false;

  const terminalOutputRef = useRef<HTMLDivElement>(null); // Ref to scroll output area

  // Load settings from localStorage ONLY after component mounts on the client
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) { // Check if localStorage is available
        const storedSettings = localStorage.getItem('bloglabsSettings');
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          setUserSettings(prevSettings => defaultSettings.map(defaultSetting => {
            const found = parsed.find((s: SettingOption) => s.key === defaultSetting.key);
            return found ? { ...defaultSetting, currentValue: found.currentValue } : defaultSetting;
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load settings from localStorage:", e);
    }
  }, []); // Empty dependency array ensures this runs once on mount

  // Save settings to localStorage whenever they change, but only on the client
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) { // Check if localStorage is available
        localStorage.setItem('bloglabsSettings', JSON.stringify(userSettings));
      }
    }
    catch (e) {
      console.error("Failed to save settings to localStorage:", e);
    }
  }, [userSettings]);

  // Update terminal font based on settings

  // Apply CSS variables from settings
  useEffect(() => {
    const root = document.documentElement;
    const fm = userSettings.find(s => s.key === 'fontFamily')!.currentValue as string;
    const fs = userSettings.find(s => s.key === 'fontSize')!.currentValue as string;
    root.style.setProperty('--terminal-font-family', `"${fm}"`);
    root.style.setProperty('--terminal-font-size',
      fs === 'small' ? '0.85em' : fs === 'large' ? '1.15em' : '1em'
    );
    // update wrapper class
    root.setAttribute('data-bloglabs-theme', themeMode);
    // themeMode could toggle elsewhere if you add CSS classes…
  }, [userSettings]);

  // Handle display content update based on current view
  useEffect(() => {
    let content: DisplayLine[] = [];
    let currentOptionsLength = 0; // To correctly calculate selection bounds

    switch (currentView) {
      case 'main':
        const showWelcome = userSettings.find(s => s.key === 'showWelcome')?.currentValue;
        if (showWelcome) {
          content = getWelcomeScreen();
        }
        const mainOptions = getMainMenuOptions();
        content = [...content, ...mainOptions.map((option, index) => ({
          type: index === selectedOptionIndex ? 'highlight' : 'text',
          value: `${index === selectedOptionIndex ? '> ' : '  '}${option}`
        }))] as DisplayLine[];
        currentOptionsLength = mainOptions.length;
        break;
      case 'blogList':
        content = getBlogListDisplay(selectedOptionIndex, blogPosts); // Use blogPosts from props
        currentOptionsLength = blogPosts.length; // Use blogPosts from props
        break;
      case 'blogContent':
        const blog = blogPosts.find(b => b.slug === currentBlogSlug); // Use blogPosts from props
        if (blog) {
          content = getBlogPostDisplay(blog);
        } else {
          content = [{ type: 'error', value: 'Error: Blog not found.' }];
        }
        currentOptionsLength = 0; // No interactive options in this view
        break;
      case 'about':
        content = getAboutMeDisplay();
        currentOptionsLength = 0; // No interactive options
        break;
      case 'projects':
        content = getProjectsDisplay(mockProjects);
        currentOptionsLength = 0; // No interactive options
        break;
      case 'settings':
        content = getSettingsDisplay(userSettings, selectedOptionIndex);
        currentOptionsLength = userSettings.length;
        break;
    }
    setDisplayedContent(content);

    // Reset selection if it's out of bounds for the new view
    if (selectedOptionIndex >= currentOptionsLength && currentOptionsLength > 0) {
      setSelectedOptionIndex(0);
    } else if (currentOptionsLength === 0 && selectedOptionIndex !== 0) {
      setSelectedOptionIndex(0); // For views with no options
    }


    // // Ensure terminal scrolls to bottom after content update
    // if (terminalOutputRef.current) {
    //   terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight;
    // }
    // Scroll to top for blog content, otherwise to bottom
    if (terminalOutputRef.current) {
        terminalOutputRef.current.scrollTop = 0;
      // if (currentView === 'blogContent') {
      //   terminalOutputRef.current.scrollTop = 0;
      // } else {
      //   terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight;
      // }
    }
  }, [currentView, selectedOptionIndex, currentBlogSlug, userSettings, blogPosts]); // Add blogPosts to dependency array


  // --- Keyboard Navigation Logic ---

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default browser actions for navigation keys
    const preventDefaultKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter',
      'Backspace',
      'b', 'a', 'p', 's', 'c', 'escape', 'g',
      // vim motions
      'h', 'j', 'k', 'l'
    ];
    if (preventDefaultKeys.includes(e.key) || preventDefaultKeys.includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    // ── vim/arrow scroll only in content‐scrollable views ──
    const scrollEl = terminalOutputRef.current;
    const isScrollableView = ['blogContent', 'about', 'projects', 'settings'].includes(currentView);
    if (isScrollableView && scrollEl) {
      // down
      if (e.key === 'j' || e.key === 'ArrowDown') {
        scrollEl.scrollBy({ top: scrollEl.clientHeight * 0.8, behavior: 'smooth' });
        return;
      }
      // up
      if (e.key === 'k' || e.key === 'ArrowUp') {
        scrollEl.scrollBy({ top: -scrollEl.clientHeight * 0.8, behavior: 'smooth' });
        return;
      }
      // right
      if (e.key === 'l' || e.key === 'ArrowRight') {
        scrollEl.scrollBy({ left: 100, behavior: 'smooth' });
        return;
      }
      // left
      if (e.key === 'h' || e.key === 'ArrowLeft') {
        scrollEl.scrollBy({ left: -100, behavior: 'smooth' });
        return;
      }
    }

    let newSelectedOptionIndex = selectedOptionIndex;
    let handled = false;

    // --- Common Navigation / Hotkeys ---
    if (e.key === 'Backspace' || e.key.toLowerCase() === 'c') { // 'c' for cancel/back
      if (history.length > 1) { // If there's a history to go back to
        const prevView = history[history.length - 2];
        setHistory(prevHistory => prevHistory.slice(0, -1)); // Remove current view from history
        setCurrentView(prevView); // Go to previous view
        setSelectedOptionIndex(0); // Reset selection for previous view
        handled = true;
      } else if (currentView !== 'main') { // If only one history entry, go to main
        setHistory(['main']);
        setCurrentView('main');
        setSelectedOptionIndex(0);
        handled = true;
      }
      // } else if (e.key.toLowerCase() === 'h' && currentView !== 'main') { // 'h' for help (if not already on main welcome)
      //   setHistory(prev => [...prev, 'main']);
      //   setCurrentView('main');
      //   setSelectedOptionIndex(0);
      //   handled = true;
    } else if (e.key.toLowerCase() === 'b' && currentView !== 'blogList') { // 'b' for blogs
      setHistory(prev => [...prev, 'blogList']);
      setCurrentView('blogList');
      setSelectedOptionIndex(0);
      handled = true;
    } else if (e.key.toLowerCase() === 'a' && currentView !== 'about') { // 'a' for about
      setHistory(prev => [...prev, 'about']);
      setCurrentView('about');
      setSelectedOptionIndex(0);
      handled = true;
    } else if (e.key.toLowerCase() === 'p' && currentView !== 'projects') { // 'p' for projects
      setHistory(prev => [...prev, 'projects']);
      setCurrentView('projects');
      setSelectedOptionIndex(0);
      handled = true;
    } else if (e.key.toLowerCase() === 's' && currentView !== 'settings') { // 's' for settings
      setHistory(prev => [...prev, 'settings']);
      setCurrentView('settings');
      setSelectedOptionIndex(0);
      handled = true;
    } else if (e.key === 'Escape') {
      if (currentView === 'main') { // Esc to go to main (or back)
        window.location.href = '/'; // Redirect to home page
      } else {
        setHistory(['main']);
        setCurrentView('main');
        setSelectedOptionIndex(0);
        handled = true;
      }
    } else if (e.key.toLowerCase() === 'g') {
      window.open('https://github.com/Coder-Harshit/bloglabs');
      handled = true;
    }
    // } else if (e.key === 'Escape' && currentView !== 'main') { // Esc to go to main (or back)
    //     setHistory(['main']);
    //     setCurrentView('main');
    //     setSelectedOptionIndex(0);
    //     handled = true;
    // } else if (e.key === 'Escape' && currentView === 'settings') { // 's' for settings
    //     window.location.href = '/'; // Redirect to home page  
    //     setSelectedOptionIndex(0);
    //     handled = true;
    // }

    if (handled) return; // If a common hotkey was handled, stop here.

    // --- View-Specific Navigation ---
    switch (currentView) {
      case 'main':
        const mainOptions = getMainMenuOptions();
        if (e.key === 'ArrowUp') {
          newSelectedOptionIndex = (selectedOptionIndex - 1 + mainOptions.length) % mainOptions.length;
        } else if (e.key === 'ArrowDown') {
          newSelectedOptionIndex = (selectedOptionIndex + 1) % mainOptions.length;
        } else if (e.key === 'Enter') {
          const selectedOption = mainOptions[selectedOptionIndex];
          if (selectedOption === 'Blogs') {
            setHistory(prev => [...prev, 'blogList']);
            setCurrentView('blogList');
            setSelectedOptionIndex(0); // Reset selection for new view
          } else if (selectedOption === 'About Me') {
            setHistory(prev => [...prev, 'about']);
            setCurrentView('about');
            setSelectedOptionIndex(0);
          } else if (selectedOption === 'Projects') {
            setHistory(prev => [...prev, 'projects']);
            setCurrentView('projects');
            setSelectedOptionIndex(0);
          } else if (selectedOption === 'Settings') {
            setHistory(prev => [...prev, 'settings']);
            setCurrentView('settings');
            setSelectedOptionIndex(0);
          } else if (selectedOption === 'Reboot!') {
            // Optional: if we want a way to go back to the boot menu from here
            window.location.href = '/'; // Redirect to home page
          }
        }
        break;
      case 'blogList':
        if (e.key === 'ArrowUp') {
          newSelectedOptionIndex = (selectedOptionIndex - 1 + blogPosts.length) % blogPosts.length; // Use blogPosts.length
        } else if (e.key === 'ArrowDown') {
          newSelectedOptionIndex = (selectedOptionIndex + 1) % blogPosts.length; // Use blogPosts.length
        } else if (e.key === 'Enter') {
          const selectedBlog = blogPosts[selectedOptionIndex]; // Use blogPosts
          if (selectedBlog) {
            setHistory(prev => [...prev, 'blogContent']);
            setCurrentView('blogContent');
            setCurrentBlogSlug(selectedBlog.slug); // Store slug to load content
            // setSelectedOptionIndex(0); // No internal selection for content
          }
        }
        break;
      case 'settings':
        if (e.key === 'ArrowUp') {
          newSelectedOptionIndex = (selectedOptionIndex - 1 + userSettings.length) % userSettings.length;
        } else if (e.key === 'ArrowDown') {
          newSelectedOptionIndex = (selectedOptionIndex + 1) % userSettings.length;
        } else if (e.key === 'Enter') {
          const setting = userSettings[selectedOptionIndex];
          if (setting) {
            if (setting.type === 'boolean') {
              // Toggle boolean setting
              setUserSettings(prevSettings => prevSettings.map((s, idx) =>
                idx === selectedOptionIndex ? { ...s, currentValue: !s.currentValue } : s
              ));
            } else if (setting.type === 'select' && setting.options) {
              // Cycle through select options
              const currentOptIdx = setting.options.indexOf(setting.currentValue as string);
              const nextOptIdx = (currentOptIdx + 1) % setting.options.length;
              setUserSettings(prevSettings => prevSettings.map((s, idx) =>
                idx === selectedOptionIndex ? { ...s, currentValue: setting.options![nextOptIdx] } : s
              ));
            }
          }
        }
        break;
      case 'blogContent':
        break;
      case 'about':
        break;
      case 'projects':
        // These views primarily display content. Navigation out is via hotkeys (Backspace/C, H, A, P, S).
        // No specific arrow key navigation within them for now.
        break;
    }

    // Update selected index if it changed
    if (newSelectedOptionIndex !== selectedOptionIndex && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      setSelectedOptionIndex(newSelectedOptionIndex);
    }
  }, [selectedOptionIndex, currentView, history, userSettings, currentBlogSlug, blogPosts]); // Add blogPosts to dependency array


  // Add global keydown listener when component mounts
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleGlobalKeyDown]);

  // --- Render ---

  // Helper to determine active nano bar options
  const getNanoBarOptions = useCallback(() => {
    const options: { key: string; label: string; align?: string }[] = [];
    // Back/Cancel option always available if not on main view
    if (currentView !== 'main') {
      options.push({ key: '^C / Backspace', label: 'Back' });
    }
    // Add view-specific options
    switch (currentView) {
      case 'main':
        options.push({ key: '↑↓ Enter', label: 'Navigate/Select' });
        // options.push({ key: 'H', label: 'Help' }); // 'Help' is implicit in main view
        options.push({ key: 'B', label: 'Blogs' });
        options.push({ key: 'A', label: 'About' });
        options.push({ key: 'P', label: 'Projects' });
        options.push({ key: 'S', label: 'Settings' });
        options.push({ key: 'Esc', label: 'Reboot' });
        break;
      case 'blogList':
        options.push({ key: '↑↓ Enter', label: 'Navigate/Read' });
        // options.push({ key: 'H', label: 'Help' });
        break;
      case 'blogContent':
        options.push({ key: 'h/j/k/l', label: 'Scroll' });
        break;
      case 'about':
        options.push({ key: 'h/j/k/l', label: 'Scroll' });
        break;
      case 'projects':
        // options.push({ key: 'H', label: 'Help' }); // For returning to main menu
        options.push({ key: 'h/j/k/l', label: 'Scroll' });
        break;
      case 'settings':
        options.push({ key: '↑↓ Enter', label: 'Navigate/Change' });
        options.push({ key: 'h/j/k/l', label: 'Scroll' });
        // options.push({ key: 'H', label: 'Help' });
        break;
    }
    options.push({ key: 'G', label: 'GitHub', align: 'right' }); // Always show GitHub link
    return options;
  }, [currentView]);


  return (
    <div className={`terminal-wrapper theme-${themeMode}`}>
      <div className="terminal-header">BlogLabs Terminal</div>
      <div className="terminal-output" ref={terminalOutputRef}>
        {/* Render content based on current view */}
        {displayedContent.map((line, index) => {
          // Conditional rendering:
          // If line.type is 'code', use dangerouslySetInnerHTML
          // Otherwise, render line.value as children
          if (line.type === 'code') {
            return (
              <div
                key={index}
                className={`line ${line.type}`}
                dangerouslySetInnerHTML={{ __html: line.value }}
              ></div>
            );
          } else {
            return (
              <div
                key={index}
                className={`line ${line.type}`}
              >
                {line.value}
              </div>
            );
          }
        })}
        {/* The 'input-line' with prompt and cursor is only for the main menu,
            acting as a visual cue for where interaction is.
            It's not a real input field, just a display of the active state. */}
        {currentView === 'main' && (
          <div className="input-line">
            <span className="prompt">user@bloglabs:~/$ </span>
            <span className="cursor-block"></span> {/* Visual blinking cursor */}
          </div>
        )}
      </div>

      {/* Nano-like bar at the bottom */}
      <div className="nano-bar">
        {getNanoBarOptions().map((option, index) => (
          <span key={index} className={`nano-option ${option.align === 'right' ? ' nano-option--right' : ''}`}>
            {option.key}: {option.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Terminal;
