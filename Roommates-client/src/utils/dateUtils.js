/**
 * Utility functions for handling dates in IST (Indian Standard Time)
 */

// Get current date in IST
export const getCurrentDateIST = () => {
  const date = new Date();
  // Convert to IST string format (IST is UTC+5:30)
  const istOptions = { timeZone: "Asia/Kolkata" };
  return new Date(date.toLocaleString("en-US", istOptions));
};

// Format date to YYYY-MM-DD in IST for API requests
export const formatDateForAPI = (date) => {
  const istDate = new Date(date);
  // Convert to IST
  const istOptions = { timeZone: "Asia/Kolkata" };
  const istDateString = istDate.toLocaleString("en-US", istOptions);
  const istDateObj = new Date(istDateString);

  // Format as YYYY-MM-DD
  const year = istDateObj.getFullYear();
  const month = String(istDateObj.getMonth() + 1).padStart(2, "0");
  const day = String(istDateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Format date for display with options
export const formatDateForDisplay = (dateString, options = {}) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const defaultOptions = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };

  return date.toLocaleString("en-US", defaultOptions);
};

// Format date as simple date (DD MMM YYYY)
export const formatSimpleDate = (dateString) => {
  if (!dateString) return "";
  return formatDateForDisplay(dateString, {
    hour: undefined,
    minute: undefined,
  });
};

// Parse ISO date string to local date in IST
export const parseISOToIST = (isoString) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  const istOptions = { timeZone: "Asia/Kolkata" };
  const istDateString = date.toLocaleString("en-US", istOptions);
  return new Date(istDateString);
};
