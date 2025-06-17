import { useState } from 'react';
import BootScreen from './BootScreen';
import InteractiveTerminal from './InteractiveTerminal';

import type { BlogPostContent, AboutContent, ProjectContent } from "../interfaces";

interface Props {
  blogPosts: BlogPostContent[];
  aboutContent: AboutContent;
  projects: ProjectContent[];
}

export default function BootedShell({ blogPosts, aboutContent, projects }: Props) {
  const [booted, setBooted] = useState(false);

  return (
    <>
      {!booted ? (
        <BootScreen onFinish={() => setBooted(true)} />
      ) : (
        <InteractiveTerminal
          blogPosts={blogPosts}
          aboutContent={aboutContent}
          projects={projects}
        />
      )}
    </>
  );
}
