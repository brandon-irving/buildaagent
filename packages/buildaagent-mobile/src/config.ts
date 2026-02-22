export const API_CONFIG = {
  baseURL: 'http://localhost:3000', // Change to your server IP for device testing
  endpoints: {
    health: '/api/health',
    personas: '/api/personas',
    chat: '/api/chat',
    authGmailCallback: '/api/auth/gmail/callback',
    authGmailStatus: '/api/auth/gmail/status',
    authGmailDisconnect: '/api/auth/gmail/disconnect',
    servicesStatus: '/api/services/status',
  },
};

export const APP_CONFIG = {
  name: 'BuildAAgent',
  version: '1.0.0',
  description: 'Your Personal AI Agent',
};

// Google OAuth — use your **Web** client ID from Google Cloud Console
// (the Web client ID is needed for serverAuthCode exchange on the backend)
export const GOOGLE_CLIENT_ID = '44450409169-03ro3v3ohfnvdqgcccd8tfieam4qnilr.apps.googleusercontent.com';