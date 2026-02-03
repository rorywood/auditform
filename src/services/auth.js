import { loginRequest } from '../config/msalConfig';

export async function acquireToken(msalInstance, account) {
  if (!account) {
    throw new Error('No account found. Please sign in.');
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  } catch (error) {
    if (error.name === 'InteractionRequiredAuthError') {
      const response = await msalInstance.acquireTokenPopup(loginRequest);
      return response.accessToken;
    }
    throw error;
  }
}

export async function signIn(msalInstance) {
  try {
    const response = await msalInstance.loginPopup(loginRequest);
    return response.account;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function signOut(msalInstance) {
  try {
    await msalInstance.logoutPopup();
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}

export function getActiveAccount(msalInstance) {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    return accounts[0];
  }
  return null;
}
