/**
 * Test script to verify wiki resources
 */

import { listWikiResources, readWikiResource } from './wiki.js';

async function testWiki() {
  console.log('Testing wiki resources...\n');
  
  try {
    // List all resources
    const resources = await listWikiResources();
    console.log(`✓ Found ${resources.length} wiki resources:\n`);
    
    resources.forEach((resource, index) => {
      console.log(`${index + 1}. ${resource.name}`);
      console.log(`   URI: ${resource.uri}`);
      console.log(`   Description: ${resource.description}\n`);
    });
    
    // Read a specific resource
    if (resources.length > 0) {
      const firstResource = resources[0];
      console.log(`\n=== Reading: ${firstResource.name} ===\n`);
      const content = await readWikiResource(firstResource.uri);
      console.log(content);
    }
    
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testWiki();

