/**
 * Wiki resource management for MCP server
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface WikiResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Get the wiki directory path
 */
export function getWikiDir(): string {
  // Wiki is at the root of the project, one level up from src
  return join(__dirname, '..', 'wiki');
}

/**
 * Get all available wiki resources
 */
export async function listWikiResources(): Promise<WikiResource[]> {
  const wikiDir = getWikiDir();
  
  try {
    const files = await readdir(wikiDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    return mdFiles.map(file => {
      const name = file.replace('.md', '');
      const title = name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return {
        uri: `wiki:///${name}`,
        name: title,
        description: `Network School wiki page: ${title}`,
        mimeType: 'text/markdown',
      };
    });
  } catch (error) {
    console.error('Error reading wiki directory:', error);
    return [];
  }
}

/**
 * Read a specific wiki resource by URI
 */
export async function readWikiResource(uri: string): Promise<string> {
  // Extract the resource name from the URI (e.g., "wiki:///visas" -> "visas")
  const resourceName = uri.replace('wiki:///', '');
  const wikiDir = getWikiDir();
  const filePath = join(wikiDir, `${resourceName}.md`);
  
  try {
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Wiki resource not found: ${resourceName}`);
  }
}

/**
 * Check if a URI is a valid wiki resource
 */
export function isWikiUri(uri: string): boolean {
  return uri.startsWith('wiki:///');
}

/**
 * Search through all wiki pages for a query string
 */
export async function searchWiki(query: string): Promise<{ page: string; content: string; matches: number }[]> {
  const wikiDir = getWikiDir();
  const lowerQuery = query.toLowerCase();
  
  try {
    const files = await readdir(wikiDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    const results: { page: string; content: string; matches: number }[] = [];
    
    for (const file of mdFiles) {
      const filePath = join(wikiDir, file);
      const content = await readFile(filePath, 'utf-8');
      const lowerContent = content.toLowerCase();
      
      // Count matches
      const matches = (lowerContent.match(new RegExp(lowerQuery, 'g')) || []).length;
      
      if (matches > 0) {
        const pageName = file.replace('.md', '');
        results.push({
          page: pageName,
          content,
          matches,
        });
      }
    }
    
    // Sort by number of matches (descending)
    results.sort((a, b) => b.matches - a.matches);
    
    return results;
  } catch (error) {
    console.error('Error searching wiki:', error);
    return [];
  }
}

