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
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  istDate.setUTCHours(0, 0, 0, 0);
  return new Date(istDate.getTime() - 5.5 * 60 * 60 * 1000);
};

// Get end of day in IST
const getEndOfDayIST = (date = new Date()) => {
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  istDate.setUTCHours(23, 59, 59, 999);
  return new Date(istDate.getTime() - 5.5 * 60 * 60 * 1000);
};

module.exports = {
  getCurrentDateIST,
  toISOStringIST,
  parseISOToIST,
  formatDateIST,
  getStartOfDayIST,
  getEndOfDayIST,
};
