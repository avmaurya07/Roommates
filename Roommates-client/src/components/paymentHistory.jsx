import React, { useState, useEffect } from "react";
import config from "../config";
import {
  formatDateForDisplay,
  formatSimpleDate,
  getCurrentDateIST,
  formatDateForAPI,
} from "../utils/dateUtils";

function PaymentHistory() {
  const baseURL = config.baseURL;
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  // Date filtering with IST timezone
  const getCurrentMonth = () => {
    const now = getCurrentDateIST();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: formatDateForAPI(firstDay),
      end: formatDateForAPI(now),
    };
  };

  const [dateFilter, setDateFilter] = useState(getCurrentMonth());

  // Handle date filter change with debounce
  const handleDateFilterChange = (newFilter) => {
    setFilterLoading(true);
    setDateFilter(newFilter);
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("userData"));
    if (userData) {
      setCurrentUser(userData);
      fetchPaymentHistory(userData.userId);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchPaymentHistory(currentUser.userId);
    }
  }, [dateFilter]);

  const fetchPaymentHistory = async (userId) => {
    try {
      // Only set main loading to true on initial load
      if (!filterLoading) {
        setLoading(true);
      }

      const params = new URLSearchParams({
        userId: userId,
        startDate: dateFilter.start,
        endDate: dateFilter.end,
      });

      const response = await fetch(
        `${baseURL}payment-history?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch payment history");
      }

      const data = await response.json();
      setPayments(data.data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching payment history:", err);
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  };

  const formatDate = (dateString) => {
    // Use our dateUtils function for consistent IST formatting
    return formatDateForDisplay(dateString);
  };
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Payment History</h1>

      {/* Date Filter Controls */}
      <div className="bg-white rounded-lg p-4 shadow-md mb-4">
        <h2 className="text-lg font-semibold mb-3">Filter by Date</h2>
        <div className="flex flex-wrap gap-4">
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) =>
                handleDateFilterChange({ ...dateFilter, start: e.target.value })
              }
              max={dateFilter.end}
              className="p-2 border rounded w-full md:w-auto"
              disabled={filterLoading}
            />
          </div>
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>{" "}
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) =>
                handleDateFilterChange({ ...dateFilter, end: e.target.value })
              }
              min={dateFilter.start}
              max={formatDateForAPI(new Date())}
              className="p-2 border rounded w-full md:w-auto"
              disabled={filterLoading}
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <button
              onClick={() => handleDateFilterChange(getCurrentMonth())}
              className="px-4 py-1.5 bg-blue-100 hover:bg-blue-200 rounded transition text-sm"
              disabled={filterLoading}
            >
              Current Month
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(
                  now.getFullYear(),
                  now.getMonth() - 1,
                  1
                );
                const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                handleDateFilterChange({
                  start: firstDay.toISOString().split("T")[0],
                  end: lastDay.toISOString().split("T")[0],
                });
              }}
              className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition text-sm"
              disabled={filterLoading}
            >
              Previous Month
            </button>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <button
              onClick={() => {
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                handleDateFilterChange({
                  start: startOfWeek.toISOString().split("T")[0],
                  end: today.toISOString().split("T")[0],
                });
              }}
              className="px-4 py-1.5 bg-green-100 hover:bg-green-200 rounded transition text-sm"
              disabled={filterLoading}
            >
              Current Week
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                handleDateFilterChange({
                  start: startOfYear.toISOString().split("T")[0],
                  end: now.toISOString().split("T")[0],
                });
              }}
              className="px-4 py-1.5 bg-amber-100 hover:bg-amber-200 rounded transition text-sm"
              disabled={filterLoading}
            >
              This Year
            </button>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing payments from {formatDate(dateFilter.start)} to{" "}
          {formatDate(dateFilter.end)}
        </div>
      </div>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-center">Error: {error}</p>
      ) : filterLoading ? (
        <p className="text-center">Updating results...</p>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <p className="text-gray-500">
            No payment history found for the selected date range.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className={`bg-white rounded-lg p-4 shadow-md border-l-4 ${
                payment.paidBy === currentUser?.userId
                  ? "border-red-500"
                  : "border-green-500"
              }`}
            >
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold text-lg">
                  {payment.paidBy === currentUser?.userId
                    ? `You paid ${payment.paidToName}`
                    : `${payment.paidByName} paid you`}
                </h3>
                <span className="text-gray-500 text-sm">
                  {formatDate(payment.createdAt)}
                </span>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center">
                  {payment.paidBy === currentUser?.userId ? (
                    <span className="text-red-600 font-medium">
                      -₹{payment.amount.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-green-600 font-medium">
                      +₹{payment.amount.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PaymentHistory;
