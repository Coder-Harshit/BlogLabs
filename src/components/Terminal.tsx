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

import { isMobile } from '../utils/isMobileDevice';
import { getLolcatHtml } from '../utils/lolcat';

import type {
  BlogPost,
  DisplayLine,
  SettingOption,
  AboutContent,
  Project,
  TerminalProps,
} from '../interfaces';

// --- Type Definitions ---


// --- Mock Data (Only for projects and settings now, blogs come from props) ---

// // Dummy projects data
// const mockProjects: Project[] = [
//   {
//     name: 'BlogLabs Project',
//     description: 'This very website, demonstrating TUI/CLI principles with Astro and React.',
//     githubUrl: 'https://github.com/yourusername/bloglabs'
//   },
//   {
//     name: 'CLI Game Engine',
//     description: 'A personal project building a simple text-based adventure game engine.',
//     githubUrl: 'https://github.com/yourusername/cli-game'
//   }
// ];

// Dummy settings data. Values will be managed by localStorage.
const defaultSettings: SettingOption[] = [
  { key: 'themeMode', label: 'Theme Mode', type: 'select', options: ['terminal', 'light', 'dark'], currentValue: 'terminal' }, // 'terminal' is default for minimal
  { key: 'fontSize', label: 'Font Size', type: 'select', options: ['small', 'medium', 'large'], currentValue: 'medium' },
  { key: 'fontFamily', label: 'Font Family', type: 'select', options: ['Courier New', 'Ubuntu', 'IBM Plex Mono', 'Fira Code', 'JetBrains Mono', 'Tektur'], currentValue: 'Courier New' }, // Added more monospace fonts
  { key: 'showWelcome', label: 'Show Welcome on Home', type: 'boolean', currentValue: true },
  // { key: 'showHelpMenu', label: 'Show Help Menu', type: 'boolean', currentValue: true }
];


// --- Helper Functions for Content Rendering ---

// const getLolcatHtml = (text: string): string => {
//   const colors = [
//     '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF' // Rainbow colors
//     // Or use your terminal theme colors
//     // '#C586C0', '#CE9178', '#6A9955', '#B5CEA8', '#4EC9B0', '#DCDCAA', '#9CDCFE', '#569CD6'
//   ];
//   const CHARS_PER_COLOR_SEGMENT = 1.75; // Adjust this for frequency
//   return text.split('').map((char, index) => {
//     if (char === ' ') return ' '; // Preserve spaces
//     const colorIndex = Math.floor(index / CHARS_PER_COLOR_SEGMENT) % colors.length;
//     return `<span style="color: ${colors[colorIndex]}; text-shadow: none;">${char}</span>`;
//   }).join('');
// };

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
      value: `${isSelected ? '> ' : '  '}${blog.title} (${blog.date})`,
      isInteractive: true,
      optionIndex: index
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

const getAboutMeDisplay = (aboutData: AboutContent): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: `─── ${aboutData.title} ${'─'.repeat(Math.max(0, 30 - aboutData.title.length))} ` },
    { type: 'text', value: '' }, // Blank line after title
  ];

  aboutData.bodyLines.forEach(htmlLine => {
    // Each htmlLine is an HTML string from a Markdown paragraph.
    // Use type 'code' to leverage existing dangerouslySetInnerHTML rendering.
    // If the line is empty (e.g. from an empty paragraph in MD), render it as an empty text line for spacing.
    if (htmlLine.trim() === "") {
      lines.push({ type: 'text', value: '' });
    } else {
      lines.push({ type: 'code', value: htmlLine });
    }
    // Add an empty text line after each paragraph's content for better readability,
    // unless it's the last line or the line itself was just for spacing.
    if (htmlLine.trim() !== "") {
      lines.push({ type: 'text', value: '' });
    }
  });

  // Ensure there's at least one blank line before the separator if content was added
  if (aboutData.bodyLines.length > 0 && lines[lines.length - 1]?.value !== '') {
    lines.push({ type: 'text', value: '' });
  } else if (aboutData.bodyLines.length === 0) {
    // If no body lines, add a placeholder or just a blank line
    lines.push({ type: 'text', value: '(No additional content)' });
    lines.push({ type: 'text', value: '' });
  }

  lines.push({ type: 'text', value: '──────────────────────────────────────' });
  lines.push({ type: 'text', value: '' });
  return lines;
};

// const getProjectsDisplay = (projects: Project[]): DisplayLine[] => {
//   const lines: DisplayLine[] = [
//     { type: 'title', value: '─── My Projects ──────────────────────' },
//     { type: 'text', value: '' }
//   ];
//   if (projects.length === 0) {
//     lines.push({ type: 'text', value: 'No projects to display yet.' });
//     lines.push({ type: 'text', value: '' });
//   } else {
//     projects.forEach(project => {
//       lines.push({ type: 'text', value: `- ${project.name}` });
//       lines.push({ type: 'text', value: `  ${project.description}` }); // Uses frontmatter description
//       lines.push({ type: 'text', value: `  GitHub: ${project.githubUrl}` });
//       {
//         project.liveUrl &&
//           lines.push({ type: 'text', value: `  Live: ${project.liveUrl}` });
//       }
//       // If you added 'details' to the Project interface and processed them:
//       // if (project.details && project.details.length > 0) {
//       //   lines.push({ type: 'text', value: '  Details:' });
//       //   project.details.forEach(detailLine => {
//       //     lines.push({ type: 'text', value: `    ${detailLine}` });
//       //   });
//       // }
//       // Display processed body content
//       if (project.content && project.content.length > 0) {
//         lines.push({ type: 'text', value: '' }); // Add a little space before body details
//         project.content.forEach(content => {
//           // Assuming contents are pre-processed HTML snippets like 'About Me'
//           lines.push({ type: 'code', value: content });
//         });
//       }
//       lines.push({ type: 'text', value: '' }); // Space after each project
//     });
//   }
//   return lines;
// };

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
      value: `${isSelected ? '> ' : '  '}${setting.label.padEnd(20)} ${displayValue}`,
      isInteractive: true,
      optionIndex: index
    });
  });

  lines.push({ type: 'text', value: '' });
  return lines;
};

// ...after getAboutMeDisplay...

const getProjectListDisplay = (projectsData: Project[], highlightedIndex: number): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: '─── My Projects ──────────────────────' },
    { type: 'text', value: '' }
  ];
  if (projectsData.length === 0) {
    lines.push({ type: 'text', value: 'No projects to display yet.' });
  } else {
    projectsData.forEach((project, index) => {
      const isSelected = index === highlightedIndex;
      // Use lolcat for the name in the list view as well, or keep it simple
      // const displayName = isSelected ? `> ${project.name}` : `  ${project.name}`;
      // For lolcat in list (might be too much, but for consistency):
      const lolcatName = getLolcatHtml(project.name);
      lines.push({
        // type: isSelected ? 'highlight' : 'code', // Use 'code' for dangerouslySetInnerHTML
        type: isSelected ? 'highlight' : 'code', // Use 'code' for dangerouslySetInnerHTML
        value: `${isSelected ? '> ' : '  '}${lolcatName}`, // Add opacity for non-selected items
        isInteractive: true,
        optionIndex: index,
        isHtml: true,
      });
      lines.push({ type: 'text', value: `    ${project.description}` }); // Show short desc
      lines.push({ type: 'text', value: '' });
    });
  }
  lines.push({ type: 'text', value: '' });
  return lines;
};

const getProjectContentDisplay = (project: Project | null): DisplayLine[] => {
  if (!project) {
    return [{ type: 'error', value: 'Error: Project not found.' }];
  }
  const lines: DisplayLine[] = [
    // Use 'code' type for the lolcat name to render HTML
    { type: 'code', value: `─── ${getLolcatHtml(project.name)} ${'─'.repeat(Math.max(0, 30 - project.name.length))} ` },
    { type: 'text', value: '' },
    { type: 'text', value: `Description: ${project.description}` }, // Frontmatter description
    { type: 'text', value: `GitHub: ${project.githubUrl}` },
  ];

  if (project.liveUrl) {
    lines.push({ type: 'text', value: `Live URL: ${project.liveUrl}` });
  }
  lines.push({ type: 'text', value: '' });

  // Display processed body content (project.bodyLines was mapped to project.content in index.astro)
  if (project.content && project.content.length > 0) {
    lines.push({ type: 'title', value: '─── Details ────────────────────────' });
    lines.push({ type: 'text', value: '' });
    project.content.forEach(bodyLine => {
      lines.push({ type: 'code', value: bodyLine }); // Assuming bodyLine is HTML
      lines.push({ type: 'text', value: '' }); // Add spacing after each body line
    });
  } else {
    lines.push({ type: 'text', value: '(No additional details provided)' });
    lines.push({ type: 'text', value: '' });
  }
  lines.push({ type: 'text', value: '──────────────────────────────────────' });
  lines.push({ type: 'text', value: '' });
  return lines;
};

// Remove or comment out the old getProjectsDisplay function
// const getProjectsDisplay = (projectsData: Project[]): DisplayLine[] => { ... };

// --- Main Terminal Component ---

const Terminal: React.FC<TerminalProps> = ({ blogPosts, aboutContent, projects }) => { // Accept blogPosts and aboutContent as props
  // Initialize userSettings with default values for SSR
  const [userSettings, setUserSettings] = useState<SettingOption[]>(defaultSettings);
  const [displayedContent, setDisplayedContent] = useState<DisplayLine[]>([]); // Current content to show
  const [currentView, setCurrentView] = useState<'main' | 'blogList' | 'blogContent' | 'about' | 'projects' | 'settings' | 'projectList' | 'projectContent'>('main');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0); // For TUI menu navigation
  const [history, setHistory] = useState<('main' | 'blogList' | 'blogContent' | 'about' | 'projects' | 'settings' | 'projectList' | 'projectContent')[]>(['main']); // To track navigation
  const [currentBlogSlug, setCurrentBlogSlug] = useState<string | null>(null); // For blogContent view
  const [currentProjectIndex, setCurrentProjectIndex] = useState<number | null>(null); // For projectContent view
  // pull our settings flags
  const themeMode = userSettings.find(s => s.key === 'themeMode')?.currentValue as string || 'terminal';
  const terminalWrapperRef = useRef<HTMLDivElement>(null); // Assuming you have this for focus
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null); // For standard cursor auto-hide

  const terminalOutputRef = useRef<HTMLDivElement>(null); // Ref to scroll output area

  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  useEffect(() => {
    console.log(isMobile());
    setIsTouchDevice(isMobile()); // Check if the device is touch-enabled
  }, []);

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
          value: `${index === selectedOptionIndex ? '> ' : '  '}${option}`,
          isInteractive: true,
          optionIndex: index
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
        content = getAboutMeDisplay(aboutContent); // Use aboutContent from props
        currentOptionsLength = 0; // No interactive options
        break;
      case 'projects':
        setCurrentView('projectList');
        setHistory(prev => [...prev, 'projectList']);
        currentOptionsLength = projects.length; // No interactive options
        break;
      case 'projectList':
        content = getProjectListDisplay(projects, selectedOptionIndex);
        currentOptionsLength = projects.length;
        break;
      case 'projectContent':
        const selectedProject = (currentProjectIndex !== null && currentProjectIndex >= 0 && projects[currentProjectIndex]) ? projects[currentProjectIndex] : null;
        content = getProjectContentDisplay(selectedProject);
        currentOptionsLength = 0;
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

    // Scroll to top for blog content, otherwise to bottom
    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTop = 0;
    }
  }, [currentView, selectedOptionIndex, currentBlogSlug, userSettings, blogPosts, aboutContent, projects, currentProjectIndex]);

  // Effect for standard cursor auto-hide logic
  useEffect(() => {
    const wrapper = terminalWrapperRef.current;
    if (!wrapper) return;

    const showStandardCursor = () => {
      wrapper.style.cursor = 'default'; // Or 'text', 'auto', depending on preference
    };

    const hideStandardCursor = () => {
      wrapper.style.cursor = 'none';
    };

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(hideStandardCursor, 100);
    };

    const handleMouseMove = () => {
      showStandardCursor();
      resetInactivityTimer();
    };

    const handleMouseEnter = () => {
      showStandardCursor();
      resetInactivityTimer();
    };

    // Attach listeners to the terminal wrapper itself
    wrapper.addEventListener('mousemove', handleMouseMove);
    wrapper.addEventListener('mouseenter', handleMouseEnter);

    // Initial state: cursor visible, then timer starts
    showStandardCursor();
    resetInactivityTimer();

    return () => {
      wrapper.removeEventListener('mousemove', handleMouseMove);
      wrapper.removeEventListener('mouseenter', handleMouseEnter);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isTouchDevice]); // Empty dependency array means this runs once on mount and cleans up on unmount

  // ---
  const handleMainViewEnter = (selectedIndex: number) => {
    const mainOptions = getMainMenuOptions();
    const selectedOption = mainOptions[selectedIndex];
    if (selectedOption === 'Blogs') {
      setHistory(prev => [...prev, 'blogList']);
      setCurrentView('blogList');
      setSelectedOptionIndex(0);
    } else if (selectedOption === 'About Me') {
      setHistory(prev => [...prev, 'about']);
      setCurrentView('about');
      setSelectedOptionIndex(0);
    } else if (selectedOption === 'Projects') {
      setHistory(prev => [...prev, 'projectList']);
      setCurrentView('projectList');
      setSelectedOptionIndex(0);
      setCurrentProjectIndex(null); // Reset current project index
    } else if (selectedOption === 'Settings') {
      setHistory(prev => [...prev, 'settings']);
      setCurrentView('settings');
      setSelectedOptionIndex(0);
    } else if (selectedOption === 'Reboot!') {
      window.location.href = '/';
    }
  };

  const handleBlogListEnter = (selectedIndex: number) => {
    const selectedBlog = blogPosts[selectedIndex];
    if (selectedBlog) {
      setHistory(prev => [...prev, 'blogContent']);
      setCurrentView('blogContent');
      setCurrentBlogSlug(selectedBlog.slug);
    }
  };

  const handleProjectListEnter = (selectedIndex: number) => {
    if (projects[selectedIndex]) {
      setCurrentProjectIndex(selectedIndex); // Set the index of the project to view
      setHistory(prev => [...prev, 'projectContent']);
      setCurrentView('projectContent');
      setSelectedOptionIndex(0); // No selection in content view
    }
  };

  const handleSettingsEnter = (selectedIndex: number) => {
    const setting = userSettings[selectedIndex];
    if (setting) {
      if (setting.type === 'boolean') {
        setUserSettings(prevSettings => prevSettings.map((s, idx) =>
          idx === selectedIndex ? { ...s, currentValue: !s.currentValue } : s
        ));
      } else if (setting.type === 'select' && setting.options) {
        const currentOptIdx = setting.options.indexOf(setting.currentValue as string);
        const nextOptIdx = (currentOptIdx + 1) % setting.options.length;
        setUserSettings(prevSettings => prevSettings.map((s, idx) =>
          idx === selectedIndex ? { ...s, currentValue: setting.options![nextOptIdx] } : s
        ));
      }
    }
  };
  // ---

  // --- Keyboard Navigation Logic ---

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (isTouchDevice) return; // Ignore key events on touch devices


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
    const isScrollableView = ['blogContent', 'about', 'projects'].includes(currentView);
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
    } else if (e.key.toLowerCase() === 'b' && currentView !== 'blogList' && currentView === 'main') { // 'b' for blogs
      setHistory(prev => [...prev, 'blogList']);
      setCurrentView('blogList');
      setSelectedOptionIndex(0);
      handled = true;
    } else if (e.key.toLowerCase() === 'a' && currentView !== 'about' && currentView === 'main') { // 'a' for about
      setHistory(prev => [...prev, 'about']);
      setCurrentView('about');
      setSelectedOptionIndex(0);
      handled = true;
    } else if (e.key.toLowerCase() === 'p' && currentView !== 'projects' && currentView === 'main') { // 'p' for projects
      setHistory(prev => [...prev, 'projects']);
      setCurrentView('projects');
      setSelectedOptionIndex(0);
      handled = true;
    } else if (e.key.toLowerCase() === 's' && currentView !== 'settings' && currentView === 'main') { // 's' for settings
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
          handleMainViewEnter(newSelectedOptionIndex);
        }
        break;
      case 'blogList':
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
          newSelectedOptionIndex = (selectedOptionIndex - 1 + blogPosts.length) % blogPosts.length; // Use blogPosts.length
          setSelectedOptionIndex(newSelectedOptionIndex);
        } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
          newSelectedOptionIndex = (selectedOptionIndex + 1) % blogPosts.length; // Use blogPosts.length
          setSelectedOptionIndex(newSelectedOptionIndex);
        } else if (e.key === 'Enter' || e.key.toLowerCase() === 'l') {
          handleBlogListEnter(newSelectedOptionIndex);
        }
        break;
      case 'settings':
        if (e.key === 'ArrowUp') {
          newSelectedOptionIndex = (selectedOptionIndex - 1 + userSettings.length) % userSettings.length;
        } else if (e.key === 'ArrowDown') {
          newSelectedOptionIndex = (selectedOptionIndex + 1) % userSettings.length;
        } else if (e.key === 'Enter') {
          handleSettingsEnter(newSelectedOptionIndex);
        }
        break;
      case 'blogContent':
        break;
      case 'about':
        break;
      case 'projects':
        break;
      case 'projectList':
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
          newSelectedOptionIndex = (selectedOptionIndex - 1 + projects.length) % projects.length; // Use projects.length
          setSelectedOptionIndex(newSelectedOptionIndex);
        }
        else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
          newSelectedOptionIndex = (selectedOptionIndex + 1) % projects.length; // Use projects.length
          setSelectedOptionIndex(newSelectedOptionIndex);
        }
        else if (e.key === 'Enter' || e.key.toLowerCase() === 'l') {
          handleProjectListEnter(newSelectedOptionIndex);
        }
        break;
      case 'projectContent':
        break;
    }

    // Update selected index if it changed
    if (newSelectedOptionIndex !== selectedOptionIndex && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      setSelectedOptionIndex(newSelectedOptionIndex);
    }
  }, [selectedOptionIndex, currentView, history, userSettings, currentBlogSlug, blogPosts, isTouchDevice]);

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
      options.push({ key: 'Esc', label: 'Main Menu' });
    }
    // Add view-specific options
    switch (currentView) {
      case 'main':
        options.push({ key: '↑↓ Enter', label: 'Navigate/Select' });
        options.push({ key: 'B', label: 'Blogs' });
        options.push({ key: 'A', label: 'About' });
        options.push({ key: 'P', label: 'Projects' });
        options.push({ key: 'S', label: 'Settings' });
        options.push({ key: 'Esc', label: 'Reboot' });
        break;
      case 'blogList':
        options.push({ key: '↑↓ Enter', label: 'Navigate/Read' });
        break;
      case 'blogContent':
        options.push({ key: 'h/j/k/l', label: 'Scroll' });
        break;
      case 'about':
        options.push({ key: 'h/j/k/l', label: 'Scroll' });
        break;
      // case 'projects': // This view name might be obsolete now
      //   // If 'projects' still exists as a view, define its nano bar.
      //   // Otherwise, this case can be removed if main menu 'Projects' goes to 'projectList'.
      //   options.push({ key: 'h/j/k/l', label: 'Scroll' });
      //   break;
      case 'projectList': // New
        options.push({ key: '↑↓/kj Enter/l', label: 'Navigate/View' });
        break;
      case 'projectContent': // New
        options.push({ key: 'h/j/k/l', label: 'Scroll' });
        break;
      case 'settings':
        options.push({ key: '↑↓ Enter', label: 'Navigate/Change' });
        options.push({ key: 'h/j/k/l', label: 'Scroll' });
        break;
    }
    options.push({ key: 'G', label: 'GitHub', align: 'right' }); // Always show GitHub link
    return options;
  }, [currentView]);


  return (
    <div
      ref={terminalWrapperRef}
      className={`terminal-wrapper theme-${themeMode} ${isTouchDevice ? 'touch-device' : ''}`}
      tabIndex={0} // Make it focusable
    >
      <div className="terminal-header">BlogLabs Terminal</div>
      <div className="terminal-output" ref={terminalOutputRef}>
        {/* Render content based on current view */}
        {displayedContent.map((line, index) => {

          const handleClick = () => {
            if (!isTouchDevice || !line.isInteractive || typeof line.optionIndex === 'undefined') {
              return;
            }
            if (currentView === 'main') {
              handleMainViewEnter(line.optionIndex);
            } else if (currentView === 'blogList') {
              handleBlogListEnter(line.optionIndex);
            } else if (currentView === 'settings') {
              handleSettingsEnter(line.optionIndex);
            } else if (currentView === 'projectList') { // Add projectList
              handleProjectListEnter(line.optionIndex);
            }
          };
          const lineClasses = ['line', line.type];
          if (line.isInteractive && isTouchDevice) {
            lineClasses.push('touch-interactive');
          }
          // For keyboard highlight, check if the line's optionIndex matches selectedOptionIndex
          if (line.optionIndex === selectedOptionIndex &&
            (currentView === 'main' || currentView === 'blogList' || currentView === 'settings')) {
            // Ensure 'highlight' type is used for keyboard selection if not already
            // This might conflict if 'highlight' is already set by get*Display.
            // The get*Display functions already set type to 'highlight' based on selectedOptionIndex.
            // So, we just need to ensure the class for keyboard selection is distinct if needed.
            // For simplicity, we rely on the 'highlight' type set by get*Display.
          }


          // Conditional rendering:
          // If line.type is 'code', use dangerouslySetInnerHTML
          // Otherwise, render line.value as children
          if (line.isHtml || line.type === 'code') {
            return (
              <div
                key={index}
                className={`line ${line.type}`}
                onClick={handleClick}
                dangerouslySetInnerHTML={{ __html: line.value }}
              ></div>
            );
          } else {
            return (
              <div
                key={index}
                className={`line ${line.type}`}
                onClick={handleClick}
              >
                {line.value}
              </div>
            );
          }
        })}
        {/* The 'input-line' with prompt and cursor is only for the main menu,
            acting as a visual cue for where interaction is.
            It's not a real input field, just a display of the active state. */}
        {/* {currentView === 'main' && (
          <div className="input-line">
            <span className="prompt">user@bloglabs:~/$ </span>
            <span className="cursor-block"></span>
          </div>
        )} */}
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
