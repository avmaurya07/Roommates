import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import config from "../config";
import { formatDateForDisplay } from "../utils/dateUtils";

function ReceiptViewer() {
  const baseURL = config.baseURL;
  const { id } = useParams();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${baseURL}expense/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch expense");
      }

      const data = await response.json();
      setExpense(data.data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching expense:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    // Use our dateUtils function for consistent IST formatting
    return formatDateForDisplay(dateString);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Receipt Viewer</h1>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-center">Error: {error}</p>
      ) : !expense ? (
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <p className="text-gray-500">Expense not found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">
              {expense.description}
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                {" "}
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Amount:</span> ₹
                  {expense.amount.toFixed(2)}
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Paid by:</span>{" "}
                  {expense.paidByName}
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Date:</span>{" "}
                  {formatDate(expense.createdAt)}
                </p>
                {/* Expense Type Information */}
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Expense Type:</span>{" "}
                  <span
                    className={`
                    px-2 py-1 rounded-full text-xs
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
                      ? "Split Equally"
                      : expense.expenseType === "paidFor"
                      ? "Paid For Others"
                      : "Personal Expense"}
                  </span>
                </p>
                {/* Split with section - only show for split expenses */}
                {(!expense.expenseType || expense.expenseType === "split") && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">Split with:</p>
                    <div className="flex flex-wrap gap-2">
                      {expense.splitWith.map((userId) => (
                        <span
                          key={userId}
                          className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm"
                        >
                          {expense.userNames[userId]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Paid for section - only show for paidFor expenses */}
                {expense.expenseType === "paidFor" &&
                  expense.paidFor &&
                  expense.paidFor.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium mb-2">Paid for:</p>
                      <div className="flex flex-wrap gap-2">
                        {expense.paidFor.map((userId) => (
                          <span
                            key={userId}
                            className="bg-green-50 text-green-800 px-2 py-1 rounded text-sm"
                          >
                            {expense.userNames[userId]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <div>
                {" "}
                {expense.receiptUrl ? (
                  <div className="flex flex-col items-center">
                    <p className="font-medium mb-2">Receipt:</p>
                    <img
                      src={`${baseURL.replace("/api2/", "")}${
                        expense.receiptUrl
                      }`}
                      alt="Receipt"
                      className="max-w-full max-h-80 object-contain border rounded-lg"
                    />
                    <a
                      href={`${baseURL.replace("/api2/", "")}${
                        expense.receiptUrl
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-blue-600 hover:underline"
                    >
                      View Full Size
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center mt-8">
                    No receipt available
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceiptViewer;
