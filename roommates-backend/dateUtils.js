/**
 * Utility functions for handling dates in IST (Indian Standard Time)
 */

// Get current date and time in IST
const getCurrentDateIST = () => {
  const date = new Date();
  // Convert to IST string format (IST is UTC+5:30)
  const istTime = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return istTime;
};

// Format date to ISO string in IST
const toISOStringIST = (date = new Date()) => {
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toISOString();
};

// Parse ISO string to IST date object
const parseISOToIST = (isoString) => {
  const date = new Date(isoString);
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
};

// Format date to YYYY-MM-DD in IST
const formatDateIST = (date = new Date()) => {
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toISOString().split("T")[0];
};

// Get start of day in IST
const getStartOfDayIST = (date = new Date()) => {
  // Convert to IST
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  // Set to 00:00:00.000 (midnight) in IST
  istDate.setUTCHours(0, 0, 0, 0);
  // Convert back to original timezone
  return istDate;
};

// Get end of day in IST
const getEndOfDayIST = (date = new Date()) => {
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  istDate.setUTCHours(23, 59, 59, 999);
  return istDate;
};

module.exports = {
  getCurrentDateIST,
  toISOStringIST,
  parseISOToIST,
  formatDateIST,
  getStartOfDayIST,
  getEndOfDayIST,
};
