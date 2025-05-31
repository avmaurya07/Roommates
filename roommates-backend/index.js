const express = require("express");
const cors = require("cors");
const {
  readJSON,
  writeJSON,
  generateId,
  initializeDefaultUsers,
} = require("./utils");
const path = require("path");
const fs = require("fs/promises");
const multer = require("multer");
const emailService = require("./emailService");
const dateUtils = require("./dateUtils");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Setup Express
const app = express();
const PORT = 3000;

// Ensure uploads directory exists and initialize data
(async () => {
  try {
    await fs.mkdir("./uploads", { recursive: true });
    await fs.mkdir("./data", { recursive: true });

    // Initialize default users (including admin)
    await initializeDefaultUsers();
  } catch (err) {
    console.error("Error during initialization:", err);
  }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Default base path for API
app.use("/api", express.Router());

// Default values for Users
const userDefaults = {
  userId: "",
  name: "",
  email: "",
  password: "1234",
  isAdmin: false,
  isTempPassword: true,
  isActive: true,
  createdBy: "", // track which admin created this user
  createdAt: "",
};

// Default values for Expenses
const expenseDefaults = {
  amount: 0,
  description: "",
  date: dateUtils.toISOStringIST(),
  createdBy: "",
  image: null,
  participants: [],
};

// Default values for Payments
const paymentDefaults = {
  amount: 0,
  paidBy: "",
  paidTo: "",
  date: dateUtils.toISOStringIST(),
  relatedExpenseId: null,
};

// Function to apply defaults
const applyDefaults = (defaults, input) => ({ ...defaults, ...input });

// Helper functions
const filterData = (data, filters) => {
  return data.filter((item) =>
    Object.keys(filters).every(
      (key) => String(item[key]) === String(filters[key])
    )
  );
};

// ===================== User Management ====================

// Get user list (login)
app.get("/api/user-lists", async (req, res) => {
  try {
    const { userId, password } = req.query;
    const users = await readJSON("users.json");

    const matchingUsers = users.filter(
      (user) =>
        user.userId === userId && user.password === password && user.isActive
    );

    if (matchingUsers.length > 0) {
      res.status(200).json({ data: matchingUsers });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error in user-lists:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Register new user (admin only)
app.post("/api/register", async (req, res) => {
  try {
    const { name, userId, password, email, isAdmin, adminId, adminPassword } =
      req.body;

    // Verify the admin credentials first
    if (!adminId || !adminPassword) {
      return res.status(403).json({ message: "Admin authentication required" });
    }

    const users = await readJSON("users.json");

    // Verify admin credentials
    const adminUser = users.find(
      (user) =>
        user.userId === adminId &&
        user.password === adminPassword &&
        user.isAdmin === true &&
        user.isActive === true
    );

    if (!adminUser) {
      return res.status(403).json({
        message: "Invalid admin credentials or insufficient privileges",
      });
    }

    if (!name || !userId || !password || !email) {
      return res
        .status(400)
        .json({ message: "Name, userId, password, and email are required" });
    }

    // Check if user already exists
    if (users.some((user) => user.userId === userId)) {
      return res.status(409).json({ message: "User ID already exists" });
    }

    // Check if email already exists
    if (users.some((user) => user.email === email)) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const newUser = {
      userId,
      name,
      email,
      password,
      isAdmin: Boolean(isAdmin),
      isTempPassword: true, // Force user to change password on first login
      isActive: true,
      createdBy: adminId,
      createdAt: dateUtils.toISOStringIST(),
    };
    users.push(newUser);
    await writeJSON("users.json", users);

    // Send welcome email to new user
    try {
      await emailService.sendNewUserWelcomeEmail(newUser);
      console.log(`Welcome email sent to ${newUser.email}`);
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Continue anyway - email failure shouldn't stop user creation
    }

    res.status(201).json({
      message: "User registered successfully",
      userId: userId,
    });
  } catch (error) {
    console.error("Error in register:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users (requires admin authentication)
app.get("/api/users", async (req, res) => {
  try {
    const { adminId, adminPassword } = req.query;

    // If admin credentials provided, verify them
    if (adminId && adminPassword) {
      const users = await readJSON("users.json");

      // Verify admin credentials
      const adminUser = users.find(
        (user) =>
          user.userId === adminId &&
          user.password === adminPassword &&
          user.isAdmin === true &&
          user.isActive === true
      );

      if (!adminUser) {
        return res.status(403).json({
          message: "Invalid admin credentials or insufficient privileges",
        });
      }

      // Remove password field for security
      const sanitizedUsers = users.map(({ password, ...rest }) => rest);
      return res.status(200).json({ data: sanitizedUsers });
    }

    // Without admin credentials, return limited data
    const users = await readJSON("users.json");
    const publicUsers = users
      .filter((user) => user.isActive)
      .map(({ userId, name }) => ({ userId, name }));

    res.status(200).json({ data: publicUsers });
  } catch (error) {
    console.error("Error in get users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Change password (supports both user self-change and admin change)
app.post("/api/change-password", async (req, res) => {
  try {
    const { userId, oldPassword, newPassword, adminId, adminPassword } =
      req.body;

    // Case 1: Normal user changing their own password
    if (userId && oldPassword && newPassword && !adminId && !adminPassword) {
      const users = await readJSON("users.json");
      const userIndex = users.findIndex(
        (user) =>
          user.userId === userId &&
          user.password === oldPassword &&
          user.isActive
      );

      if (userIndex === -1) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update password
      users[userIndex].password = newPassword;
      users[userIndex].isTempPassword = false;

      await writeJSON("users.json", users);

      return res.status(200).json({ message: "Password changed successfully" });
    }

    // Case 2: Admin changing a user's password
    else if (userId && newPassword && adminId && adminPassword) {
      const users = await readJSON("users.json");

      // Verify admin credentials
      const adminUser = users.find(
        (user) =>
          user.userId === adminId &&
          user.password === adminPassword &&
          user.isAdmin === true &&
          user.isActive === true
      );

      if (!adminUser) {
        return res.status(403).json({
          message: "Invalid admin credentials or insufficient privileges",
        });
      }

      // Find the target user
      const userIndex = users.findIndex(
        (user) => user.userId === userId && user.isActive
      );

      if (userIndex === -1) {
        return res.status(404).json({ message: "User not found or inactive" });
      }

      // Update password and mark as temporary if admin requests it
      users[userIndex].password = newPassword;
      users[userIndex].isTempPassword = req.body.setTempPassword || false;

      await writeJSON("users.json", users);

      return res.status(200).json({
        message: "Password changed successfully by admin",
        userId: userId,
      });
    }

    // Invalid request
    else {
      return res.status(400).json({ message: "Missing required fields" });
    }
  } catch (error) {
    console.error("Error in change-password:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===================== Expenses Management ====================

// Add new expense
app.post("/api/expenses", upload.single("receipt"), async (req, res) => {
  try {
    const { amount, description, paidBy, splitWith, paidFor, expenseType } =
      req.body;

    if (!amount || !description || !paidBy) {
      return res
        .status(400)
        .json({ message: "Amount, description and paidBy are required" });
    }

    // Parse the JSON strings
    const splitWithArray = JSON.parse(splitWith || "[]");
    const paidForArray = JSON.parse(paidFor || "[]");

    // Validate based on expense type
    if (expenseType === "split" && splitWithArray.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one user must be selected to split with" });
    }

    if (expenseType === "paidFor" && paidForArray.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one user must be selected as paid for" });
    }

    const expenses = await readJSON("expenses.json");
    const users = await readJSON("users.json");

    // Get details of the user who paid
    const paidByUser = users.find((user) => user.userId === paidBy);
    if (!paidByUser) {
      return res.status(404).json({ message: "Paying user not found" });
    }

    // Create a mapping of user IDs to names
    const userNames = {};
    const relevantUsers = new Set([...splitWithArray, ...paidForArray, paidBy]);

    for (const userId of relevantUsers) {
      const user = users.find((u) => u.userId === userId);
      if (user) {
        userNames[userId] = user.name;
      }
    }

    const newExpense = {
      id: generateId(),
      amount: parseFloat(amount),
      description,
      paidBy,
      paidByName: paidByUser.name,
      splitWith: expenseType === "split" ? splitWithArray : [],
      paidFor:
        expenseType === "paidFor" || expenseType === "personal"
          ? paidForArray
          : [],
      expenseType: expenseType || "split", // Default to split if not specified
      userNames,
      createdAt: dateUtils.toISOStringIST(),
    };

    // Add receipt URL if a file was uploaded
    if (req.file) {
      newExpense.receiptUrl = `/uploads/${req.file.filename}`;
    }
    expenses.push(newExpense);
    await writeJSON("expenses.json", expenses);

    // Send email notification about the new expense
    try {
      await emailService.sendNewExpenseEmail(newExpense, users);
      console.log(
        `Expense notification email sent for expense: ${newExpense.id}`
      );
    } catch (emailError) {
      console.error("Error sending expense notification email:", emailError);
      // Continue anyway - email failure shouldn't stop expense creation
    }

    res.status(201).json({
      message: "Expense added successfully",
      expense: newExpense,
    });
  } catch (error) {
    console.error("Error in add expense:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get expenses for a user
app.get("/api/expenses", async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    const expenses = await readJSON("expenses.json"); // Filter expenses by user
    let userExpenses = expenses.filter(
      (expense) =>
        expense.paidBy === userId ||
        expense.splitWith.includes(userId) ||
        expense.paidFor.includes(userId) ||
        expense.userNames[userId]
    );

    // Apply date filtering if provided
    if (startDate && endDate) {
      // Use dateUtils to correctly handle IST date parsing
      const start = dateUtils.getStartOfDayIST(new Date(startDate));
      const end = dateUtils.getEndOfDayIST(new Date(endDate));

      userExpenses = userExpenses.filter((expense) => {
        const expenseDate = new Date(expense.createdAt);
        return expenseDate >= start && expenseDate <= end;
      });
    }

    res.status(200).json({ data: userExpenses });
  } catch (error) {
    console.error("Error in get expenses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===================== Payments Management ====================

// Add new payment
app.post("/api/payments", async (req, res) => {
  try {
    const { paidBy, paidTo, amount } = req.body;

    if (!paidBy || !paidTo || !amount) {
      return res
        .status(400)
        .json({ message: "PaidBy, paidTo and amount are required" });
    }

    const payments = await readJSON("payments.json");
    const users = await readJSON("users.json");

    // Verify both users exist
    const paidByUser = users.find((user) => user.userId === paidBy);
    const paidToUser = users.find((user) => user.userId === paidTo);

    if (!paidByUser || !paidToUser) {
      return res.status(404).json({ message: "One or both users not found" });
    }
    const newPayment = {
      id: generateId(),
      paidBy,
      paidByName: paidByUser.name,
      paidTo,
      paidToName: paidToUser.name,
      amount: parseFloat(amount),
      createdAt: dateUtils.toISOStringIST(),
    };
    payments.push(newPayment);
    await writeJSON("payments.json", payments);

    // Send email notification about the new payment
    try {
      await emailService.sendNewPaymentEmail(newPayment, users);
      console.log(
        `Payment notification email sent for payment: ${newPayment.id}`
      );
    } catch (emailError) {
      console.error("Error sending payment notification email:", emailError);
      // Continue anyway - email failure shouldn't stop payment creation
    }

    res.status(201).json({
      message: "Payment recorded successfully",
      payment: newPayment,
    });
  } catch (error) {
    console.error("Error in record payment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===================== Summary Management ====================

// Get settlement summary for a user
app.get("/api/summary", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    const expenses = await readJSON("expenses.json");
    const payments = await readJSON("payments.json");
    const users = await readJSON("users.json");

    // Create a map of user balances
    const balances = {};
    users.forEach((user) => {
      if (user.userId !== userId) {
        balances[user.userId] = {
          userId: user.userId,
          name: user.name,
          amount: 0, // Positive: they owe you, Negative: you owe them
        };
      }
    });

    // Process expenses
    expenses.forEach((expense) => {
      const splitWith = Array.isArray(expense.splitWith)
        ? expense.splitWith
        : [];
      const paidFor = Array.isArray(expense.paidFor) ? expense.paidFor : [];

      // Skip personal expenses as they don't affect balances between users
      if (expense.expenseType === "personal") {
        return;
      }

      // Handle "split" expense type
      if (expense.expenseType === "split" || !expense.expenseType) {
        const totalPeople = splitWith.length;
        if (totalPeople === 0) return; // No one to split with

        const sharePerPerson = expense.amount / totalPeople;

        if (expense.paidBy === userId) {
          splitWith.forEach((splitUserId) => {
            if (splitUserId !== userId && balances[splitUserId]) {
              balances[splitUserId].amount += sharePerPerson;
            }
          });
        } else if (splitWith.includes(userId)) {
          if (balances[expense.paidBy]) {
            balances[expense.paidBy].amount -= sharePerPerson;
          }
        }
      }

      // Handle "paidFor" expense type
      if (expense.expenseType === "paidFor") {
        const totalPeople = paidFor.length;
        if (totalPeople === 0) return; // No one to pay for

        const sharePerPerson = expense.amount / totalPeople;

        if (expense.paidBy === userId) {
          paidFor.forEach((paidForUserId) => {
            if (paidForUserId !== userId && balances[paidForUserId]) {
              balances[paidForUserId].amount += sharePerPerson;
            }
          });
        } else if (paidFor.includes(userId)) {
          if (balances[expense.paidBy]) {
            balances[expense.paidBy].amount -= sharePerPerson;
          }
        }
      }
    });

    // Process payments
    payments.forEach((payment) => {
      if (payment.paidBy === userId && balances[payment.paidTo]) {
        balances[payment.paidTo].amount += payment.amount;
      } else if (payment.paidTo === userId && balances[payment.paidBy]) {
        balances[payment.paidBy].amount -= payment.amount;
      }
    });

    // Convert to array and filter out zero balances
    const summaryData = Object.values(balances).filter(
      (balance) => Math.abs(balance.amount) > 0.01
    );

    res.status(200).json({ data: summaryData });
  } catch (error) {
    console.error("Error in get summary:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===================== Payment History ====================

// Get payment history for a user
app.get("/api/payment-history", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    const payments = await readJSON("payments.json");

    // Get payments where the user either paid or received
    const userPayments = payments.filter(
      (payment) => payment.paidBy === userId || payment.paidTo === userId
    );

    // Sort payments by date (newest first)
    userPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ data: userPayments });
  } catch (error) {
    console.error("Error getting payment history:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===================== Get Expense Details ====================

// Get a specific expense by ID
app.get("/api/expense/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Expense ID is required" });
    }

    const expenses = await readJSON("expenses.json");
    const expense = expenses.find((exp) => exp.id === id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json({ data: expense });
  } catch (error) {
    console.error("Error getting expense details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===================== Admin User Management ====================

// Admin: Update user details
app.put("/api/admin/user/:userId", async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { adminId, adminPassword, updates } = req.body;

    if (!adminId || !adminPassword) {
      return res.status(403).json({ message: "Admin authentication required" });
    }

    const users = await readJSON("users.json");

    // Verify admin credentials
    const adminUser = users.find(
      (user) =>
        user.userId === adminId &&
        user.password === adminPassword &&
        user.isAdmin === true &&
        user.isActive === true
    );

    if (!adminUser) {
      return res.status(403).json({
        message: "Invalid admin credentials or insufficient privileges",
      });
    }

    // Find the user to update
    const userIndex = users.findIndex((user) => user.userId === targetUserId);

    if (userIndex === -1) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user fields, but don't allow changing userId
    const allowedUpdates = [
      "name",
      "email",
      "isAdmin",
      "isActive",
      "isTempPassword",
    ];

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        users[userIndex][key] = updates[key];
      }
    });

    await writeJSON("users.json", users);

    // Return the updated user without password
    const { password, ...updatedUser } = users[userIndex];

    res.status(200).json({
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Reset user password
app.post("/api/admin/reset-password", async (req, res) => {
  try {
    const { adminId, adminPassword, targetUserId, newPassword } = req.body;

    if (!adminId || !adminPassword || !targetUserId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const users = await readJSON("users.json");

    // Verify admin credentials
    const adminUser = users.find(
      (user) =>
        user.userId === adminId &&
        user.password === adminPassword &&
        user.isAdmin === true &&
        user.isActive === true
    );

    if (!adminUser) {
      return res.status(403).json({
        message: "Invalid admin credentials or insufficient privileges",
      });
    }

    // Find the target user
    const userIndex = users.findIndex((user) => user.userId === targetUserId);

    if (userIndex === -1) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Update password and mark as temporary
    users[userIndex].password = newPassword || "1234"; // Default to 1234 if no password provided
    users[userIndex].isTempPassword = true;

    await writeJSON("users.json", users);

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Remote login as another user
app.post("/api/admin/remote-login", async (req, res) => {
  try {
    const { adminId, adminPassword, targetUserId } = req.body;

    if (!adminId || !adminPassword || !targetUserId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const users = await readJSON("users.json");

    // Verify admin credentials
    const adminUser = users.find(
      (user) =>
        user.userId === adminId &&
        user.password === adminPassword &&
        user.isAdmin === true &&
        user.isActive === true
    );

    if (!adminUser) {
      return res.status(403).json({
        message: "Invalid admin credentials or insufficient privileges",
      });
    }

    // Find the target user
    const targetUser = users.find(
      (user) => user.userId === targetUserId && user.isActive
    );

    if (!targetUser) {
      return res
        .status(404)
        .json({ message: "Target user not found or inactive" });
    } // Create a session object with both admin and target user info for auditing
    const sessionInfo = {
      ...targetUser,
      _adminSession: {
        adminId: adminId,
        timestamp: dateUtils.toISOStringIST(),
        remoteSession: true,
      },
    };

    // Don't include password in response
    const { password, ...sessionData } = sessionInfo;

    res.status(200).json({
      message: "Remote login successful",
      data: sessionData,
    });
  } catch (error) {
    console.error("Error in remote login:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===================== Forgot Password ====================

// Forgot password - send reset email
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const users = await readJSON("users.json");
    const user = users.find((u) => u.email === email && u.isActive);

    if (!user) {
      // For security reasons, don't reveal whether the email exists
      return res.status(200).json({
        message: "If the email exists in our system, a reset link will be sent",
      });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

    // Update the user's password
    const userIndex = users.findIndex((u) => u.userId === user.userId);
    users[userIndex].password = tempPassword;
    users[userIndex].isTempPassword = true;

    await writeJSON("users.json", users);

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        email,
        user.userId,
        tempPassword
      );
      console.log(`Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      // Still return success to prevent email enumeration
    }

    res.status(200).json({
      message: "If the email exists in our system, a reset link will be sent",
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===================== Electricity Management (Admin Only) ====================

// Record new meter reading
app.post("/api/admin/meter-reading", async (req, res) => {
  try {
    const { adminId, adminPassword, reading, readingDate } = req.body;

    // Validate input
    if (!adminId || !adminPassword || !reading || !readingDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Verify admin credentials
    const users = await readJSON("users.json");
    const adminUser = users.find(
      (user) =>
        user.userId === adminId &&
        user.password === adminPassword &&
        user.isAdmin === true &&
        user.isActive === true
    );

    if (!adminUser) {
      return res.status(403).json({
        message: "Invalid admin credentials or insufficient privileges",
      });
    }

    // Ensure reading is a number
    const meterValue = parseFloat(reading);
    if (isNaN(meterValue) || meterValue < 0) {
      return res
        .status(400)
        .json({ message: "Reading must be a positive number" });
    }

    // Load existing readings
    const readings = await readJSON("meter-readings.json");

    // Check if there's a newer reading already
    const requestDate = new Date(readingDate);
    const hasNewerReading = readings.some(
      (r) => new Date(r.readingDate) > requestDate
    );

    if (hasNewerReading) {
      return res.status(400).json({
        message: "Cannot add reading with date before the latest reading",
      });
    }

    // Create new reading
    const newReading = {
      id: generateId(),
      reading: meterValue,
      readingDate: readingDate,
      recordedBy: adminId,
      recordedAt: dateUtils.toISOStringIST(),
      recordedByName: adminUser.name,
    };

    readings.push(newReading);

    // Sort readings by date
    readings.sort((a, b) => new Date(a.readingDate) - new Date(b.readingDate));

    // Save readings
    await writeJSON("meter-readings.json", readings);

    res.status(201).json({
      message: "Meter reading recorded successfully",
      data: newReading,
    });
  } catch (error) {
    console.error("Error recording meter reading:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get meter readings
app.get("/api/admin/meter-readings", async (req, res) => {
  try {
    const { adminId, adminPassword } = req.query;

    // Verify admin credentials
    const users = await readJSON("users.json");
    const adminUser = users.find(
      (user) =>
        user.userId === adminId &&
        user.password === adminPassword &&
        user.isAdmin === true &&
        user.isActive === true
    );

    if (!adminUser) {
      return res.status(403).json({
        message: "Invalid admin credentials or insufficient privileges",
      });
    }

    const readings = await readJSON("meter-readings.json");

    // Sort readings by date (newest first)
    readings.sort((a, b) => new Date(b.readingDate) - new Date(a.readingDate));

    res.status(200).json({
      data: readings,
    });
  } catch (error) {
    console.error("Error getting meter readings:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Generate bill for date range
app.post("/api/admin/generate-bill", async (req, res) => {
  try {
    const { adminId, adminPassword, fromDate, toDate, userIds } = req.body;

    // Validate input
    if (
      !adminId ||
      !adminPassword ||
      !fromDate ||
      !toDate ||
      !userIds ||
      !Array.isArray(userIds) ||
      userIds.length === 0
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Verify admin credentials
    const users = await readJSON("users.json");
    const adminUser = users.find(
      (user) =>
        user.userId === adminId &&
        user.password === adminPassword &&
        user.isAdmin === true &&
        user.isActive === true
    );

    if (!adminUser) {
      return res.status(403).json({
        message: "Invalid admin credentials or insufficient privileges",
      });
    }

    // Load readings
    const readings = await readJSON("meter-readings.json");

    // Filter readings for the selected date range
    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (start > end) {
      return res
        .status(400)
        .json({ message: "Start date must be before end date" });
    }

    const relevantReadings = readings.filter((r) => {
      const date = new Date(r.readingDate);
      return date >= start && date <= end;
    });

    if (relevantReadings.length < 2) {
      return res.status(400).json({
        message: "At least two readings are required to calculate a bill",
      });
    }

    // Sort by date
    relevantReadings.sort(
      (a, b) => new Date(a.readingDate) - new Date(b.readingDate)
    );

    // Calculate units consumed
    const startReading = relevantReadings[0].reading;
    const endReading = relevantReadings[relevantReadings.length - 1].reading;
    const unitsConsumed = endReading - startReading;

    if (unitsConsumed < 0) {
      return res
        .status(400)
        .json({
          message: "Invalid readings. End reading is lower than start reading.",
        });
    }

    // Calculate total bill at 9 rupees per unit
    const ratePerUnit = 9;
    const totalAmount = unitsConsumed * ratePerUnit;

    // Calculate amount per user
    const userCount = userIds.length;
    const amountPerUser = totalAmount / userCount;

    // Collect user names
    const userNames = {};
    userIds.forEach((userId) => {
      const user = users.find((u) => u.userId === userId);
      if (user) {
        userNames[userId] = user.name;
      }
    });

    // Create bill
    const bills = await readJSON("electricity-bills.json");
    const newBill = {
      id: generateId(),
      fromDate,
      toDate,
      startReading,
      endReading,
      unitsConsumed,
      ratePerUnit,
      totalAmount,
      userIds,
      userNames,
      amountPerUser,
      createdBy: adminId,
      createdByName: adminUser.name,
      createdAt: dateUtils.toISOStringIST(),
      expenseId: null,
    };

    // Automatically create an expense record
    const expenses = await readJSON("expenses.json");
    const newExpense = {
      id: generateId(),
      amount: totalAmount,
      description: `Electricity Bill (${formatDateForDisplay(
        fromDate
      )} - ${formatDateForDisplay(toDate)})`,
      paidBy: adminId,
      paidByName: adminUser.name,
      splitWith: userIds,
      paidFor: [],
      expenseType: "split",
      userNames,
      createdAt: dateUtils.toISOStringIST(),
      electricityBillId: newBill.id,
    };

    // Update bill with expense ID
    newBill.expenseId = newExpense.id;

    // Save bill and expense
    bills.push(newBill);
    expenses.push(newExpense);

    await writeJSON("electricity-bills.json", bills);
    await writeJSON("expenses.json", expenses);

    // Send email notification about the new electricity bill
    try {
      await sendElectricityBillEmail(newBill, users);
    } catch (emailError) {
      console.error("Error sending electricity bill email:", emailError);
    }

    res.status(201).json({
      message: "Electricity bill generated successfully",
      data: newBill,
    });
  } catch (error) {
    console.error("Error generating electricity bill:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get electricity bills
app.get("/api/admin/electricity-bills", async (req, res) => {
  try {
    const { adminId, adminPassword } = req.query;

    // Verify admin credentials
    const users = await readJSON("users.json");
    const adminUser = users.find(
      (user) =>
        user.userId === adminId &&
        user.password === adminPassword &&
        user.isAdmin === true &&
        user.isActive === true
    );

    if (!adminUser) {
      return res.status(403).json({
        message: "Invalid admin credentials or insufficient privileges",
      });
    }

    const bills = await readJSON("electricity-bills.json");

    // Sort bills by date (newest first)
    bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      data: bills,
    });
  } catch (error) {
    console.error("Error getting electricity bills:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Helper function to format date for display in bill
function formatDateForDisplay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Function to send electricity bill email notifications
async function sendElectricityBillEmail(bill, users) {
  try {
    // Get email addresses of users involved in the bill
    const recipientEmails = [];

    bill.userIds.forEach((userId) => {
      const user = users.find((u) => u.userId === userId);
      if (user && user.email) {
        recipientEmails.push(user.email);
      }
    });

    if (recipientEmails.length === 0) return;

    // Create email content
    const mailOptions = {
      from: `"${bill.createdByName}" <roommates545675645@gmail.com>`,
      to: recipientEmails.join(","),
      subject: `Electricity Bill: ${formatDateForDisplay(
        bill.fromDate
      )} to ${formatDateForDisplay(bill.toDate)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2c3e50;">Electricity Bill Details</h2>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <p><strong>Period:</strong> ${formatDateForDisplay(
              bill.fromDate
            )} to ${formatDateForDisplay(bill.toDate)}</p>
            <p><strong>Initial Reading:</strong> ${bill.startReading} units</p>
            <p><strong>Final Reading:</strong> ${bill.endReading} units</p>
            <p><strong>Units Consumed:</strong> ${bill.unitsConsumed} units</p>
            <p><strong>Rate:</strong> ₹${bill.ratePerUnit} per unit</p>
            <p><strong>Total Amount:</strong> ₹${bill.totalAmount.toFixed(
              2
            )}</p>
            <p><strong>Your Share:</strong> ₹${bill.amountPerUser.toFixed(
              2
            )} (Split equally among ${bill.userIds.length} users)</p>
          </div>
          
          <p>This bill has been automatically added as an expense in the Roommates App.</p>
          
          <p style="margin-top: 20px; font-size: 14px; color: #7f8c8d;">This is an automated message from the Roommates App.</p>
        </div>
      `,
    };

    // Send the email
    return await emailService.sendEmailWithFallback(mailOptions);
  } catch (error) {
    console.error("Error sending electricity bill email:", error);
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Roommates backend server running on port ${PORT}`);
});
