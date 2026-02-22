export interface Persona {
  id: string;
  name: string;
  description: string;
  behavior: {
    tone: string;
    proactiveness: string;
  };
  skills: string[];
  first_message: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  persona?: string;
  skill_used?: string;
}

export interface ChatRequest {
  message: string;
  persona: string;
  user_id: string;
}

export interface ChatResponse {
  response: string;
  skill_used?: string;
  persona: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Service / Auth Types ---

export interface GmailCallbackRequest {
  code: string;
  code_verifier?: string;
  redirect_uri: string;
  user_id: string;
}

export interface GmailCallbackResponse {
  connected: boolean;
  email: string;
}

export interface GmailStatusResponse {
  connected: boolean;
  email: string | null;
}

export interface ServiceStatus {
  enabled: boolean;
  connected: boolean;
  email?: string | null;
}

export interface ServicesStatusResponse {
  services: {
    gmail: ServiceStatus;
    calendar: ServiceStatus;
  };
}