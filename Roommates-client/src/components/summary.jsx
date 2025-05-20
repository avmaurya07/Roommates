import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import config from "../config";

function Summary() {
  const baseURL = config.baseURL;
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem("userData"));
      if (!userData) {
        throw new Error("User not logged in");
      }

      const response = await fetch(
        `${baseURL}summary?userId=${userData.userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch summary data");
      }

      const data = await response.json();
      setSummary(data.data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching summary data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group summary by user
  const groupedSummary = summary.reduce((acc, item) => {
    if (!acc[item.userId]) {
      acc[item.userId] = {
        userId: item.userId,
        name: item.name,
        totalAmount: 0,
      };
    }
    acc[item.userId].totalAmount += item.amount;
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Settlement Summary</h1>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-center">Error: {error}</p>
      ) : summary.length === 0 ? (
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <p className="text-gray-500">No settlements to display.</p>
          <p className="text-gray-500 mt-2">You're all settled up!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Your Balance</h2>

            {Object.values(groupedSummary).map((user) => (
              <div
                key={user.userId}
                className="flex justify-between items-center py-3 border-b last:border-0"
              >
                <div className="flex items-center">
                  <div className="ml-3">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.userId}</p>
                  </div>
                </div>
                <div
                  className={`text-lg font-semibold ${
                    user.totalAmount > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {user.totalAmount > 0
                    ? `${user.name} owes you ₹${Math.abs(
                        user.totalAmount
                      ).toFixed(2)}`
                    : `You owe ${user.name} ₹${Math.abs(
                        user.totalAmount
                      ).toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              Settlement Instructions
            </h2>

            {Object.values(groupedSummary).length === 0 ? (
              <p className="text-gray-500">
                Everyone is settled up. Great job!
              </p>
            ) : (
              <div className="space-y-4">
                {Object.values(groupedSummary).map((user) => (
                  <div
                    key={user.userId}
                    className="p-3 rounded-lg border border-gray-200"
                  >
                    {user.totalAmount > 0 ? (
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 text-green-600 flex items-center justify-center rounded-full mr-3">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-green-600 font-medium">
                            Receive ₹{Math.abs(user.totalAmount).toFixed(2)}{" "}
                            from {user.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Ask {user.name} to record this payment after sending
                            you money.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-red-100 text-red-600 flex items-center justify-center rounded-full mr-3">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-red-600 font-medium">
                            Pay ₹{Math.abs(user.totalAmount).toFixed(2)} to{" "}
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Remember to record this payment after sending money.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <Link
                to="/amount-paid"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Record a Payment
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Summary;
