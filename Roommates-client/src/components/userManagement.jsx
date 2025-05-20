import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import config from "../config";

function UserManagement() {
  const baseURL = config.baseURL;
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminData, setAdminData] = useState(null);

  // Modals states
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Edit user state
  const [editUserData, setEditUserData] = useState({
    name: "",
    email: "",
    isAdmin: false,
    isActive: true,
  });

  useEffect(() => {
    // Check if user is admin
    const userData = localStorage.getItem("userData");
    if (userData) {
      const user = JSON.parse(userData);
      if (user.isAdmin) {
        setAdminData(user);
        fetchUsers(user);
      } else {
        // Redirect non-admin users
        alert("You don't have permission to access this page.");
        navigate("/dashboard");
      }
    } else {
      // Redirect to login if not logged in
      navigate("/login");
    }
  }, []);

  const fetchUsers = async (admin) => {
    try {
      setLoading(true);
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
      setUsers(data.data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = (user) => {
    setTargetUser(user);
    setNewPassword("1234"); // Default temporary password
    setShowResetModal(true);
  };

  const openEditModal = (user) => {
    setTargetUser(user);
    setEditUserData({
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  const handleResetPassword = async () => {
    if (!targetUser || !newPassword) return;

    try {
      const effectiveAdminPassword = adminPassword || adminData.password;
      const response = await fetch(`${baseURL}admin/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminId: adminData.userId,
          adminPassword: effectiveAdminPassword,
          targetUserId: targetUser.userId,
          newPassword: newPassword,
          setTempPassword: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Password for ${targetUser.name} has been reset successfully.`);
        setShowResetModal(false);
        setAdminPassword("");
      } else {
        alert(`Failed to reset password: ${data.message}`);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Failed to reset password. Please try again.");
    }
  };

  const handleEditUser = async () => {
    if (!targetUser) return;

    try {
      const effectiveAdminPassword = adminPassword || adminData.password;
      const response = await fetch(
        `${baseURL}admin/user/${targetUser.userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminId: adminData.userId,
            adminPassword: effectiveAdminPassword,
            updates: editUserData,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(`User ${targetUser.name}'s information has been updated.`);
        setShowEditModal(false);
        setAdminPassword("");

        // Refresh user list
        fetchUsers(adminData);
      } else {
        alert(`Failed to update user: ${data.message}`);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user. Please try again.");
    }
  };

  const handleRemoteLogin = async (user) => {
    if (window.confirm(`Are you sure you want to login as ${user.name}?`)) {
      try {
        const response = await fetch(`${baseURL}admin/remote-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminId: adminData.userId,
            adminPassword: adminData.password,
            targetUserId: user.userId,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Store remote user data in localStorage
          localStorage.setItem("userData", JSON.stringify(data.data));
          alert(`You are now logged in as ${user.name}.`);
          navigate("/login");
        } else {
          alert(`Remote login failed: ${data.message}`);
        }
      } catch (error) {
        console.error("Error in remote login:", error);
        alert("Remote login failed. Please try again.");
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>

      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-600">
          Logged in as administrator:{" "}
          <span className="font-semibold">{adminData?.name}</span>
        </p>
        <button
          onClick={() => navigate("/register")}
          className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
        >
          Create New User
        </button>
      </div>

      {loading ? (
        <p className="text-center py-8">Loading users...</p>
      ) : error ? (
        <p className="text-red-500 text-center py-8">Error: {error}</p>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr
                  key={user.userId}
                  className={!user.isActive ? "bg-gray-50" : ""}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.userId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.email || "No email"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                    {user.isTempPassword && (
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Temp Password
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.isAdmin ? "Administrator" : "Regular User"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openResetModal(user)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleRemoteLogin(user)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Login As
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
            <p className="mb-4">
              Reset password for{" "}
              <span className="font-semibold">{targetUser?.name}</span> (
              {targetUser?.userId})
            </p>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                New Temporary Password
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
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
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit User</h2>
            <p className="mb-4">
              Edit information for{" "}
              <span className="font-semibold">{targetUser?.userId}</span>
            </p>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={editUserData.name}
                onChange={(e) =>
                  setEditUserData({ ...editUserData, name: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={editUserData.email}
                onChange={(e) =>
                  setEditUserData({ ...editUserData, email: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div className="mb-4 flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editUserData.isAdmin}
                  onChange={() =>
                    setEditUserData({
                      ...editUserData,
                      isAdmin: !editUserData.isAdmin,
                    })
                  }
                  className="mr-2 h-5 w-5"
                />
                <span className="text-gray-700">Administrator</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editUserData.isActive}
                  onChange={() =>
                    setEditUserData({
                      ...editUserData,
                      isActive: !editUserData.isActive,
                    })
                  }
                  className="mr-2 h-5 w-5"
                />
                <span className="text-gray-700">Active</span>
              </label>
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
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
