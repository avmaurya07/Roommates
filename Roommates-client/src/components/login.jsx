import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import config from "../config";

function Login() {
  const baseURL = config.baseURL;
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    if (storedUserData) {
      navigate("/dashboard");
    }
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch(
        `${baseURL}user-lists?userId=${userId}&password=${password}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.data && data.data.length > 0) {
        localStorage.setItem("userData", JSON.stringify(data.data[0]));
        if (data.data[0].isTempPassword) {
          navigate("/change-password");
        } else {
          navigate("/dashboard");
        }
      } else {
        alert("Login Failed. Incorrect user ID or password.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login Failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">
          Roommates Login
        </h1>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">User ID</label>
          <input
            type="text"
            placeholder="Enter your user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>{" "}
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-right mt-1">
            <Link
              to="/forgot-password"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Forgot Password?
            </Link>
          </div>
        </div>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition duration-200"
        >
          Login
        </button>{" "}
        <div className="mt-4 text-center">
          <p className="text-gray-600">
            Don't have an account? Please contact an administrator to create an
            account for you.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
