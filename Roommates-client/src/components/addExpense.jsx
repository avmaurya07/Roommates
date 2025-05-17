import React, { useState, useEffect } from "react";
import config from "../config";

function AddExpense() {
  const baseURL = config.baseURL;
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState({});
  const [paidForUsers, setPaidForUsers] = useState({});
  const [expenseType, setExpenseType] = useState("split"); // "split", "personal"
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notification, setNotification] = useState("");
  const [showNotification, setShowNotification] = useState(false);

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
      setUsers(data.data);

      // Initialize selected users objects
      const initialSelectedUsers = {};
      const initialPaidForUsers = {};
      data.data.forEach((user) => {
        initialSelectedUsers[user.userId] = false;
        initialPaidForUsers[user.userId] = false;
      });
      setSelectedUsers(initialSelectedUsers);
      setPaidForUsers(initialPaidForUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };
  const handleUserCheckbox = (userId) => {
    setSelectedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handlePaidForCheckbox = (userId) => {
    setPaidForUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };
  const handleExpenseTypeChange = (type) => {
    setExpenseType(type);

    // Reset selections when changing types
    const resetUserSelections = {};
    users.forEach((user) => {
      resetUserSelections[user.userId] = false;
    });

    if (type === "personal") {
      // For personal expenses, only the current user is selected
      const personalSelections = { ...resetUserSelections };
      if (currentUser) {
        personalSelections[currentUser.userId] = true;
      }
      setPaidForUsers(personalSelections);
    } else if (type === "split") {
      // For split expenses, initialize with current user checked by default
      const initialSelections = { ...resetUserSelections };
      if (currentUser) {
        initialSelections[currentUser.userId] = true;
      }
      setSelectedUsers(initialSelections);
      setPaidForUsers(resetUserSelections);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!description) {
      alert("Please provide a description");
      return;
    } // Validate based on expense type
    if (expenseType === "split") {
      // Check if at least one user is selected for splitting
      const hasSelectedUsers = Object.values(selectedUsers).some(
        (selected) => selected
      );
      if (!hasSelectedUsers) {
        alert("Please select at least one user to share the expense with");
        return;
      }
    }

    try {
      setSubmitting(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("amount", amount);
      formData.append("description", description);
      formData.append("paidBy", currentUser.userId);

      if (expenseType === "split") {
        const selectedUserIds = Object.keys(selectedUsers).filter(
          (userId) => selectedUsers[userId]
        );
        const includeCurrentUser = selectedUserIds.includes(currentUser.userId);

        // Check if only current user is selected in split expense
        if (includeCurrentUser && selectedUserIds.length === 1) {
          // Treat as personal expense when only current user is selected
          formData.append("expenseType", "personal");
          formData.append("paidFor", JSON.stringify([currentUser.userId]));
          formData.append("splitWith", JSON.stringify([]));
          setNotification(
            "Only you were selected, so this was saved as a personal expense."
          );
          setShowNotification(true);
        } else if (includeCurrentUser) {
          // Split among all selected users (including payer)
          formData.append("expenseType", "split");
          formData.append("splitWith", JSON.stringify(selectedUserIds));
          formData.append("paidFor", JSON.stringify([]));
          setNotification("");
          setShowNotification(false);
        } else {
          // Payer is not included, so it's a paidFor expense
          formData.append("expenseType", "paidFor");
          formData.append("splitWith", JSON.stringify([]));
          formData.append("paidFor", JSON.stringify(selectedUserIds));
          setNotification("");
          setShowNotification(false);
        }
      } else if (expenseType === "personal") {
        // Personal expense - only for current user
        formData.append("expenseType", "personal");
        formData.append("paidFor", JSON.stringify([currentUser.userId]));
        formData.append("splitWith", JSON.stringify([]));
      }

      // Add image if exists
      if (image) {
        formData.append("receipt", image);
      }

      const response = await fetch(`${baseURL}expenses`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to add expense");
      }

      alert("Expense added successfully!"); // Reset form
      setAmount("");
      setDescription("");
      setImage(null);
      setExpenseType("split"); // Reset to default expense type

      // After 5 seconds, hide the notification
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);

      // Reset user selections
      const resetUserSelections = {};
      users.forEach((user) => {
        resetUserSelections[user.userId] = false;
      });
      setSelectedUsers({ ...resetUserSelections });
      setPaidForUsers({ ...resetUserSelections });

      // Reset file input
      document.getElementById("receipt").value = "";
    } catch (error) {
      console.error("Error adding expense:", error);
      alert(`Error adding expense: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Add New Expense</h1>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg p-6 shadow-md max-w-2xl mx-auto"
        >
          <div className="mb-4">
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
          </div>{" "}
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-gray-700 mb-2 font-medium"
            >
              Description
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this expense for?"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>{" "}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 font-medium">
              Expense Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleExpenseTypeChange("split")}
                className={`p-3 rounded text-center ${
                  expenseType === "split"
                    ? "bg-blue-100 border border-blue-500"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <span className="block font-medium">Split Expense</span>
                <span className="text-xs block mt-1">
                  Track shared expenses with others
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleExpenseTypeChange("personal")}
                className={`p-3 rounded text-center ${
                  expenseType === "personal"
                    ? "bg-amber-100 border border-amber-500"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <span className="block font-medium">Personal</span>
                <span className="text-xs block mt-1">
                  Just for your records
                </span>
              </button>
            </div>
          </div>
          {/* <div className="mb-4">
            <label
              htmlFor="receipt"
              className="block text-gray-700 mb-2 font-medium"
            >
              Receipt Image (Optional)
            </label>{" "}
            <div>
              <input
                type="file"
                id="receipt"
                onChange={handleImageChange}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                accept="image/*"
              />
              {image && (
                <div className="mt-2 flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  <span className="text-sm">{image.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      document.getElementById("receipt").value = "";
                    }}
                    className="ml-2 text-red-500 text-sm"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>{" "} */}
          {expenseType === "split" && (
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">
                Share with
              </label>
              <div className="border border-gray-300 rounded p-3 max-h-60 overflow-y-auto">
                {users.map((user) => (
                  <div key={user.userId} className="mb-2 last:mb-0">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedUsers[user.userId] || false}
                        onChange={() => handleUserCheckbox(user.userId)}
                        className="mr-2 h-5 w-5"
                      />
                      <span className="text-gray-800">
                        {user.name}{" "}
                        {user.userId === currentUser?.userId ? "(You)" : ""}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                <p className="text-sm text-blue-800">
                  <strong>How this works:</strong>
                </p>
                <ul className="list-disc ml-5 mt-1 text-sm text-blue-800">
                  <li>
                    If you include yourself: The expense will be split equally
                    among all selected users.
                  </li>
                  <li>
                    If only you are selected: The expense will be saved as a
                    personal expense.
                  </li>
                  <li>
                    If you exclude yourself: You paid for the selected users
                    without splitting.
                  </li>
                </ul>
              </div>
            </div>
          )}
          {expenseType === "personal" && (
            <div className="mb-6">
              <div className="bg-amber-50 border border-amber-200 rounded p-4">
                <h3 className="font-medium text-amber-800 mb-2">
                  Personal Expense
                </h3>
                <p className="text-amber-700 text-sm">
                  This expense is for your personal tracking only and will not
                  be split or shared with others.
                </p>
              </div>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition duration-200 flex justify-center items-center"
            disabled={submitting}
          >
            {submitting ? "Adding..." : "Add Expense"}
          </button>
          {showNotification && notification && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3 text-amber-700">
              <p className="text-sm flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                {notification}
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default AddExpense;
