import axios from 'axios';
import { API_CONFIG } from '../config';
import {
  Persona,
  ChatRequest,
  ChatResponse,
  ApiResponse,
  GmailCallbackRequest,
  GmailCallbackResponse,
  GmailStatusResponse,
  ServicesStatusResponse,
} from '../types';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    
    // Configure axios defaults (30s for LLM + Gmail API calls)
    axios.defaults.timeout = 30000;
    axios.defaults.headers.common['Content-Type'] = 'application/json';
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}${API_CONFIG.endpoints.health}`);
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async getPersonas(): Promise<ApiResponse<Persona[]>> {
    try {
      const response = await axios.get(`${this.baseURL}${API_CONFIG.endpoints.personas}`);
      return {
        success: true,
        data: response.data.personas ?? response.data,
      };
    } catch (error: any) {
      console.error('Failed to fetch personas:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch personas',
      };
    }
  }

  async getPersona(id: string): Promise<ApiResponse<Persona>> {
    try {
      const response = await axios.get(`${this.baseURL}${API_CONFIG.endpoints.personas}/${id}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Failed to fetch persona:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch persona',
      };
    }
  }

  async sendChatMessage(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    try {
      const response = await axios.post(`${this.baseURL}${API_CONFIG.endpoints.chat}`, request, {
        timeout: 60000, // 60s — routing LLM + Gmail API + response LLM
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Failed to send chat message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  }
  // --- Auth / Services Methods ---

  async gmailCallback(request: GmailCallbackRequest): Promise<ApiResponse<GmailCallbackResponse>> {
    try {
      const response = await axios.post(
        `${this.baseURL}${API_CONFIG.endpoints.authGmailCallback}`,
        request
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Gmail callback failed:', error);
      return { success: false, error: error.message || 'Gmail authentication failed' };
    }
  }

  async getGmailStatus(userId: string): Promise<ApiResponse<GmailStatusResponse>> {
    try {
      const response = await axios.get(
        `${this.baseURL}${API_CONFIG.endpoints.authGmailStatus}`,
        { params: { user_id: userId } }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Gmail status check failed:', error);
      return { success: false, error: error.message || 'Failed to check Gmail status' };
    }
  }

  async disconnectGmail(userId: string): Promise<ApiResponse<{ disconnected: boolean }>> {
    try {
      const response = await axios.post(
        `${this.baseURL}${API_CONFIG.endpoints.authGmailDisconnect}`,
        { user_id: userId }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Gmail disconnect failed:', error);
      return { success: false, error: error.message || 'Failed to disconnect Gmail' };
    }
  }

  async getServicesStatus(userId: string): Promise<ApiResponse<ServicesStatusResponse>> {
    try {
      const response = await axios.get(
        `${this.baseURL}${API_CONFIG.endpoints.servicesStatus}`,
        { params: { user_id: userId } }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Services status check failed:', error);
      return { success: false, error: error.message || 'Failed to get services status' };
    }
  }
}

export const apiService = new ApiService();