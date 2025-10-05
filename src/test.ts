/**
 * Simple test script to verify Luma API connection
 */

import { LumaClient } from './luma-client.js';
import { formatEventsList, filterUpcomingEvents } from './formatters.js';

async function test() {
  console.log('Testing Luma API connection...\n');
  
  try {
    const client = new LumaClient();
    const response = await client.fetchEvents();
    
    console.log(`✓ Successfully fetched ${response.entries.length} events\n`);
    
    // Show upcoming events in next 30 days
    const upcoming = filterUpcomingEvents(response.entries, 30);
    console.log('=== Upcoming Events (Next 30 Days) ===\n');
    console.log(formatEventsList(upcoming, 'No events found.'));
    
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

test();

