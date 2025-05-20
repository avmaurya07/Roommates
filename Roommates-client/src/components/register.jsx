import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import config from "../config";

function Register() {
  const baseURL = config.baseURL;
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Check if the current user is an admin
  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      const user = JSON.parse(userData);
      if (user.isAdmin) {
        setAdminId(user.userId);
      } else {
        // Redirect non-admin users away from this page
        alert("Only administrators can register new users.");
        navigate("/dashboard");
      }
    } else {
      // Redirect to login if not logged in
      navigate("/login");
    }
  }, []);

  const handleRegister = async () => {
    if (!name || !userId || !password || !email) {
      alert("Please fill all the required fields");
      return;
    }

    if (!adminId) {
      alert("Admin authentication required");
      return;
    }

    // If admin is creating from their account, use stored admin credentials
    const effectiveAdminPassword =
      adminPassword || JSON.parse(localStorage.getItem("userData"))?.password;

    if (!effectiveAdminPassword) {
      alert("Admin password required");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${baseURL}register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          userId,
          password,
          email,
          isAdmin,
          adminId,
          adminPassword: effectiveAdminPassword,
          isTempPassword: true, // Always set to true so user must change password on first login
          isActive: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("User registration successful!");
        // Clear form
        setName("");
        setUserId("");
        setPassword("");
        setEmail("");
        setIsAdmin(false);
      } else {
        alert(`Registration failed: ${data.message}`);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">
          Register New User
        </h1>

        <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
          <p className="text-blue-700 text-sm font-medium">
            Admin Only: You are creating a new user account.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter user's full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            User ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Create a unique user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="Enter user's email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Initial Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            placeholder="Create an initial password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            User will be required to change this on first login.
          </p>
        </div>

        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={() => setIsAdmin(!isAdmin)}
              className="mr-2 h-5 w-5"
            />
            <span className="text-gray-700">
              Make this user an Administrator
            </span>
          </label>
        </div>

        {/* Only show admin password field if it's not auto-filled from session */}
        {!adminPassword &&
          !JSON.parse(localStorage.getItem("userData"))?.password && (
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">
                Admin Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                placeholder="Enter your admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

        <button
          onClick={handleRegister}
          disabled={loading}
          className={`w-full ${
            loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
          } text-white p-3 rounded transition duration-200 flex justify-center items-center`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              Creating User...
            </>
          ) : (
            "Create User"
          )}
        </button>

        <div className="mt-4 text-center">
          <p>
            <Link to="/dashboard" className="text-blue-600 hover:underline">
              Back to Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
