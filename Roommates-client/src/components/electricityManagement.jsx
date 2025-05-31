import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import config from "../config";

function ElectricityManagement() {
  const baseURL = config.baseURL;
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);

  // States for meter readings
  const [readings, setReadings] = useState([]);
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [readingsError, setReadingsError] = useState(null);

  // States for bills
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billsError, setBillsError] = useState(null);

  // States for all users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // States for form inputs
  const [meterReading, setMeterReading] = useState("");
  const [readingDate, setReadingDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedUsers, setSelectedUsers] = useState({});
  const [adminPassword, setAdminPassword] = useState("");

  // Loading states for form submissions
  const [submittingReading, setSubmittingReading] = useState(false);
  const [generatingBill, setGeneratingBill] = useState(false);

  // States for modals
  const [showBillModal, setShowBillModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);

  // State for tab selection
  const [selectedTab, setSelectedTab] = useState("readings"); // "readings" or "bills"

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    // Check if user is admin
    const userData = localStorage.getItem("userData");
    if (userData) {
      const user = JSON.parse(userData);
      if (user.isAdmin) {
        setAdminData(user);
        fetchReadings(user);
        fetchBills(user);
        fetchUsers(user);

        // Set today's date as default for reading date
        const today = new Date().toISOString().split("T")[0];
        setReadingDate(today);
      } else {
        // Redirect non-admin users
        alert("You don't have permission to access this page.");
        navigate("/dashboard");
      }
    } else {
      // Redirect to login if not logged in
      navigate("/login");
    }
  }, [navigate]);

  const fetchReadings = async (admin) => {
    try {
      setReadingsLoading(true);
      const response = await fetch(
        `${baseURL}admin/meter-readings?adminId=${admin.userId}&adminPassword=${admin.password}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch meter readings");
      }

      const data = await response.json();
      setReadings(data.data || []);
    } catch (err) {
      setReadingsError(err.message);
      console.error("Error fetching meter readings:", err);
    } finally {
      setReadingsLoading(false);
    }
  };

  const fetchBills = async (admin) => {
    try {
      setBillsLoading(true);
      const response = await fetch(
        `${baseURL}admin/electricity-bills?adminId=${admin.userId}&adminPassword=${admin.password}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch electricity bills");
      }

      const data = await response.json();
      setBills(data.data || []);
    } catch (err) {
      setBillsError(err.message);
      console.error("Error fetching electricity bills:", err);
    } finally {
      setBillsLoading(false);
    }
  };

  const fetchUsers = async (admin) => {
    try {
      setUsersLoading(true);
      const response = await fetch(
        `${baseURL}users?adminId=${admin.userId}&adminPassword=${admin.password}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();

      // Only include active users
      const activeUsers = data.data.filter((user) => user.isActive);
      setUsers(activeUsers);

      // Initialize selectedUsers object
      const initialSelectedUsers = {};
      activeUsers.forEach((user) => {
        initialSelectedUsers[user.userId] = false;
      });
      setSelectedUsers(initialSelectedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const selectAllUsers = () => {
    const allSelected = {};
    users.forEach((user) => {
      allSelected[user.userId] = true;
    });
    setSelectedUsers(allSelected);
  };

  const deselectAllUsers = () => {
    const allDeselected = {};
    users.forEach((user) => {
      allDeselected[user.userId] = false;
    });
    setSelectedUsers(allDeselected);
  };

  const handleSubmitReading = async (e) => {
    e.preventDefault();

    if (!meterReading || !readingDate) {
      alert("Please provide both meter reading and date");
      return;
    }

    try {
      setSubmittingReading(true);

      const effectivePassword = adminPassword || adminData.password;

      const response = await fetch(`${baseURL}admin/meter-reading`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminId: adminData.userId,
          adminPassword: effectivePassword,
          reading: parseFloat(meterReading),
          readingDate: readingDate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Meter reading recorded successfully");
        setMeterReading("");
        // Refresh readings
        fetchReadings(adminData);
        setShowReadingModal(false);
      } else {
        alert(`Failed to record meter reading: ${data.message}`);
      }
    } catch (error) {
      console.error("Error recording meter reading:", error);
      alert("Failed to record meter reading. Please try again.");
    } finally {
      setSubmittingReading(false);
      setAdminPassword("");
    }
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();

    if (!fromDate || !toDate) {
      alert("Please select both from date and to date");
      return;
    }

    // Check if any users are selected
    const selectedUserIds = Object.keys(selectedUsers).filter(
      (userId) => selectedUsers[userId]
    );

    if (selectedUserIds.length === 0) {
      alert("Please select at least one user to share the bill with");
      return;
    }

    try {
      setGeneratingBill(true);

      const effectivePassword = adminPassword || adminData.password;

      const response = await fetch(`${baseURL}admin/generate-bill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminId: adminData.userId,
          adminPassword: effectivePassword,
          fromDate,
          toDate,
          userIds: selectedUserIds,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Electricity bill generated successfully");
        setFromDate("");
        setToDate("");
        deselectAllUsers();

        // Refresh bills
        fetchBills(adminData);
        setShowBillModal(false);
      } else {
        alert(`Failed to generate bill: ${data.message}`);
      }
    } catch (error) {
      console.error("Error generating electricity bill:", error);
      alert("Failed to generate electricity bill. Please try again.");
    } finally {
      setGeneratingBill(false);
      setAdminPassword("");
    }
  };

  // Determine available dates for bill generation (must have at least 2 readings)
  const getAvailableDates = () => {
    if (!readings || readings.length < 2) return [];

    return readings
      .map((r) => r.readingDate)
      .sort((a, b) => new Date(a) - new Date(b));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Electricity Management</h1>

      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-gray-600">
            Logged in as administrator:{" "}
            <span className="font-semibold">{adminData?.name}</span>
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowReadingModal(true)}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            Record Meter Reading
          </button>
          <button
            onClick={() => setShowBillModal(true)}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
            disabled={readings.length < 2}
          >
            Generate Bill
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 ${
            selectedTab === "readings"
              ? "border-b-2 border-blue-500 font-medium"
              : ""
          }`}
          onClick={() => setSelectedTab("readings")}
        >
          Meter Readings
        </button>
        <button
          className={`py-2 px-4 ${
            selectedTab === "bills"
              ? "border-b-2 border-blue-500 font-medium"
              : ""
          }`}
          onClick={() => setSelectedTab("bills")}
        >
          Electricity Bills
        </button>
      </div>

      {selectedTab === "readings" ? (
        // Meter Readings Tab
        <div>
          <h2 className="text-xl font-semibold mb-4">Meter Readings</h2>

          {readingsLoading ? (
            <p className="text-center py-8">Loading readings...</p>
          ) : readingsError ? (
            <p className="text-red-500 text-center py-8">
              Error: {readingsError}
            </p>
          ) : readings.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500">No meter readings recorded yet.</p>
              <button
                onClick={() => setShowReadingModal(true)}
                className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
              >
                Record First Reading
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meter Reading
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Units Consumed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recorded By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recorded On
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {readings.map((reading, index) => {
                    // Calculate units consumed compared to previous reading
                    const prevReading =
                      index < readings.length - 1 ? readings[index + 1] : null;
                    const unitsConsumed = prevReading
                      ? (reading.reading - prevReading.reading).toFixed(1)
                      : "-";

                    return (
                      <tr key={reading.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatDate(reading.readingDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {reading.reading} units
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {unitsConsumed !== "-"
                            ? `${unitsConsumed} units`
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {reading.recordedByName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {reading.recordedAt.split("T")[0]}{" "}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Electricity Bills Tab
        <div>
          <h2 className="text-xl font-semibold mb-4">Electricity Bills</h2>

          {billsLoading ? (
            <p className="text-center py-8">Loading bills...</p>
          ) : billsError ? (
            <p className="text-red-500 text-center py-8">Error: {billsError}</p>
          ) : bills.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500">
                No electricity bills generated yet.
              </p>
              {readings.length >= 2 ? (
                <button
                  onClick={() => setShowBillModal(true)}
                  className="mt-4 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
                >
                  Generate First Bill
                </button>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  You need at least two meter readings to generate a bill.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Units
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Per User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Generated By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bills.map((bill) => (
                    <tr key={bill.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(bill.fromDate)} - {formatDate(bill.toDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {bill.unitsConsumed.toFixed(1)} units
                        <div className="text-xs text-gray-500">
                          ({bill.startReading} → {bill.endReading})
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₹{bill.totalAmount.toFixed(2)}
                        <div className="text-xs text-gray-500">
                          (₹{bill.ratePerUnit}/unit)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₹{bill.amountPerUser.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {bill.userIds.map((userId) => (
                            <span
                              key={userId}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {bill.userNames[userId]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {bill.createdByName}
                        <div className="text-xs">
                          {bill.createdAt.split("T")[0]}{" "}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record Meter Reading Modal */}
      {showReadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Record Meter Reading</h2>

            <form onSubmit={handleSubmitReading}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Reading Date</label>
                <input
                  type="date"
                  value={readingDate}
                  onChange={(e) => setReadingDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">
                  Meter Reading (units)
                </label>
                <input
                  type="number"
                  value={meterReading}
                  onChange={(e) => setMeterReading(e.target.value)}
                  step="0.1"
                  min="0"
                  placeholder="Enter current meter reading"
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>

              {!adminData?.password && (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">
                    Your Admin Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    required={!adminData?.password}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowReadingModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                  disabled={submittingReading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={submittingReading}
                >
                  {submittingReading ? "Recording..." : "Record Reading"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Bill Modal */}
      {showBillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">
              Generate Electricity Bill
            </h2>

            <form onSubmit={handleGenerateBill}>
              <div className="flex flex-wrap -mx-2 mb-4">
                <div className="px-2 w-full md:w-1/2">
                  <label className="block text-gray-700 mb-2">From Date</label>
                  <select
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  >
                    <option value="">Select date</option>
                    {getAvailableDates().map((date) => (
                      <option key={date} value={date}>
                        {formatDate(date)} (
                        {readings.find((r) => r.readingDate === date)?.reading}{" "}
                        units)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="px-2 w-full md:w-1/2">
                  <label className="block text-gray-700 mb-2">To Date</label>
                  <select
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                    disabled={!fromDate}
                  >
                    <option value="">Select date</option>
                    {fromDate &&
                      getAvailableDates()
                        .filter((date) => new Date(date) > new Date(fromDate))
                        .map((date) => (
                          <option key={date} value={date}>
                            {formatDate(date)} (
                            {
                              readings.find((r) => r.readingDate === date)
                                ?.reading
                            }{" "}
                            units)
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">
                  Share Bill With
                </label>
                <div className="border border-gray-300 rounded p-4 max-h-60 overflow-y-auto">
                  <div className="mb-2 flex justify-between items-center">
                    <span className="text-sm font-medium">Select Users:</span>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={selectAllUsers}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllUsers}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  {usersLoading ? (
                    <p className="text-sm text-center py-2">Loading users...</p>
                  ) : (
                    users.map((user) => (
                      <div key={user.userId} className="mb-2 last:mb-0">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedUsers[user.userId] || false}
                            onChange={() => toggleUserSelection(user.userId)}
                            className="mr-2 h-5 w-5"
                          />
                          <span className="text-gray-800">
                            {user.name}
                            {user.userId === adminData?.userId ? " (You)" : ""}
                          </span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {fromDate && toDate && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    Bill Preview
                  </h3>

                  {(() => {
                    // Calculate bill preview
                    const start =
                      readings.find((r) => r.readingDate === fromDate)
                        ?.reading || 0;
                    const end =
                      readings.find((r) => r.readingDate === toDate)?.reading ||
                      0;
                    const units = end - start;
                    const rate = 9; // ₹9 per unit
                    const total = units * rate;

                    // Count selected users
                    const selectedCount =
                      Object.values(selectedUsers).filter(Boolean).length;
                    const perPerson =
                      selectedCount > 0 ? total / selectedCount : 0;

                    return (
                      <div className="space-y-1 text-sm">
                        <p>
                          Initial Reading: <strong>{start} units</strong>
                        </p>
                        <p>
                          Final Reading: <strong>{end} units</strong>
                        </p>
                        <p>
                          Units Consumed:{" "}
                          <strong>{units.toFixed(1)} units</strong>
                        </p>
                        <p>
                          Rate: <strong>₹{rate}/unit</strong>
                        </p>
                        <p>
                          Total Bill Amount:{" "}
                          <strong>₹{total.toFixed(2)}</strong>
                        </p>
                        <p>
                          Amount Per User:{" "}
                          <strong>₹{perPerson.toFixed(2)}</strong> (
                          {selectedCount} users)
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {!adminData?.password && (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">
                    Your Admin Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    required={!adminData?.password}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                  disabled={generatingBill}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={
                    generatingBill ||
                    !fromDate ||
                    !toDate ||
                    Object.values(selectedUsers).filter(Boolean).length === 0
                  }
                >
                  {generatingBill ? "Generating..." : "Generate Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ElectricityManagement;
