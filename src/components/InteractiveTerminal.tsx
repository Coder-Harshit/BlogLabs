// src/components/InteractiveTerminal.tsx
import { useState, useEffect, useRef } from "react";
import type { BlogPostContent, AboutContent, ProjectContent } from "../interfaces";
import { marked } from "marked";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/themes/prism-tomorrow.css";

interface TerminalLine {
  content: string;
  isHtml?: boolean;
}

interface Props {
  blogPosts: BlogPostContent[];
  aboutContent: AboutContent;
  projects: ProjectContent[];
}

const getLolcatHtml = (text: string): string => {
  const vibrantColors = [
    '#ff0000', '#ff4000', '#ff8000', '#ffbf00',
    '#ffff00', '#bfff00', '#80ff00', '#40ff00',
    '#00ff00', '#00ff40', '#00ff80', '#00ffbf',
    '#00ffff', '#00bfff', '#0080ff', '#0040ff',
    '#0000ff', '#4000ff', '#8000ff', '#bf00ff',
    '#ff00ff', '#ff00bf', '#ff0080', '#ff0040'
  ];
  const gradient = `linear-gradient(to right, ${vibrantColors.join(', ')})`;
  const style = `background-image: ${gradient}; background-size: 100% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; display: inline-block; text-shadow: none;`.replace(/\s+/g, ' ').trim();
  return `<span style="${style}">${text}</span>`;
};

import type { MarkedOptions } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
  highlight: (code: string, lang: string): string => {
    const grammar = Prism.languages[lang] || Prism.languages.javascript;
    return Prism.highlight(code, grammar, lang);
  }
} as MarkedOptions);

// const defaultSettings = [
//   {
//     key: 'themeMode',
//     label: 'Theme Mode',
//     type: 'select',
//     options: ['terminal', 'light', 'dark'],
//     currentValue: 'terminal'
//   },
//   {
//     key: 'fontSize',
//     label: 'Font Size',
//     type: 'select',
//     options: ['small', 'medium', 'large'],
//     currentValue: 'medium'
//   },
//   {
//     key: 'fontFamily',
//     label: 'Font Family',
//     type: 'select',
//     options: ['Courier New', 'Ubuntu', 'IBM Plex Mono', 'Fira Code', 'JetBrains Mono', 'Tektur'],
//     currentValue: 'Courier New'
//   },
//   {
//     key: 'showWelcome',
//     label: 'Show Welcome on Home',
//     type: 'boolean',
//     currentValue: true
//   },
//   {
//     key: 'imageDisplay',
//     label: 'Media Display',
//     type: 'select',
//     options: ['none', 'full'],
//     currentValue: 'none'
//   }
// ];


const defaultSettings = {
  theme: "green",
  lolcat: false,
  themeMode: 'terminal',
  fontSize: 'medium',
  fontFamily: 'Courier New',
  showWelcome: true,
  imageDisplay: 'none'
};

export default function InteractiveTerminal({ blogPosts, aboutContent, projects }: Props) {
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [command, setCommand] = useState("");
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("bloglabs-settings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  // const [booted, setBooted] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);

  useEffect(() => {
    localStorage.setItem("bloglabs-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const appendOutput = (output: string | string[], isHtml = false) => {
    const lines = Array.isArray(output) ? output : [output];
    const formattedOutput = lines.map((line) => ({ content: line, isHtml }));
    setHistory((prev) => [...prev, ...formattedOutput]);
  };

  const renderMarkdown = async (markdown: string): Promise<string> => {
    const parsed = await marked.parse(markdown);
    // Apply lolcat if enabled, ensuring it doesn't break pre/code structure too much
    // A more sophisticated lolcat would avoid pre/code tags or apply differently.
    return settings.lolcat ? getLolcatHtml(parsed) : parsed;
  };

  const handleCommand = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    commandHistory.current.unshift(trimmed);
    historyIndex.current = -1;
    appendOutput(`> ${trimmed}`);

    if (trimmed === "clear") {
      setHistory([]);
      return;
    }

    if (trimmed === "help") {
      appendOutput([
        "Available commands:",
        "  blog            - List all blog posts",
        "  blog <slug>     - Show full content of a blog post",
        "  projects        - List all projects",
        "  project <name>  - Show full content of a project",
        "  about           - Show about info",
        "  clear           - Clear the screen",
        "  settings        - View current settings",
        "  theme <color>   - Change prompt theme (color affects prompt text, not full UI here)",
        "  lolcat on/off   - Toggle rainbow text for Markdown output",
        "  reboot          - Return to boot screen (GRUB menu)",
        "  shutdown        - Attempt to close the tab/window",
        "  github          - Open the project's GitHub repository",
        "  help            - Show this help message"
      ]);
      return;
    }

    if (trimmed === "about") {
      // aboutContent.bodyLines is already an array of HTML strings (processed paragraphs)
      appendOutput(aboutContent.bodyLines, true);
      return;
    }

    if (trimmed === "projects") {
      appendOutput(projects.map(p => `- ${p.name}: ${p.description}`), false);
      return;
    }

    if (trimmed.startsWith("project ")) {
      const query = trimmed.split(" ")[1];
      const proj = projects.find(p => p.name.toLowerCase() === query.toLowerCase());
      if (proj) {
        // Render project metadata as Markdown
        const projectHeader = await renderMarkdown(`# ${proj.name}\n🔗 ${proj.githubUrl}\n🌐 ${proj.liveUrl || "No live link"}`);
        appendOutput(projectHeader, true);
        // proj.content is already an array of HTML strings (processed paragraphs + ASCII art)
        if (proj.content && proj.content.length > 0) {
          appendOutput(proj.content, true);
        } else {
          appendOutput("(No additional details for this project)");
        }
      } else {
        appendOutput(`Project '${query}' not found.`);
      }
      return;
    }

    if (trimmed.startsWith("blog")) {
      const parts = trimmed.split(" ");
      if (parts.length === 1) {
        appendOutput(blogPosts.map(p => `- ${p.slug}: ${p.title} — ${p.summary}`), false);
      } else {
        const slug = parts[1];
        const found = blogPosts.find(b => b.slug === slug);
        if (found) {
          // Render blog metadata as Markdown
          const blogHeader = await renderMarkdown(`# ${found.title}\nby ${found.author} on ${found.date}\n`);
          appendOutput(blogHeader, true);

          // Render plain text content (paragraphs) as Markdown
          if (found.content && found.content.length > 0) {
            const mainContentHtml = await renderMarkdown(found.content.join("\n\n"));
            appendOutput(mainContentHtml, true);
          }

          // Render code blocks
          if (found.codeBlocks && found.codeBlocks.length > 0) {
            for (const block of found.codeBlocks) {
              const codeMarkdown = `\`\`\`${block.language || ''}\n${block.code}\n\`\`\``;
              const highlightedCodeHtml = await renderMarkdown(codeMarkdown);
              appendOutput(highlightedCodeHtml, true);
            }
          }
        } else {
          appendOutput(`No blog post found with slug: ${slug}`);
        }
      }
      return;
    }

    if (trimmed === "settings") {
      appendOutput([`Current settings:`, ...Object.entries(settings).map(([k, v]) => `  ${k}: ${v}`)]);
      return;
    }

    if (trimmed.startsWith("theme ")) {
      const color = trimmed.split(" ")[1];
      setSettings((prev: any) => ({ ...prev, theme: color }));
      appendOutput(`Theme changed to '${color}'`);
      return;
    }

    if (trimmed === "lolcat on") {
      setSettings((prev: any) => ({ ...prev, lolcat: true }));
      appendOutput("Lolcat enabled 🌈");
      return;
    }

    if (trimmed === "lolcat off") {
      setSettings((prev: any) => ({ ...prev, lolcat: false }));
      appendOutput("Lolcat disabled ❌");
      return;
    }

    if (trimmed === "reboot") {
      // setBooted(false); // Removed
      setHistory([]); // Clear history before redirecting
      window.location.href = '/'; // Redirect to GRUB-like screen
      return;
    }

    if (trimmed === "shutdown") {
      window.open("", "_self");
      window.close();
      setTimeout(() => {
        window.location.href = 'about:blank';
      }, 100);
      return;
    }

    if (trimmed === "github") {
      appendOutput("Opening GitHub repository...");
      window.open("https://github.com/Coder-Harshit/bloglabs", "_blank");
      return;
    }

    appendOutput(`Unknown command: ${trimmed}`);
  };

  return (
    <div className={`font-mono bg-black text-${settings.theme}-400 p-4 min-h-screen w-full flex flex-col`}>
      <div ref={terminalRef} className="flex-1 overflow-y-auto">
        {history.map((line, idx) =>
          line.isHtml ? (
            <div key={idx} className="terminal-output prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: line.content }} />
          ) : (
            <div key={idx} className="terminal-output">{line.content}</div>
          )
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCommand(command);
          setCommand("");
        }}
        className="mt-2 flex space-x-2"
      >
        <span>&gt; </span>
        <input
          type="text"
          className={`bg-transparent border-none focus:outline-none text-${settings.theme}-400 w-full`}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (commandHistory.current.length > 0) {
                historyIndex.current = Math.min(historyIndex.current + 1, commandHistory.current.length - 1);
                setCommand(commandHistory.current[historyIndex.current]);
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (historyIndex.current > 0) {
                historyIndex.current -= 1;
                setCommand(commandHistory.current[historyIndex.current]);
              } else {
                setCommand("");
              }
            }
          }}
          autoFocus
        />
      </form>
    </div>
  );
}
