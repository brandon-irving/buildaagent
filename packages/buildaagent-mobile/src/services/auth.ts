/**
 * Google Auth Service
 *
 * Uses @react-native-google-signin/google-signin for native Google sign-in.
 * Gets a serverAuthCode which the backend exchanges for access/refresh tokens.
 *
 * Docs: https://react-native-google-signin.github.io/docs/original
 */

import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_CLIENT_ID } from '../config';
import { apiService } from './api';

// Configure once at app startup
GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID,
  offlineAccess: true, // needed to get serverAuthCode for backend token exchange
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.labels',
  ],
});

/**
 * Sign in with Google and send the auth code to the backend.
 * Returns { connected, email } on success, null on failure/cancellation.
 */
export async function signInWithGoogle(userId: string) {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return null;
    }

    const serverAuthCode = response.data.serverAuthCode;
    if (!serverAuthCode) {
      console.error('[AUTH] No serverAuthCode returned');
      return null;
    }

    // Send auth code to backend for token exchange
    const result = await apiService.gmailCallback({
      code: serverAuthCode,
      redirect_uri: '', // not needed for native sign-in
      user_id: userId,
    });

    if (result.success && result.data) {
      return result.data;
    }

    return null;
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          // User cancelled — not an error
          break;
        case statusCodes.IN_PROGRESS:
          console.warn('[AUTH] Sign in already in progress');
          break;
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          console.error('[AUTH] Play services not available');
          break;
        default:
          console.error('[AUTH] Sign in error:', error);
      }
    } else {
      console.error('[AUTH] Unexpected sign in error:', error);
    }
    return null;
  }
}

/**
 * Sign out from Google on the device side.
 */
export async function signOutFromGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('[AUTH] Sign out error:', error);
  }
}
