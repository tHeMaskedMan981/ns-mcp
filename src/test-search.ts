/**
 * Test script for wiki search
 */

import { searchWiki } from './wiki.js';

async function testSearch() {
  console.log('Testing wiki search...\n');
  
  const queries = ['wifi', 'password', 'breakfast', 'visa india', 'sim card'];
  
  for (const query of queries) {
    console.log(`\n=== Searching for: "${query}" ===\n`);
    
    const results = await searchWiki(query);
    
    if (results.length === 0) {
      console.log('No results found.\n');
      continue;
    }
    
    console.log(`Found ${results.length} page(s):\n`);
    results.forEach((result, index) => {
      const title = result.page
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      console.log(`${index + 1}. ${title} - ${result.matches} match(es)`);
    });
    console.log('');
  }
}

testSearch();

