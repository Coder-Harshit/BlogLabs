// src/content/config.ts
import { defineCollection, z } from 'astro:content';

// Define the 'blogs' collection
const blogsCollection = defineCollection({
  type: 'content', // 'content' for Markdown/MDX, 'data' for JSON/YAML
  schema: z.object({
    title: z.string(),
    author: z.string().default('BlogLabs Admin'), // Default author
    date: z.date(), // Date object for easier formatting
    summary: z.string(), // Short summary for list view
    // You can add more frontmatter fields as needed
  }),
});

// Define the 'about' collection
const aboutCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().default('About Me'),
    // Add any specific schema fields for your about page here
  }),
});

// Define the 'projects' collection
const projectsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(), // Project name
    description: z.string(), // Project description
    githubUrl: z.string().url().optional(), // Optional GitHub URL
    // Add any specific schema fields for your projects here
  }),
});

// Export your collections. Each key here corresponds to a directory in src/content/
export const collections = {
  blogs: blogsCollection,
  about: aboutCollection, // Explicitly define about collection
  projects: projectsCollection, // Explicitly define projects collection
};
