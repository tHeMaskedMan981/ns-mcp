/**
 * Luma API client for fetching Network School events
 */

import axios from 'axios';
import { LumaResponse, RegisterRequest, RegistrationResponse } from './types.js';

const LUMA_API_URL = 'https://api2.luma.com/calendar/get-items?calendar_api_id=cal-4dWxlBFjW9Cd6ou&pagination_limit=20&period=future';
const LUMA_REGISTER_URL = 'https://api2.luma.com/event/register';
const CALENDAR_API_ID = 'cal-4dWxlBFjW9Cd6ou';

export class LumaClient {
  /**
   * Fetch events from Luma API
   */
  async fetchEvents(): Promise<LumaResponse> {
    try {
      const response = await axios.get<LumaResponse>(LUMA_API_URL, {
        headers: {
          'Accept': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        throw new Error(`Failed to fetch events from Luma API: ${status ? `${status} ${statusText}` : error.message}`);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to fetch events from Luma API: ${error.message}`);
      }
      throw new Error('Failed to fetch events from Luma API: Unknown error');
    }
  }

  /**
   * Get event details including ticket types
   */
  async getEventDetails(eventApiId: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api2.luma.com/event/get?event_api_id=${eventApiId}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        throw new Error(`Failed to fetch event details: ${status ? `${status} ${statusText}` : error.message}`);
      }
      throw error;
    }
  }

  /**
   * Register for an event
   */
  async registerForEvent(
    eventApiId: string,
    name: string,
    email: string,
    phoneNumber: string = '',
    timezone: string = 'Asia/Kuala_Lumpur'
  ): Promise<RegistrationResponse> {
    try {
      // First, fetch the event to verify it exists
      const events = await this.fetchEvents();
      const eventEntry = events.entries.find(e => e.event.api_id === eventApiId);
      
      if (!eventEntry) {
        throw new Error(`Event with ID ${eventApiId} not found`);
      }

      // Try to get event details to find ticket types
      let ticketTypeSelection: { [key: string]: { count: number; amount: number } } = {};
      
      try {
        const eventDetails = await this.getEventDetails(eventApiId);
        
        // Extract ticket types from event details
        if (eventDetails.event && eventDetails.event.event_ticket_types) {
          const ticketTypes = eventDetails.event.event_ticket_types;
          
          // Use the first available ticket type (typically "Standard" for free events)
          if (ticketTypes.length > 0) {
            const firstTicketType = ticketTypes[0];
            ticketTypeSelection[firstTicketType.api_id] = {
              count: 1,
              amount: firstTicketType.cents || 0
            };
          }
        }
      } catch (detailsError) {
        // If we can't get ticket details, we'll try without it
        console.error('Could not fetch event details, attempting registration without ticket type info');
      }
      
      const registrationData: Partial<RegisterRequest> = {
        name,
        first_name: '',
        last_name: '',
        email,
        event_api_id: eventApiId,
        for_waitlist: false,
        payment_method: null,
        payment_currency: null,
        registration_answers: [],
        coupon_code: null,
        timezone,
        token_gate_info: null,
        eth_address_info: null,
        phone_number: phoneNumber,
        solana_address_info: null,
        expected_amount_cents: 0,
        expected_amount_discount: 0,
        expected_amount_tax: 0,
        currency: null,
        event_invite_api_id: null,
        ticket_type_to_selection: ticketTypeSelection,
        solana_address: null,
        opened_from: {
          source: 'calendar',
          calendar_api_id: CALENDAR_API_ID,
        },
      };

      const response = await axios.post<RegistrationResponse>(
        LUMA_REGISTER_URL,
        registrationData,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const errorData = error.response?.data;
        throw new Error(
          `Failed to register for event: ${status ? `${status} ${statusText}` : error.message}${
            errorData ? ` - ${JSON.stringify(errorData)}` : ''
          }`
        );
      }
      if (error instanceof Error) {
        throw new Error(`Failed to register for event: ${error.message}`);
      }
      throw new Error('Failed to register for event: Unknown error');
    }
  }
}

