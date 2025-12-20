// Device ID utility for unique user tracking
// Generates a persistent device ID stored in localStorage

const DEVICE_ID_KEY = 'take2-device-id';
const DEVICE_NAME_KEY = 'take2-device-name';

// Generate a random device ID (UUID-like)
const generateDeviceId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

// Get or create a persistent device ID
export const getDeviceId = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (e) {
    console.warn('Failed to get/set device ID:', e);
    return null;
  }
};

// Get a short display version of the device ID
export const getDeviceIdShort = () => {
  const id = getDeviceId();
  return id ? `#${id.substring(0, 4)}` : '';
};

// Get or set a custom device name (optional)
export const getDeviceName = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(DEVICE_NAME_KEY) || getDefaultDeviceName();
  } catch (e) {
    return getDefaultDeviceName();
  }
};

export const setDeviceName = (name) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(DEVICE_NAME_KEY, name);
  } catch (e) {
    console.warn('Failed to set device name:', e);
  }
};

// Generate a default device name based on browser/platform
const getDefaultDeviceName = () => {
  if (typeof window === 'undefined') return 'Unknown';
  
  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  
  return 'Web';
};

// Get full device info for API
export const getDeviceInfo = () => ({
  deviceId: getDeviceId(),
  deviceName: getDeviceName(),
  deviceIdShort: getDeviceIdShort(),
});
