import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import config from "../config";

function MyExpenses() {
  const baseURL = config.baseURL;
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("all"); // 'all', 'paid', 'owed'
  const [sortOrder, setSortOrder] = useState("newest"); // 'newest', 'oldest', 'highest', 'lowest'
  const [expenseTypeFilter, setExpenseTypeFilter] = useState("all"); // 'all', 'split', 'paidFor', 'personal'

  // Date filtering
  const getCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: firstDay.toISOString().split("T")[0],
      end: new Date().toISOString().split("T")[0],
    };
  };

  const [dateFilter, setDateFilter] = useState(getCurrentMonth());

  // Handle date filter change with debounce
  const handleDateFilterChange = (newFilter) => {
    setFilterLoading(true);
    setDateFilter(newFilter);
  };

  useEffect(() => {
    fetchExpenses();
  }, [dateFilter]);
  const fetchExpenses = async () => {
    try {
      // Only set main loading to true on initial load
      if (!filterLoading) {
        setLoading(true);
      }

      const userData = JSON.parse(localStorage.getItem("userData"));
      if (!userData) {
        throw new Error("User not logged in");
      }

      const params = new URLSearchParams({
        userId: userData.userId,
        startDate: dateFilter.start,
        endDate: dateFilter.end,
      });

      const response = await fetch(`${baseURL}expenses?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch expenses");
      }

      const data = await response.json();
      setExpenses(data.data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  };
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    // Check if the date is in YYYY-MM-DD format (from the date input)
    if (dateString && dateString.includes("-") && dateString.length === 10) {
      const [year, month, day] = dateString.split("-");
      const date = new Date(year, month - 1, day); // months are 0-indexed in JS
      return date.toLocaleDateString(undefined, options);
    }
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getCurrentUserId = () => {
    const userData = JSON.parse(localStorage.getItem("userData"));
    return userData ? userData.userId : null;
  };
  const filteredExpenses = () => {
    const currentUserId = getCurrentUserId();

    // First filter by tab
    let filtered;
    switch (selectedTab) {
      case "paid":
        filtered = expenses.filter(
          (expense) => expense.paidBy === currentUserId
        );
        break;
      case "owed":
        filtered = expenses.filter((expense) => {
          // Defensive: ensure arrays exist
          const splitWith = Array.isArray(expense.splitWith)
            ? expense.splitWith
            : [];
          const paidFor = Array.isArray(expense.paidFor) ? expense.paidFor : [];

          // Split: user is not payer but is in splitWith
          if (
            (!expense.expenseType || expense.expenseType === "split") &&
            expense.paidBy !== currentUserId &&
            splitWith.includes(currentUserId)
          ) {
            return true;
          }

          // PaidFor: user is not payer but is in paidFor
          if (
            expense.expenseType === "paidFor" &&
            expense.paidBy !== currentUserId &&
            paidFor.includes(currentUserId)
          ) {
            return true;
          }

          return false;
        });
        break;
      default:
        filtered = expenses.filter((expense) => {
          const splitWith = Array.isArray(expense.splitWith)
            ? expense.splitWith
            : [];
          const paidFor = Array.isArray(expense.paidFor) ? expense.paidFor : [];
          // User paid
          if (expense.paidBy === currentUserId) return true;
          // User is in split
          if (
            (!expense.expenseType || expense.expenseType === "split") &&
            splitWith.includes(currentUserId)
          )
            return true;
          // User was paid for
          if (
            expense.expenseType === "paidFor" &&
            paidFor.includes(currentUserId)
          )
            return true;
          return false;
        });
    }

    // Then filter by expense type
    if (expenseTypeFilter !== "all") {
      filtered = filtered.filter((expense) => {
        if (!expense.expenseType && expenseTypeFilter === "split") {
          return true;
        }
        return expense.expenseType === expenseTypeFilter;
      });
    }

    // Defensive copy before sort
    let sorted = [...filtered];
    switch (sortOrder) {
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "highest":
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case "lowest":
        sorted.sort((a, b) => a.amount - b.amount);
        break;
      default:
        break;
    }
    return sorted;
  };
  const calculateMyShare = (expense) => {
    const currentUserId = getCurrentUserId();
    const splitWith = Array.isArray(expense.splitWith) ? expense.splitWith : [];
    const paidFor = Array.isArray(expense.paidFor) ? expense.paidFor : [];

    if (!expense.expenseType || expense.expenseType === "split") {
      // For split expenses, everyone in splitWith pays an equal share
      // This includes the payer (who must also be in splitWith array)
      const totalPeople = splitWith.length;
      // Guard against division by zero
      const equalShare =
        totalPeople > 0 ? expense.amount / totalPeople : expense.amount;

      if (expense.paidBy === currentUserId) {
        // I paid
        if (totalPeople === 1 && splitWith[0] === currentUserId) {
          // Only I am in the split, so it's just for me
          return { amount: 0, type: "personal expense" };
        } else {
          // I paid for a group that includes me
          // I'm owed the full amount minus my share
          return {
            amount: expense.amount - equalShare,
            type: "owed to you",
          };
        }
      } else if (splitWith.includes(currentUserId)) {
        // Someone else paid, I'm in the split
        return {
          amount: equalShare,
          type: "you owe",
        };
      } else {
        // Not involved
        return { amount: 0, type: "not involved" };
      }
    } else if (expense.expenseType === "paidFor") {
      // For paidFor expenses (someone paid on behalf of others)
      const totalPeople = paidFor.length;
      if (totalPeople === 0) {
        return { amount: 0, type: "personal expense" };
      }

      const sharePerPerson = expense.amount / totalPeople;

      if (expense.paidBy === currentUserId) {
        // I paid for others
        if (paidFor.includes(currentUserId)) {
          // I'm also in the paidFor list
          const others = paidFor.filter((id) => id !== currentUserId).length;
          return {
            amount: sharePerPerson * others,
            type: "paid for others",
          };
        } else {
          // Paid only for others
          return {
            amount: expense.amount,
            type: "paid for others",
          };
        }
      } else if (paidFor.includes(currentUserId)) {
        // Someone else paid for me
        return {
          amount: sharePerPerson,
          type: "paid for you",
        };
      } else {
        // Not involved
        return { amount: 0, type: "not involved" };
      }
    } else if (expense.expenseType === "personal") {
      if (expense.paidBy === currentUserId) {
        return { amount: 0, type: "personal expense" };
      } else {
        return { amount: 0, type: "not involved" };
      }
    }

    // Default fallback
    return { amount: 0, type: "unknown" };
  };

  return (
    <div className="container mx-auto p-4">
      {" "}
      <h1 className="text-3xl font-bold mb-6">My Expenses</h1>{" "}
      {/* Date Filter */}
      <div className="bg-white rounded-lg p-4 shadow-md mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Filter by Date</h2>
          {filterLoading && (
            <div className="flex items-center text-blue-600">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-sm">Updating...</span>
            </div>
          )}
        </div>

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
            </label>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) =>
                handleDateFilterChange({ ...dateFilter, end: e.target.value })
              }
              min={dateFilter.start}
              max={new Date().toISOString().split("T")[0]}
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
          Showing expenses from {formatDate(dateFilter.start)} to{" "}
          {formatDate(dateFilter.end)}
        </div>
      </div>{" "}
      {/* Tab Navigation */}
      <div className="flex flex-wrap mb-2 border-b">
        <button
          className={`px-4 py-2 ${
            selectedTab === "all"
              ? "border-b-2 border-blue-500 font-medium"
              : ""
          }`}
          onClick={() => setSelectedTab("all")}
        >
          All Expenses
        </button>
        <button
          className={`px-4 py-2 ${
            selectedTab === "paid"
              ? "border-b-2 border-blue-500 font-medium"
              : ""
          }`}
          onClick={() => setSelectedTab("paid")}
        >
          Paid by Me
        </button>
        <button
          className={`px-4 py-2 ${
            selectedTab === "owed"
              ? "border-b-2 border-blue-500 font-medium"
              : ""
          }`}
          onClick={() => setSelectedTab("owed")}
        >
          Owed by Me
        </button>
      </div>
      {/* Expense Type Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setExpenseTypeFilter("all")}
          className={`px-3 py-1 text-sm rounded-full transition ${
            expenseTypeFilter === "all"
              ? "bg-gray-800 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          All Types
        </button>
        <button
          onClick={() => setExpenseTypeFilter("split")}
          className={`px-3 py-1 text-sm rounded-full transition ${
            expenseTypeFilter === "split"
              ? "bg-blue-600 text-white"
              : "bg-blue-50 hover:bg-blue-100 text-blue-700"
          }`}
        >
          <span className="flex items-center">
            Split
            {expenseTypeFilter === "split" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </span>
        </button>
        <button
          onClick={() => setExpenseTypeFilter("paidFor")}
          className={`px-3 py-1 text-sm rounded-full transition ${
            expenseTypeFilter === "paidFor"
              ? "bg-green-600 text-white"
              : "bg-green-50 hover:bg-green-100 text-green-700"
          }`}
        >
          <span className="flex items-center">
            Paid For Others
            {expenseTypeFilter === "paidFor" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </span>
        </button>
        <button
          onClick={() => setExpenseTypeFilter("personal")}
          className={`px-3 py-1 text-sm rounded-full transition ${
            expenseTypeFilter === "personal"
              ? "bg-amber-600 text-white"
              : "bg-amber-50 hover:bg-amber-100 text-amber-700"
          }`}
        >
          <span className="flex items-center">
            Personal
            {expenseTypeFilter === "personal" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </span>
        </button>
      </div>
      {loading ? (
        <p className="text-center">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-center">Error: {error}</p>
      ) : filteredExpenses().length === 0 ? (
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <p className="text-gray-500">
            No expenses found for the selected date range.
          </p>
        </div>
      ) : (
        <div>
          {" "}
          <div className="mb-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="text-gray-600">
              Showing {filteredExpenses().length}{" "}
              {filteredExpenses().length === 1 ? "expense" : "expenses"}
            </div>{" "}
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-2">Sort by:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="border rounded p-1 text-sm"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4">
            {filteredExpenses().map((expense) => {
              const myShare = calculateMyShare(expense);

              return (
                <div
                  key={expense.id}
                  className="bg-white rounded-lg p-4 shadow-md"
                >
                  <div className="flex justify-between mb-2">
                    <h3 className="font-semibold text-lg">
                      {expense.description}
                    </h3>
                    <span className="text-gray-500 text-sm">
                      {formatDate(expense.createdAt)}
                    </span>
                  </div>{" "}
                  <div className="flex justify-between mb-2">
                    <span>
                      Total Amount:{" "}
                      <span className="font-medium">
                        ₹{expense.amount.toFixed(2)}
                      </span>
                    </span>
                    <span
                      className={
                        myShare.type === "owed to you" ||
                        myShare.type === "paid for others"
                          ? "text-green-600"
                          : myShare.type === "you owe" ||
                            myShare.type === "paid for you"
                          ? "text-red-600"
                          : "text-gray-600"
                      }
                    >
                      {myShare.amount > 0 && (
                        <>
                          <span className="font-medium">
                            ₹{myShare.amount.toFixed(2)}
                          </span>{" "}
                        </>
                      )}
                      {myShare.type}
                    </span>
                  </div>
                  {/* Expense type badge */}
                  <div className="flex items-center mb-2">
                    <div className="text-gray-600 mr-2">
                      Paid by:{" "}
                      <span className="font-medium">
                        {expense.paidBy === getCurrentUserId()
                          ? "You"
                          : expense.paidByName}
                      </span>
                    </div>
                    <div
                      className={`
                    text-xs px-2 py-1 rounded-full 
                    ${
                      !expense.expenseType || expense.expenseType === "split"
                        ? "bg-blue-100 text-blue-700"
                        : expense.expenseType === "paidFor"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  `}
                    >
                      {!expense.expenseType || expense.expenseType === "split"
                        ? "Split"
                        : expense.expenseType === "paidFor"
                        ? "Paid For Others"
                        : "Personal"}
                    </div>
                  </div>
                  {/* Split with section - only show for split expenses */}
                  {(!expense.expenseType ||
                    expense.expenseType === "split") && (
                    <div className="mb-2">
                      <div className="text-sm text-gray-500">Split with:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {expense.splitWith.map((userId) => (
                          <span
                            key={userId}
                            className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                          >
                            {userId === getCurrentUserId()
                              ? "You"
                              : expense.userNames[userId]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Paid for section - only show for paidFor expenses */}
                  {expense.expenseType === "paidFor" &&
                    expense.paidFor &&
                    expense.paidFor.length > 0 && (
                      <div className="mb-2">
                        <div className="text-sm text-gray-500">Paid for:</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {expense.paidFor.map((userId) => (
                            <span
                              key={userId}
                              className="bg-green-50 text-green-800 text-xs px-2 py-1 rounded"
                            >
                              {userId === getCurrentUserId()
                                ? "You"
                                : expense.userNames[userId]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  {expense.receiptUrl && (
                    <div className="mt-2">
                      <Link
                        to={`/receipt/${expense.id}`}
                        className="text-blue-500 hover:underline text-sm"
                      >
                        View Receipt
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default MyExpenses;
