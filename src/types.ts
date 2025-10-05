/**
 * TypeScript types for Luma API response
 */

export interface LumaEvent {
  api_id: string;
  name: string;
  start_at: string;
  end_at: string;
  timezone: string;
  url: string;
  location_type: string;
  geo_address_info: {
    address: string;
  } | null;
  description?: string;
  ticket_types?: TicketType[];
}

export interface TicketType {
  api_id: string;
  name: string;
  type: string;
  cents: number | null;
  currency: string | null;
}

export interface Host {
  name: string;
  username: string;
}

export interface TicketInfo {
  is_free: boolean;
  price: string | null;
  spots_remaining: number | null;
}

export interface LumaEntry {
  event: LumaEvent;
  hosts: Host[];
  guest_count: number;
  ticket_info: TicketInfo;
}

export interface LumaResponse {
  entries: LumaEntry[];
}

export interface RegisterRequest {
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  event_api_id: string;
  for_waitlist: boolean;
  payment_method: null;
  payment_currency: null;
  registration_answers: any[];
  coupon_code: null;
  timezone: string;
  token_gate_info: null;
  eth_address_info: null;
  phone_number: string;
  solana_address_info: null;
  expected_amount_cents: number;
  expected_amount_discount: number;
  expected_amount_tax: number;
  currency: null;
  event_invite_api_id: null;
  ticket_type_to_selection: {
    [key: string]: {
      count: number;
      amount: number;
    };
  };
  solana_address: null;
  opened_from: {
    source: string;
    calendar_api_id: string;
  };
}

export interface RegistrationResponse {
  approval_status: string;
  event_tickets: Array<{
    api_id: string;
    event_ticket_type_api_id: string;
    event_ticket_type_info: {
      name: string;
      type: string;
      cents: number | null;
      api_id: string;
      currency: string | null;
    };
  }>;
  avatar_url: string;
  email: string;
  cents: number;
  currency: string | null;
  email_verified: boolean;
  rsvp_api_id: string;
  status: string;
  ticket_key: string;
  user_api_id: string;
}

