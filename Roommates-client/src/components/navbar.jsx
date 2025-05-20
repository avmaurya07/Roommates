import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import config from "../config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDashboard,
  faMoneyBillTransfer,
  faFileInvoice,
  faChartPie,
  faRightFromBracket,
  faKey,
  faHistory,
  faUsers,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";

function Navbar() {
  const baseURL = config.baseURL;
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [remoteSession, setRemoteSession] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const userData = localStorage.getItem("userData");
    if (userData) {
      const user = JSON.parse(userData);
      setIsAdmin(user.isAdmin === true);
      setUserName(user.name || "");
      setRemoteSession(user._adminSession !== undefined);
    }
  }, []);

  const logout = () => {
    // If in a remote session, go back to admin account
    if (remoteSession) {
      const userData = localStorage.getItem("userData");
      if (userData) {
        const user = JSON.parse(userData);
        if (user._adminSession) {
          // Get admin data and log back in as admin
          const adminId = user._adminSession.adminId;
          alert(`Returning to your admin account from ${user.name}'s session`);

          // Make API call to get admin data
          fetch(`${baseURL}user-lists?userId=${adminId}&password=1234`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.data && data.data.length > 0) {
                localStorage.setItem("userData", JSON.stringify(data.data[0]));
                window.location.href = "/dashboard";
              } else {
                // If admin data can't be retrieved, just do normal logout
                localStorage.removeItem("userData");
                window.location.href = "/login";
              }
            })
            .catch((error) => {
              console.error("Error returning to admin account:", error);
              localStorage.removeItem("userData");
              window.location.href = "/login";
            });
          return;
        }
      }
    }

    // Standard logout
    localStorage.removeItem("userData");
    window.location.href = "/login";
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <div className="text-xl font-bold">Roommates</div>

          <div className="hidden md:flex space-x-4">
            <Link
              to="/dashboard"
              className="hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              <FontAwesomeIcon icon={faDashboard} className="mr-2" />
              Dashboard
            </Link>
            <Link
              to="/add-expense"
              className="hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              <FontAwesomeIcon icon={faMoneyBillTransfer} className="mr-2" />
              Add Expense
            </Link>
            <Link
              to="/my-expenses"
              className="hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              <FontAwesomeIcon icon={faFileInvoice} className="mr-2" />
              My Expenses
            </Link>
            <Link
              to="/summary"
              className="hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              <FontAwesomeIcon icon={faChartPie} className="mr-2" />
              Summary
            </Link>
            <Link
              to="/amount-paid"
              className="hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              <FontAwesomeIcon icon={faMoneyBillTransfer} className="mr-2" />
              Record Payment
            </Link>{" "}
            <Link
              to="/payment-history"
              className="hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              <FontAwesomeIcon icon={faHistory} className="mr-2" />
              Payment History
            </Link>{" "}
            <Link
              to="/change-password"
              className="hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              <FontAwesomeIcon icon={faKey} className="mr-2" />
              Change Password
            </Link>
            {/* Admin-only links */}
            {isAdmin && (
              <>
                <Link
                  to="/user-management"
                  className="hover:bg-blue-700 px-3 py-2 rounded transition bg-blue-700"
                >
                  <FontAwesomeIcon icon={faUsers} className="mr-2" />
                  Users
                </Link>
                <Link
                  to="/register"
                  className="hover:bg-blue-700 px-3 py-2 rounded transition"
                >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                  Create User
                </Link>
              </>
            )}
            <button
              onClick={logout}
              className="hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="mr-2" />
              {remoteSession ? "Return to Admin" : "Logout"}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="outline-none mobile-menu-button"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-blue-500">
            <div className="flex flex-col space-y-2">
              <Link
                to="/dashboard"
                className="hover:bg-blue-700 px-3 py-2 rounded transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FontAwesomeIcon icon={faDashboard} className="mr-2" />
                Dashboard
              </Link>
              <Link
                to="/add-expense"
                className="hover:bg-blue-700 px-3 py-2 rounded transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FontAwesomeIcon icon={faMoneyBillTransfer} className="mr-2" />
                Add Expense
              </Link>
              <Link
                to="/my-expenses"
                className="hover:bg-blue-700 px-3 py-2 rounded transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FontAwesomeIcon icon={faFileInvoice} className="mr-2" />
                My Expenses
              </Link>
              <Link
                to="/summary"
                className="hover:bg-blue-700 px-3 py-2 rounded transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FontAwesomeIcon icon={faChartPie} className="mr-2" />
                Summary
              </Link>
              <Link
                to="/amount-paid"
                className="hover:bg-blue-700 px-3 py-2 rounded transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FontAwesomeIcon icon={faMoneyBillTransfer} className="mr-2" />
                Record Payment
              </Link>
              <Link
                to="/payment-history"
                className="hover:bg-blue-700 px-3 py-2 rounded transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FontAwesomeIcon icon={faHistory} className="mr-2" />
                Payment History
              </Link>
              <Link
                to="/change-password"
                className="hover:bg-blue-700 px-3 py-2 rounded transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FontAwesomeIcon icon={faKey} className="mr-2" />
                Change Password
              </Link>
              {/* Admin-only links for mobile */}
              {isAdmin && (
                <>
                  <Link
                    to="/user-management"
                    className="hover:bg-blue-700 px-3 py-2 rounded transition bg-blue-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FontAwesomeIcon icon={faUsers} className="mr-2" />
                    Users
                  </Link>
                  <Link
                    to="/register"
                    className="hover:bg-blue-700 px-3 py-2 rounded transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                    Create User
                  </Link>
                </>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="hover:bg-blue-700 px-3 py-2 rounded transition text-left"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="mr-2" />
                {remoteSession ? "Return to Admin" : "Logout"}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
