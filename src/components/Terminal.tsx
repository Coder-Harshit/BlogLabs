// src/components/Terminal.tsx
// Enhanced Terminal component with improved aesthetics, smoother interactions,
// and more authentic terminal feel. Features include better visual feedback,
// enhanced navigation, improved accessibility, and performance optimizations.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-bash.js';

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

// Enhanced settings with more options
const defaultSettings: SettingOption[] = [
  {
    key: 'themeMode',
    label: 'Theme Mode',
    type: 'select',
    options: ['terminal', 'light', 'dark'],
    currentValue: 'terminal'
  },
  {
    key: 'fontSize',
    label: 'Font Size',
    type: 'select',
    options: ['small', 'medium', 'large', 'xl'],
    currentValue: 'medium'
  },
  {
    key: 'fontFamily',
    label: 'Font Family',
    type: 'select',
    options: ['JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Courier New', 'Ubuntu', 'Tektur'],
    currentValue: 'JetBrains Mono'
  },
  {
    key: 'showWelcome',
    label: 'Show Welcome Screen',
    type: 'boolean',
    currentValue: true
  },
  {
    key: 'imageDisplay',
    label: 'Media Display',
    type: 'select',
    options: ['none', 'ascii', 'full'],
    currentValue: 'ascii'
  },
  {
    key: 'enableAnimations',
    label: 'Enable Animations',
    type: 'boolean',
    currentValue: true
  },
  {
    key: 'showLineNumbers',
    label: 'Show Line Numbers',
    type: 'boolean',
    currentValue: false
  }
];

// Enhanced welcome screen with better ASCII art
const getWelcomeScreen = (): DisplayLine[] => {
  return [
    { type: 'welcome', value: '╔══════════════════════════════════════════╗' },
    { type: 'welcome', value: '║            Welcome to BlogLabs!          ║' },
    { type: 'welcome', value: '║         Terminal Interface v2.0          ║' },
    { type: 'welcome', value: '╚══════════════════════════════════════════╝' },
    { type: 'text', value: '' },
    { type: 'text', value: '┌─ Navigation ─────────────────────────────┐' },
    { type: 'text', value: '│ ↑↓ arrows or j/k    Navigate menus       │' },
    { type: 'text', value: '│ Enter or l          Select/Open          │' },
    { type: 'text', value: '│ Backspace or h      Go back              │' },
    { type: 'text', value: '│ Esc                 Main menu            │' },
    { type: 'text', value: '└──────────────────────────────────────────┘' },
    { type: 'text', value: '' },
    { type: 'text', value: '┌─ Quick Access ───────────────────────────┐' },
    { type: 'text', value: '│ B - Blogs    A - About    P - Projects   │' },
    { type: 'text', value: '│ S - Settings G - GitHub   Q - Quit       │' },
    { type: 'text', value: '└──────────────────────────────────────────┘' },
    { type: 'text', value: '' },
    { type: 'prompt', value: 'Select an option below to continue:' },
    { type: 'text', value: '' }
  ];
};

const getMainMenuOptions = (): string[] => [
  '📚 Blogs',
  '👤 About Me', 
  '🚀 Projects',
  '⚙️  Settings',
  '🔄 Reboot System'
];

const getBlogListDisplay = (highlightedIndex: number, blogs: BlogPost[]): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: '╭─ Blog Posts ─────────────────────────────╮' },
    { type: 'text', value: '│                                          │' }
  ];
  
  blogs.forEach((blog, index) => {
    const isSelected = index === highlightedIndex;
    const prefix = isSelected ? '│ ▶ ' : '│   ';
    const suffix = ' │';
    const dateStr = `(${blog.date})`;
    const maxWidth = 36; // Adjust based on your terminal width
    let title = blog.title;
    
    if ((title + dateStr).length > maxWidth) {
      title = title.substring(0, maxWidth - dateStr.length - 3) + '...';
    }
    
    const line = `${prefix}${title} ${dateStr}`.padEnd(40) + suffix;
    
    lines.push({
      type: isSelected ? 'highlight' : 'text',
      value: line,
      isInteractive: true,
      optionIndex: index
    });
  });
  
  lines.push({ type: 'text', value: '│                                          │' });
  lines.push({ type: 'text', value: '╰──────────────────────────────────────────╯' });
  lines.push({ type: 'text', value: '' });
  
  if (blogs[highlightedIndex]) {
    lines.push({ type: 'title', value: '╭─ Summary ────────────────────────────────╮' });
    lines.push({ type: 'text', value: `│ ${blogs[highlightedIndex].summary.substring(0, 38).padEnd(38)} │` });
    lines.push({ type: 'text', value: '╰──────────────────────────────────────────╯' });
    lines.push({ type: 'text', value: '' });
  }
  
  return lines;
};

const getBlogPostDisplay = (blog: BlogPost): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: `╭─ ${blog.title} ${'─'.repeat(Math.max(0, 35 - blog.title.length))}╮` },
    { type: 'text', value: `│ Author: ${blog.author.padEnd(28)} │` },
    { type: 'text', value: `│ Date: ${blog.date.padEnd(30)} │` },
    { type: 'text', value: '╰──────────────────────────────────────────╯' },
    { type: 'text', value: '' }
  ];

  blog.content.forEach(paragraph => {
    // Split long paragraphs into multiple lines for better readability
    const words = paragraph.split(' ');
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length > 70) {
        if (currentLine) {
          lines.push({ type: 'text', value: currentLine.trim() });
          currentLine = word + ' ';
        } else {
          lines.push({ type: 'text', value: word });
        }
      } else {
        currentLine += word + ' ';
      }
    });
    
    if (currentLine.trim()) {
      lines.push({ type: 'text', value: currentLine.trim() });
    }
    
    lines.push({ type: 'text', value: '' });
  });

  if (blog.codeBlocks?.length) {
    lines.push({ type: 'title', value: '╭─ Code Examples ──────────────────────────╮' });
    lines.push({ type: 'text', value: '' });

    blog.codeBlocks.forEach(({ language, code }, index) => {
      lines.push({ type: 'text', value: `┌─ ${language.toUpperCase()} ${`─`.repeat(Math.max(0, 35 - language.length))}┐` });
      
      const grammar = Prism.languages[language] || Prism.languages.javascript;
      const highlighted = Prism.highlight(code, grammar, language);
      const htmlBlock = `<pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>`;

      lines.push({ type: 'code', value: htmlBlock });
      lines.push({ type: 'text', value: `└${'─'.repeat(38)}┘` });
      
      if (index < blog.codeBlocks!.length - 1) {
        lines.push({ type: 'text', value: '' });
      }
    });
  }

  return lines;
};

const getAboutMeDisplay = (aboutData: AboutContent): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: `╭─ ${aboutData.title} ${'─'.repeat(Math.max(0, 35 - aboutData.title.length))}╮` },
    { type: 'text', value: '' }
  ];

  aboutData.bodyLines.forEach(htmlLine => {
    if (htmlLine.trim() === "") {
      lines.push({ type: 'text', value: '' });
    } else {
      lines.push({ type: 'code', value: htmlLine, isHtml: true });
      lines.push({ type: 'text', value: '' });
    }
  });

  lines.push({ type: 'text', value: '╰──────────────────────────────────────────╯' });
  lines.push({ type: 'text', value: '' });
  return lines;
};

const getProjectListDisplay = (projectsData: Project[], highlightedIndex: number): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: '╭─ My Projects ────────────────────────────╮' },
    { type: 'text', value: '│                                          │' }
  ];
  
  if (projectsData.length === 0) {
    lines.push({ type: 'text', value: '│ No projects to display yet.             │' });
  } else {
    projectsData.forEach((project, index) => {
      const isSelected = index === highlightedIndex;
      const prefix = isSelected ? '│ ▶ ' : '│   ';
      const lolcatName = getLolcatHtml(project.name);
      
      lines.push({
        type: isSelected ? 'highlight' : 'code',
        value: `${prefix}${lolcatName}`,
        isInteractive: true,
        optionIndex: index,
        isHtml: true,
      });
      
      const description = project.description.length > 34 
        ? project.description.substring(0, 31) + '...' 
        : project.description;
      lines.push({ type: 'text', value: `│     ${description.padEnd(34)} │` });
      lines.push({ type: 'text', value: '│                                          │' });
    });
  }
  
  lines.push({ type: 'text', value: '╰──────────────────────────────────────────╯' });
  lines.push({ type: 'text', value: '' });
  return lines;
};

const getProjectContentDisplay = (project: Project | null): DisplayLine[] => {
  if (!project) {
    return [{ type: 'error', value: '✗ Error: Project not found.' }];
  }
  
  const lines: DisplayLine[] = [
    { type: 'code', value: `╭─ ${getLolcatHtml(project.name)} ${'─'.repeat(Math.max(0, 35 - project.name.length))}╮`, isHtml: true },
    { type: 'text', value: '' },
    { type: 'text', value: `📝 ${project.description}` },
    { type: 'text', value: `🔗 ${project.githubUrl}` },
  ];

  if (project.liveUrl) {
    lines.push({ type: 'text', value: `🌐 ${project.liveUrl}` });
  }
  
  lines.push({ type: 'text', value: '' });

  if (project.content && project.content.length > 0) {
    lines.push({ type: 'title', value: '╭─ Details ────────────────────────────────╮' });
    lines.push({ type: 'text', value: '' });
    
    project.content.forEach(bodyLine => {
      lines.push({ type: 'code', value: bodyLine, isHtml: true });
      lines.push({ type: 'text', value: '' });
    });
  } else {
    lines.push({ type: 'text', value: '(No additional details provided)' });
    lines.push({ type: 'text', value: '' });
  }
  
  lines.push({ type: 'text', value: '╰──────────────────────────────────────────╯' });
  lines.push({ type: 'text', value: '' });
  return lines;
};

const getSettingsDisplay = (settings: SettingOption[], highlightedIndex: number): DisplayLine[] => {
  const lines: DisplayLine[] = [
    { type: 'title', value: '╭─ Settings ───────────────────────────────╮' },
    { type: 'text', value: '│                                          │' }
  ];

  settings.forEach((setting, index) => {
    const isSelected = index === highlightedIndex;
    const prefix = isSelected ? '│ ▶ ' : '│   ';
    
    let displayValue = '';
    if (setting.type === 'boolean') {
      displayValue = setting.currentValue ? '[✓]' : '[ ]';
    } else if (setting.type === 'select' && setting.options) {
      displayValue = `[${setting.currentValue || 'N/A'}]`;
    }
    
    const label = setting.label.padEnd(20);
    const line = `${prefix}${label} ${displayValue}`.padEnd(40) + ' │';
    
    lines.push({
      type: isSelected ? 'highlight' : 'text',
      value: line,
      isInteractive: true,
      optionIndex: index
    });
  });

  lines.push({ type: 'text', value: '│                                          │' });
  lines.push({ type: 'text', value: '╰──────────────────────────────────────────╯' });
  lines.push({ type: 'text', value: '' });
  
  // Show current setting description
  if (settings[highlightedIndex]) {
    const currentSetting = settings[highlightedIndex];
    lines.push({ type: 'title', value: '╭─ Setting Info ───────────────────────────╮' });
    
    let info = '';
    switch (currentSetting.key) {
      case 'themeMode':
        info = 'Change the visual theme of the terminal';
        break;
      case 'fontSize':
        info = 'Adjust the font size for better readability';
        break;
      case 'fontFamily':
        info = 'Choose your preferred monospace font';
        break;
      case 'showWelcome':
        info = 'Toggle the welcome screen on startup';
        break;
      case 'imageDisplay':
        info = 'Control how images are displayed';
        break;
      case 'enableAnimations':
        info = 'Enable or disable visual animations';
        break;
      case 'showLineNumbers':
        info = 'Show line numbers in code blocks';
        break;
      default:
        info = 'Press Enter to modify this setting';
    }
    
    lines.push({ type: 'text', value: `│ ${info.substring(0, 38).padEnd(38)} │` });
    lines.push({ type: 'text', value: '╰──────────────────────────────────────────╯' });
  }
  
  return lines;
};

// Main Terminal Component
const Terminal: React.FC<TerminalProps> = ({ blogPosts, aboutContent, projects }) => {
  const [userSettings, setUserSettings] = useState<SettingOption[]>(defaultSettings);
  const [displayedContent, setDisplayedContent] = useState<DisplayLine[]>([]);
  const [currentView, setCurrentView] = useState<'main' | 'blogList' | 'blogContent' | 'about' | 'settings' | 'projectList' | 'projectContent'>('main');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
  const [history, setHistory] = useState<('main' | 'blogList' | 'blogContent' | 'about' | 'settings' | 'projectList' | 'projectContent')[]>(['main']);
  const [currentBlogSlug, setCurrentBlogSlug] = useState<string | null>(null);
  const [currentProjectIndex, setCurrentProjectIndex] = useState<number | null>(null);
  
  const terminalWrapperRef = useRef<HTMLDivElement>(null);
  const terminalOutputRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // Get current settings
  const themeMode = userSettings.find(s => s.key === 'themeMode')?.currentValue as string || 'terminal';
  const imageDisplay = userSettings.find(s => s.key === 'imageDisplay')?.currentValue as 'none' | 'ascii' | 'full';
  const enableAnimations = userSettings.find(s => s.key === 'enableAnimations')?.currentValue as boolean;

  useEffect(() => {
    setIsTouchDevice(isMobile());
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
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
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('bloglabsSettings', JSON.stringify(userSettings));
      }
    } catch (e) {
      console.error("Failed to save settings to localStorage:", e);
    }
  }, [userSettings]);

  // Apply CSS variables from settings
  useEffect(() => {
    const root = document.documentElement;
    const fontFamily = userSettings.find(s => s.key === 'fontFamily')!.currentValue as string;
    const fontSize = userSettings.find(s => s.key === 'fontSize')!.currentValue as string;
    
    root.style.setProperty('--terminal-font-family', `"${fontFamily}"`);
    
    const fontSizeMap = {
      'small': '0.8em',
      'medium': '1em', 
      'large': '1.2em',
      'xl': '1.4em'
    };
    root.style.setProperty('--terminal-font-size', fontSizeMap[fontSize as keyof typeof fontSizeMap] || '1em');
    
    root.setAttribute('data-bloglabs-theme', themeMode);
    
    // Disable animations if setting is off
    if (!enableAnimations) {
      root.style.setProperty('--crt-flicker', '0s');
      root.style.setProperty('--scanline-speed', '0s');
    } else {
      root.style.setProperty('--crt-flicker', '0.15s');
      root.style.setProperty('--scanline-speed', '2s');
    }
  }, [userSettings, themeMode, enableAnimations]);

  // Handle display content update
  useEffect(() => {
    let content: DisplayLine[] = [];
    let currentOptionsLength = 0;

    switch (currentView) {
      case 'main':
        const showWelcome = userSettings.find(s => s.key === 'showWelcome')?.currentValue;
        if (showWelcome) {
          content = getWelcomeScreen();
        }
        const mainOptions = getMainMenuOptions();
        content = [...content, ...mainOptions.map((option, index) => ({
          type: index === selectedOptionIndex ? 'highlight' : 'text',
          value: `${index === selectedOptionIndex ? '▶ ' : '  '}${option}`,
          isInteractive: true,
          optionIndex: index
        }))] as DisplayLine[];
        currentOptionsLength = mainOptions.length;
        break;
        
      case 'blogList':
        content = getBlogListDisplay(selectedOptionIndex, blogPosts);
        currentOptionsLength = blogPosts.length;
        break;
        
      case 'blogContent':
        const blog = blogPosts.find(b => b.slug === currentBlogSlug);
        if (blog) {
          content = getBlogPostDisplay(blog);
        } else {
          content = [{ type: 'error', value: '✗ Error: Blog not found.' }];
        }
        currentOptionsLength = 0;
        break;
        
      case 'about':
        content = getAboutMeDisplay(aboutContent);
        currentOptionsLength = 0;
        break;
        
      case 'projectList':
        content = getProjectListDisplay(projects, selectedOptionIndex);
        currentOptionsLength = projects.length;
        break;
        
      case 'projectContent':
        const selectedProject = (currentProjectIndex !== null && currentProjectIndex >= 0 && projects[currentProjectIndex]) 
          ? projects[currentProjectIndex] : null;
        content = getProjectContentDisplay(selectedProject);
        currentOptionsLength = 0;
        break;
        
      case 'settings':
        content = getSettingsDisplay(userSettings, selectedOptionIndex);
        currentOptionsLength = userSettings.length;
        break;
    }
    
    setDisplayedContent(content);

    // Reset selection if out of bounds
    if (selectedOptionIndex >= currentOptionsLength && currentOptionsLength > 0) {
      setSelectedOptionIndex(0);
    } else if (currentOptionsLength === 0 && selectedOptionIndex !== 0) {
      setSelectedOptionIndex(0);
    }

    // Scroll to top
    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTop = 0;
    }
  }, [currentView, selectedOptionIndex, currentBlogSlug, userSettings, blogPosts, aboutContent, projects, currentProjectIndex]);

  // Cursor auto-hide logic
  useEffect(() => {
    const wrapper = terminalWrapperRef.current;
    if (!wrapper || isTouchDevice) return;

    const showCursor = () => wrapper.style.cursor = 'default';
    const hideCursor = () => wrapper.style.cursor = 'none';

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(hideCursor, 2000);
    };

    const handleMouseMove = () => {
      showCursor();
      resetTimer();
    };

    wrapper.addEventListener('mousemove', handleMouseMove);
    wrapper.addEventListener('mouseenter', handleMouseMove);

    showCursor();
    resetTimer();

    return () => {
      wrapper.removeEventListener('mousemove', handleMouseMove);
      wrapper.removeEventListener('mouseenter', handleMouseMove);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isTouchDevice]);

  // Navigation handlers
  const handleMainViewEnter = (selectedIndex: number) => {
    const mainOptions = getMainMenuOptions();
    const selectedOption = mainOptions[selectedIndex];
    
    if (selectedOption.includes('Blogs')) {
      setHistory(prev => [...prev, 'blogList']);
      setCurrentView('blogList');
      setSelectedOptionIndex(0);
    } else if (selectedOption.includes('About')) {
      setHistory(prev => [...prev, 'about']);
      setCurrentView('about');
      setSelectedOptionIndex(0);
    } else if (selectedOption.includes('Projects')) {
      setHistory(prev => [...prev, 'projectList']);
      setCurrentView('projectList');
      setSelectedOptionIndex(0);
    } else if (selectedOption.includes('Settings')) {
      setHistory(prev => [...prev, 'settings']);
      setCurrentView('settings');
      setSelectedOptionIndex(0);
    } else if (selectedOption.includes('Reboot')) {
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
      setCurrentProjectIndex(selectedIndex);
      setHistory(prev => [...prev, 'projectContent']);
      setCurrentView('projectContent');
      setSelectedOptionIndex(0);
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

  // Enhanced keyboard navigation
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (isTouchDevice) return;

    const preventDefaultKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter',
      'Backspace', 'Escape', 'b', 'a', 'p', 's', 'c', 'g', 'q',
      'h', 'j', 'k', 'l'
    ];
    
    if (preventDefaultKeys.includes(e.key) || preventDefaultKeys.includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    // Scroll handling for content views
    const scrollEl = terminalOutputRef.current;
    const isScrollableView = ['blogContent', 'about', 'projectContent'].includes(currentView);
    
    if (isScrollableView && scrollEl) {
      const scrollAmount = scrollEl.clientHeight * 0.8;
      
      if (e.key === 'j' || e.key === 'ArrowDown') {
        scrollEl.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        return;
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        scrollEl.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
        return;
      }
      if (e.key === 'l' || e.key === 'ArrowRight') {
        scrollEl.scrollBy({ left: 100, behavior: 'smooth' });
        return;
      }
      if (e.key === 'h' || e.key === 'ArrowLeft') {
        scrollEl.scrollBy({ left: -100, behavior: 'smooth' });
        return;
      }
    }

    let newSelectedOptionIndex = selectedOptionIndex;
    let handled = false;

    // Global navigation
    if (e.key === 'Backspace' || e.key.toLowerCase() === 'c') {
      if (history.length > 1) {
        const prevView = history[history.length - 2];
        setHistory(prevHistory => prevHistory.slice(0, -1));
        setCurrentView(prevView);
        setSelectedOptionIndex(0);
        handled = true;
      } else if (currentView !== 'main') {
        setHistory(['main']);
        setCurrentView('main');
        setSelectedOptionIndex(0);
        handled = true;
      }
    } else if (e.key === 'Escape') {
      if (currentView === 'main') {
        window.location.href = '/';
      } else {
        setHistory(['main']);
        setCurrentView('main');
        setSelectedOptionIndex(0);
        handled = true;
      }
    } else if (e.key.toLowerCase() === 'q') {
      window.location.href = '/';
      handled = true;
    }

    // Quick access keys (only from main view)
    if (currentView === 'main') {
      if (e.key.toLowerCase() === 'b') {
        setHistory(prev => [...prev, 'blogList']);
        setCurrentView('blogList');
        setSelectedOptionIndex(0);
        handled = true;
      } else if (e.key.toLowerCase() === 'a') {
        setHistory(prev => [...prev, 'about']);
        setCurrentView('about');
        setSelectedOptionIndex(0);
        handled = true;
      } else if (e.key.toLowerCase() === 'p') {
        setHistory(prev => [...prev, 'projectList']);
        setCurrentView('projectList');
        setSelectedOptionIndex(0);
        handled = true;
      } else if (e.key.toLowerCase() === 's') {
        setHistory(prev => [...prev, 'settings']);
        setCurrentView('settings');
        setSelectedOptionIndex(0);
        handled = true;
      }
    }

    if (e.key.toLowerCase() === 'g') {
      window.open('https://github.com/Coder-Harshit/bloglabs', '_blank');
      handled = true;
    }

    if (handled) return;

    // View-specific navigation
    switch (currentView) {
      case 'main':
        const mainOptions = getMainMenuOptions();
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
          newSelectedOptionIndex = (selectedOptionIndex - 1 + mainOptions.length) % mainOptions.length;
        } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
          newSelectedOptionIndex = (selectedOptionIndex + 1) % mainOptions.length;
        } else if (e.key === 'Enter' || e.key.toLowerCase() === 'l') {
          handleMainViewEnter(newSelectedOptionIndex);
        }
        break;
        
      case 'blogList':
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
          newSelectedOptionIndex = (selectedOptionIndex - 1 + blogPosts.length) % blogPosts.length;
          setSelectedOptionIndex(newSelectedOptionIndex);
        } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
          newSelectedOptionIndex = (selectedOptionIndex + 1) % blogPosts.length;
          setSelectedOptionIndex(newSelectedOptionIndex);
        } else if (e.key === 'Enter' || e.key.toLowerCase() === 'l') {
          handleBlogListEnter(newSelectedOptionIndex);
        }
        break;
        
      case 'projectList':
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
          newSelectedOptionIndex = (selectedOptionIndex - 1 + projects.length) % projects.length;
          setSelectedOptionIndex(newSelectedOptionIndex);
        } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
          newSelectedOptionIndex = (selectedOptionIndex + 1) % projects.length;
          setSelectedOptionIndex(newSelectedOptionIndex);
        } else if (e.key === 'Enter' || e.key.toLowerCase() === 'l') {
          handleProjectListEnter(newSelectedOptionIndex);
        }
        break;
        
      case 'settings':
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
          newSelectedOptionIndex = (selectedOptionIndex - 1 + userSettings.length) % userSettings.length;
        } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
          newSelectedOptionIndex = (selectedOptionIndex + 1) % userSettings.length;
        } else if (e.key === 'Enter' || e.key.toLowerCase() === 'l') {
          handleSettingsEnter(newSelectedOptionIndex);
        }
        break;
    }

    // Update selected index for menu navigation
    if (newSelectedOptionIndex !== selectedOptionIndex && 
        (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
         e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'j')) {
      setSelectedOptionIndex(newSelectedOptionIndex);
    }
  }, [selectedOptionIndex, currentView, history, userSettings, currentBlogSlug, blogPosts, isTouchDevice, projects]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Enhanced nano bar options
  const getNanoBarOptions = useCallback(() => {
    const options: { key: string; label: string; align?: string }[] = [];
    
    if (currentView !== 'main') {
      options.push({ key: '^C', label: 'Back' });
      options.push({ key: 'Esc', label: 'Main' });
    }
    
    switch (currentView) {
      case 'main':
        options.push({ key: '↑↓/jk', label: 'Navigate' });
        options.push({ key: 'Enter/l', label: 'Select' });
        options.push({ key: 'B/A/P/S', label: 'Quick Access' });
        options.push({ key: 'Q/Esc', label: 'Quit' });
        break;
      case 'blogList':
      case 'projectList':
        options.push({ key: '↑↓/jk', label: 'Navigate' });
        options.push({ key: 'Enter/l', label: 'Open' });
        break;
      case 'blogContent':
      case 'about':
      case 'projectContent':
        options.push({ key: 'jk/↑↓', label: 'Scroll' });
        options.push({ key: 'hl/←→', label: 'H-Scroll' });
        break;
      case 'settings':
        options.push({ key: '↑↓/jk', label: 'Navigate' });
        options.push({ key: 'Enter/l', label: 'Change' });
        break;
    }
    
    options.push({ key: 'G', label: 'GitHub', align: 'right' });
    return options;
  }, [currentView]);

  return (
    <div
      ref={terminalWrapperRef}
      className={`terminal-wrapper theme-${themeMode} ${isTouchDevice ? 'touch-device' : ''}`}
      data-image-display={imageDisplay}
      tabIndex={0}
    >
      <div className="terminal-header">
        <span>BlogLabs Terminal Interface</span>
      </div>
      
      <div className="terminal-output" ref={terminalOutputRef}>
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
            } else if (currentView === 'projectList') {
              handleProjectListEnter(line.optionIndex);
            }
          };

          const lineClasses = ['line', line.type];
          if (line.isInteractive && isTouchDevice) {
            lineClasses.push('touch-interactive');
          }

          if (line.isHtml || line.type === 'code') {
            return (
              <div
                key={index}
                className={lineClasses.join(' ')}
                onClick={handleClick}
                dangerouslySetInnerHTML={{ __html: line.value }}
              />
            );
          } else {
            return (
              <div
                key={index}
                className={lineClasses.join(' ')}
                onClick={handleClick}
              >
                {line.value}
              </div>
            );
          }
        })}
      </div>

      <div className="nano-bar">
        {getNanoBarOptions().map((option, index) => (
          <span 
            key={index} 
            className={`nano-option ${option.align === 'right' ? 'nano-option--right' : ''}`}
          >
            {option.key}: {option.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Terminal;