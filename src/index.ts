#!/usr/bin/env node

/**
 * MCP Server for Network School Luma Events
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { LumaClient } from './luma-client.js';
import {
  filterTodaysEvents,
  filterUpcomingEvents,
  searchEvents,
  formatEventsList,
} from './formatters.js';

// Initialize Luma client
const lumaClient = new LumaClient();

// Create MCP server
const server = new Server(
  {
    name: 'network-school-events',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register list_tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_todays_events',
        description: 'Get all Network School events happening today',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_upcoming_events',
        description: 'Get Network School events happening in the next N days',
        inputSchema: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              description: 'Number of days to look ahead (default: 7)',
              default: 7,
            },
          },
        },
      },
      {
        name: 'search_events',
        description: 'Search Network School events by name or description',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'register_for_event',
        description: 'Register for a Network School event using the event ID from the event listing',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'The event API ID (e.g., evt-xxx) from the event listing',
            },
            name: {
              type: 'string',
              description: 'Full name for registration',
            },
            email: {
              type: 'string',
              description: 'Email address for registration',
            },
            phone_number: {
              type: 'string',
              description: 'Phone number (optional)',
              default: '',
            },
            timezone: {
              type: 'string',
              description: 'Timezone (default: Asia/Kuala_Lumpur)',
              default: 'Asia/Kuala_Lumpur',
            },
          },
          required: ['event_id', 'name', 'email'],
        },
      },
    ],
  };
});

// Register call_tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'get_todays_events': {
        const response = await lumaClient.fetchEvents();
        const todaysEvents = filterTodaysEvents(response.entries);
        const formatted = formatEventsList(
          todaysEvents,
          'No events scheduled for today.'
        );

        return {
          content: [
            {
              type: 'text',
              text: formatted,
            },
          ],
        };
      }

      case 'get_upcoming_events': {
        const days = (args?.days as number) || 7;
        
        if (typeof days !== 'number' || days < 1) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: days parameter must be a positive number',
              },
            ],
            isError: true,
          };
        }

        const response = await lumaClient.fetchEvents();
        const upcomingEvents = filterUpcomingEvents(response.entries, days);
        const formatted = formatEventsList(
          upcomingEvents,
          `No events scheduled in the next ${days} day${days !== 1 ? 's' : ''}.`
        );

        return {
          content: [
            {
              type: 'text',
              text: formatted,
            },
          ],
        };
      }

      case 'search_events': {
        const query = args?.query as string;
        
        if (!query || typeof query !== 'string') {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: query parameter is required and must be a string',
              },
            ],
            isError: true,
          };
        }

        const response = await lumaClient.fetchEvents();
        const matchingEvents = searchEvents(response.entries, query);
        const formatted = formatEventsList(
          matchingEvents,
          `No events found matching "${query}".`
        );

        return {
          content: [
            {
              type: 'text',
              text: formatted,
            },
          ],
        };
      }

      case 'register_for_event': {
        const eventId = args?.event_id as string;
        const name = args?.name as string;
        const email = args?.email as string;
        const phoneNumber = (args?.phone_number as string) || '';
        const timezone = (args?.timezone as string) || 'Asia/Kuala_Lumpur';
        
        if (!eventId || typeof eventId !== 'string') {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: event_id parameter is required and must be a string',
              },
            ],
            isError: true,
          };
        }

        if (!name || typeof name !== 'string') {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: name parameter is required and must be a string',
              },
            ],
            isError: true,
          };
        }

        if (!email || typeof email !== 'string') {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: email parameter is required and must be a string',
              },
            ],
            isError: true,
          };
        }

        const registration = await lumaClient.registerForEvent(
          eventId,
          name,
          email,
          phoneNumber,
          timezone
        );

        const successMessage = `✅ Successfully registered for the event!

Registration Details:
- Name: ${name}
- Email: ${registration.email}
- Status: ${registration.approval_status}
- Ticket Key: ${registration.ticket_key}
- RSVP ID: ${registration.rsvp_api_id}

${registration.event_tickets.length > 0 ? `Ticket Type: ${registration.event_tickets[0].event_ticket_type_info.name} (${registration.event_tickets[0].event_ticket_type_info.type})` : ''}

You should receive a confirmation email at ${registration.email}.`;

        return {
          content: [
            {
              type: 'text',
              text: successMessage,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Network School Events MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

