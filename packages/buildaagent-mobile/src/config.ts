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

// Google OAuth — Web client ID (for serverAuthCode exchange on the backend)
export const GOOGLE_CLIENT_ID = '44450409169-03ro3v3ohfnvdqgcccd8tfieam4qnilr.apps.googleusercontent.com';

// Google OAuth — iOS client ID (for native sign-in on iOS)
export const GOOGLE_IOS_CLIENT_ID = '44450409169-erhotn6cven9g9oqciqeipkleevjulrt.apps.googleusercontent.com';