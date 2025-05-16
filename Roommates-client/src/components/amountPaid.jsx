import React, { useState, useEffect } from "react";
import config from "../config";

function AmountPaid() {
  const baseURL = config.baseURL;
  const [users, setUsers] = useState([]);
  const [amount, setAmount] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("userData"));
    if (userData) {
      setCurrentUser(userData);
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem("userData"));

      const response = await fetch(`${baseURL}users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      // Filter out the current user
      const filteredUsers = data.data.filter(
        (user) => user.userId !== userData.userId
      );
      setUsers(filteredUsers);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!selectedUser) {
      alert("Please select a user");
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`${baseURL}payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paidBy: currentUser.userId,
          paidTo: selectedUser,
          amount: parseFloat(amount),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to record payment");
      }

      setSuccess(true);

      // Reset form
      setAmount("");
      setSelectedUser("");

      // Delay clearing success message
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError(err.message);
      console.error("Error recording payment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Record Payment</h1>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg p-6 shadow-md max-w-md mx-auto"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              Error: {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
              Payment recorded successfully!
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="user"
              className="block text-gray-700 mb-2 font-medium"
            >
              I paid
            </label>
            <select
              id="user"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label
              htmlFor="amount"
              className="block text-gray-700 mb-2 font-medium"
            >
              Amount (₹)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              step="0.01"
              min="0.01"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition duration-200 flex justify-center items-center"
            disabled={submitting}
          >
            {submitting ? "Recording..." : "Record Payment"}
          </button>

          <div className="mt-4 text-sm text-gray-500">
            <p>
              Recording a payment means you have paid money to settle your debt
              with another user.
            </p>
            <p className="mt-1">
              This will update the balances for both you and the recipient.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

export default AmountPaid;
