import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import config from "../config";

function ChangePassword() {
  const baseURL = config.baseURL;
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTempPassword, setIsTempPassword] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (!userData) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(userData);
    setUserInfo(user);

    // Check if user has a temporary password
    if (user.isTempPassword) {
      setIsTempPassword(true);
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters long");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userData = JSON.parse(localStorage.getItem("userData"));

      const response = await fetch(`${baseURL}change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userData.userId,
          oldPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change password");
      }

      // Update user data in localStorage with updated isTempPassword value
      const updatedUserData = {
        ...userData,
        isTempPassword: false,
      };
      localStorage.setItem("userData", JSON.stringify(updatedUserData));

      alert("Password changed successfully!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      console.error("Error changing password:", err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Change Password</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg p-6 shadow-md max-w-md mx-auto"
      >
        {isTempPassword && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
            <div className="font-medium mb-1">Temporary Password Detected</div>
            <p className="text-sm">
              Your account is using a temporary password. You must change it
              before continuing.
            </p>
          </div>
        )}

        {userInfo && userInfo._adminSession && (
          <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg">
            <p className="text-sm">
              <strong>Note:</strong> You're currently logged in as{" "}
              {userInfo.name} through an admin session. Changing password here
              will change {userInfo.name}'s password.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="oldPassword"
            className="block text-gray-700 mb-2 font-medium"
          >
            Current Password
          </label>
          <input
            type="password"
            id="oldPassword"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your current password"
            required
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="newPassword"
            className="block text-gray-700 mb-2 font-medium"
          >
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your new password"
            minLength={4}
            required
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="confirmPassword"
            className="block text-gray-700 mb-2 font-medium"
          >
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Confirm your new password"
            minLength={4}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition duration-200"
          disabled={loading}
        >
          {loading ? "Changing Password..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}

export default ChangePassword;
