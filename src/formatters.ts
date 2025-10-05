/**
 * Formatters for displaying Luma events
 */

import { format, parseISO, isToday, isTomorrow, isWithinInterval, addDays, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { LumaEntry } from './types.js';

/**
 * Format a single event entry into a readable bullet point
 */
export function formatEvent(entry: LumaEntry): string {
  const { event, hosts, guest_count, ticket_info } = entry;
  
  // Parse dates
  const startDate = parseISO(event.start_at);
  const endDate = parseISO(event.end_at);
  const timezone = event.timezone || 'UTC';
  
  // Format date with day labels
  let dateLabel = format(startDate, 'MMMM d, yyyy');
  if (isToday(startDate)) {
    dateLabel += ' (Today)';
  } else if (isTomorrow(startDate)) {
    dateLabel += ' (Tomorrow)';
  }
  
  // Format time range with timezone
  const startTime = formatInTimeZone(startDate, timezone, 'h:mm a');
  const endTime = formatInTimeZone(endDate, timezone, 'h:mm a');
  const timezoneAbbr = formatInTimeZone(startDate, timezone, 'zzz');
  
  // Format location
  const locationParts: string[] = [];
  if (event.geo_address_info?.address) {
    locationParts.push(event.geo_address_info.address);
  }
  if (event.location_type) {
    const locationType = event.location_type.charAt(0).toUpperCase() + event.location_type.slice(1);
    locationParts.push(`(${locationType})`);
  }
  const location = locationParts.length > 0 ? locationParts.join(' ') : 'Location TBD';
  
  // Format hosts
  const hostNames = hosts.map(h => h.name).join(', ') || 'No hosts listed';
  
  // Format ticket info
  let ticketInfo = '';
  if (ticket_info.is_free) {
    ticketInfo = 'Free';
  } else if (ticket_info.price) {
    ticketInfo = ticket_info.price;
  } else {
    ticketInfo = 'Ticket info unavailable';
  }
  
  const registrationInfo = guest_count > 0 ? `${guest_count} registered` : 'No registrations yet';
  
  // Construct full URL
  const eventUrl = `https://lu.ma/${event.url}`;
  
  // Build formatted output
  return `- ${event.name}
  Event ID: ${event.api_id}
  Date: ${dateLabel} | Time: ${startTime} - ${endTime} ${timezoneAbbr}
  Location: ${location}
  Hosts: ${hostNames}
  Tickets: ${ticketInfo} | ${registrationInfo}
  Link: ${eventUrl}`;
}

/**
 * Filter events happening today
 */
export function filterTodaysEvents(entries: LumaEntry[]): LumaEntry[] {
  return entries.filter(entry => {
    const startDate = parseISO(entry.event.start_at);
    return isToday(startDate);
  });
}

/**
 * Filter events happening in the next N days
 */
export function filterUpcomingEvents(entries: LumaEntry[], days: number): LumaEntry[] {
  const now = new Date();
  const futureDate = addDays(now, days);
  
  return entries.filter(entry => {
    const startDate = parseISO(entry.event.start_at);
    return isWithinInterval(startDate, {
      start: startOfDay(now),
      end: endOfDay(futureDate)
    });
  });
}

/**
 * Search events by query string in name and description
 */
export function searchEvents(entries: LumaEntry[], query: string): LumaEntry[] {
  const lowerQuery = query.toLowerCase();
  
  return entries.filter(entry => {
    const nameMatch = entry.event.name.toLowerCase().includes(lowerQuery);
    const descriptionMatch = entry.event.description?.toLowerCase().includes(lowerQuery) || false;
    return nameMatch || descriptionMatch;
  });
}

/**
 * Format multiple events into a bullet list
 */
export function formatEventsList(entries: LumaEntry[], emptyMessage: string = 'No events found.'): string {
  if (entries.length === 0) {
    return emptyMessage;
  }
  
  return entries.map(entry => formatEvent(entry)).join('\n\n');
}

