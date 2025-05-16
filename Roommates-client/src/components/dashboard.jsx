import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import config from "../config";

function Dashboard() {
  const baseURL = config.baseURL;
  const [userData, setUserData] = useState(null);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    if (storedUserData) {
      const parsedUserData = JSON.parse(storedUserData);
      setUserData(parsedUserData);
      setIsAdmin(parsedUserData.isAdmin === true);
      fetchSummaryData(parsedUserData.userId);
    }
  }, []);

  const fetchSummaryData = async (userId) => {
    try {
      setLoading(true);
      const response = await fetch(`${baseURL}summary?userId=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch summary data");
      }

      const data = await response.json();
      setSummaryData(data.data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching summary data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalOwed = 0;
    let totalOwing = 0;

    summaryData.forEach((item) => {
      if (item.amount > 0) {
        totalOwed += item.amount;
      } else {
        totalOwing += Math.abs(item.amount);
      }
    });

    return { totalOwed, totalOwing, netBalance: totalOwed - totalOwing };
  };

  const { totalOwed, totalOwing, netBalance } = calculateTotals();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-center">Error: {error}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* User Info */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              Welcome, {userData?.name}
            </h2>
            <div className="mb-2">
              <span className="font-medium">User ID:</span> {userData?.userId}
            </div>
            {userData?.isAdmin && (
              <div className="mb-2">
                <span className="font-medium">Role:</span>{" "}
                {userData?.isAdmin ? "Admin" : "Regular User"}
              </div>
            )}
          </div>
          {/* Financial Summary */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Financial Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-100 rounded-lg">
                <p className="text-sm text-gray-600">You are owed</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{totalOwed.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-3 bg-red-100 rounded-lg">
                <p className="text-sm text-gray-600">You owe</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{totalOwing.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-gray-600">Net Balance</p>
                <p
                  className={`text-2xl font-bold ${
                    netBalance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ₹{netBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>{" "}
          {/* Quick Navigation */}
          <div className="bg-white rounded-lg p-6 shadow-md md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Quick Navigation</h2>{" "}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <Link
                to="/add-expense"
                className="bg-blue-600 text-white text-center p-4 rounded-lg hover:bg-blue-700 transition"
              >
                Add New Expense
              </Link>
              <Link
                to="/my-expenses"
                className="bg-purple-600 text-white text-center p-4 rounded-lg hover:bg-purple-700 transition"
              >
                View My Expenses
              </Link>
              <Link
                to="/summary"
                className="bg-amber-600 text-white text-center p-4 rounded-lg hover:bg-amber-700 transition"
              >
                Settlement Summary
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Link
                to="/amount-paid"
                className="bg-green-600 text-white text-center p-4 rounded-lg hover:bg-green-700 transition"
              >
                Record Payment
              </Link>
              <Link
                to="/payment-history"
                className="bg-teal-600 text-white text-center p-4 rounded-lg hover:bg-teal-700 transition"
              >
                Payment History
              </Link>
              <Link
                to="/change-password"
                className="bg-gray-600 text-white text-center p-4 rounded-lg hover:bg-gray-700 transition"
              >
                Change Password
              </Link>
            </div>
            {/* Admin-specific Navigation Links */}
            {isAdmin && (
              <>
                <h3 className="text-lg font-semibold mt-6 mb-3">Admin Tools</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Link
                    to="/user-management"
                    className="bg-indigo-600 text-white text-center p-4 rounded-lg hover:bg-indigo-700 transition"
                  >
                    User Management
                  </Link>
                  <Link
                    to="/register"
                    className="bg-pink-600 text-white text-center p-4 rounded-lg hover:bg-pink-700 transition"
                  >
                    Create New User
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
