import axios from 'axios';
import { API_CONFIG } from '../config';
import { Persona, ChatRequest, ChatResponse, ApiResponse } from '../types';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    
    // Configure axios defaults
    axios.defaults.timeout = 10000;
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
        data: response.data,
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
      const response = await axios.post(`${this.baseURL}${API_CONFIG.endpoints.chat}`, request);
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
}

export const apiService = new ApiService();