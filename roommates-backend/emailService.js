const nodemailer = require("nodemailer");
const dateUtils = require("./dateUtils");

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "roommates545675645@gmail.com", // System email
    // IMPORTANT: You need to generate an App Password from Google Account settings
    // This is a placeholder - you must replace it with a real App Password
    pass: process.env.EMAIL_PASSWORD || "dummy-password-replace-this",
  },
});

// Format date for display in emails (IST format)
const formatDateForDisplay = (dateString) => {
  const date = new Date(dateString);
  // IST options (UTC+5:30)
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleString("en-US", options);
};

// Check if we have a valid email password configuration
const hasValidEmailConfig =
  process.env.EMAIL_PASSWORD &&
  process.env.EMAIL_PASSWORD !== "dummy-password-replace-this";

if (!hasValidEmailConfig) {
  console.log("");
  console.log("⚠️ WARNING: Email password is not configured properly!");
  console.log("Email notifications will be logged but not sent.");
  console.log(
    "Please run the setup-gmail.bat script to configure your Gmail App Password."
  );
  console.log("");
} else {
  // Verify transporter connection only if we have valid credentials
  transporter.verify(function (error, success) {
    if (error) {
      console.log("SMTP connection error:", error);
      console.log("Email notifications will be logged but not sent.");
    } else {
      console.log("Email server is ready to send messages");
    }
  });
}

/**
 * Fallback function to log email content when SMTP fails
 *
 * @param {Object} mailOptions - The mail options that would have been sent
 */
const logEmailFallback = (mailOptions) => {
  console.log("\n=== EMAIL WOULD HAVE BEEN SENT ===");
  console.log("From:", mailOptions.from);
  console.log("To:", mailOptions.to);
  if (mailOptions.cc) console.log("CC:", mailOptions.cc);
  console.log("Subject:", mailOptions.subject);
  console.log(
    "Content:",
    mailOptions.html ? "[HTML Content]" : mailOptions.text
  );
  console.log("=== END OF EMAIL CONTENT ===\n");
};

/**
 * Send email with fallback to logging if SMTP fails
 *
 * @param {Object} mailOptions - The mail options to send
 * @returns {Promise} - Promise representing the email sending operation
 */
const sendEmailWithFallback = async (mailOptions) => {
  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log("Failed to send email via SMTP:", error.message);
    console.log("Using fallback logging mechanism instead");
    logEmailFallback(mailOptions);
    return { messageId: "FALLBACK_LOG_" + Date.now() };
  }
};

/**
 * Send notification email for a new expense
 *
 * @param {Object} expense - The expense object
 * @param {Array} users - List of all users to get email addresses
 * @returns {Promise} - Promise representing the email sending operation
 */
const sendNewExpenseEmail = async (expense, users) => {
  try {
    // Get email addresses of all users involved in the expense
    const recipientEmails = [];
    const fromUser = users.find((user) => user.userId === expense.paidBy);

    // Add all users in splitWith to recipients
    if (expense.splitWith && expense.splitWith.length > 0) {
      expense.splitWith.forEach((userId) => {
        const user = users.find((u) => u.userId === userId);
        if (user && user.email) {
          recipientEmails.push(user.email);
        }
      });
    }

    // Add all users in paidFor to recipients if it's that type of expense
    if (expense.paidFor && expense.paidFor.length > 0) {
      expense.paidFor.forEach((userId) => {
        const user = users.find((u) => u.userId === userId);
        if (user && user.email && !recipientEmails.includes(user.email)) {
          recipientEmails.push(user.email);
        }
      });
    }

    // Don't send if there are no recipients
    if (recipientEmails.length === 0) {
      return;
    }

    // Format the expense details
    const expenseType = expense.expenseType || "split";
    const expenseTypeText =
      expenseType === "personal"
        ? "personal expense"
        : expenseType === "split"
        ? "split expense"
        : "paid for others";

    // Format the email
    const mailOptions = {
      from: `"${
        fromUser ? fromUser.name : "Roommates App"
      }" <roommates545675645@gmail.com>`,
      to: recipientEmails.join(","),
      cc: fromUser ? fromUser.email : "",
      subject: `New ${expenseTypeText} added: ${expense.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2c3e50;">New Expense Added</h2>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <p><strong>Description:</strong> ${expense.description}</p>
            <p><strong>Amount:</strong> ₹${expense.amount.toFixed(2)}</p>
            <p><strong>Paid by:</strong> ${expense.paidByName}</p>
            <p><strong>Type:</strong> ${expenseTypeText}</p>
            <p><strong>Date:</strong> ${formatDateForDisplay(
              expense.createdAt
            )}</p>
          </div>
          
          ${
            expense.splitWith && expense.splitWith.length > 0
              ? `<p><strong>Split with:</strong> ${expense.splitWith
                  .map((userId) => expense.userNames[userId])
                  .join(", ")}</p>`
              : ""
          }
          
          ${
            expense.paidFor && expense.paidFor.length > 0
              ? `<p><strong>Paid for:</strong> ${expense.paidFor
                  .map((userId) => expense.userNames[userId])
                  .join(", ")}</p>`
              : ""
          }
          
          <p style="margin-top: 20px; font-size: 14px; color: #7f8c8d;">This is an automated message from the Roommates App.</p>
        </div>
      `,
    };

    // Send email
    return await sendEmailWithFallback(mailOptions);
  } catch (error) {
    console.error("Error sending expense notification email:", error);
  }
};

/**
 * Send notification email for a new payment
 *
 * @param {Object} payment - The payment object
 * @param {Array} users - List of all users to get email addresses
 * @returns {Promise} - Promise representing the email sending operation
 */
const sendNewPaymentEmail = async (payment, users) => {
  try {
    const paidByUser = users.find((user) => user.userId === payment.paidBy);
    const paidToUser = users.find((user) => user.userId === payment.paidTo);

    if (!paidByUser || !paidToUser) {
      return;
    }

    const mailOptions = {
      from: `"${paidByUser.name}" <roommates545675645@gmail.com>`,
      to: paidToUser.email,
      cc: paidByUser.email,
      subject: `Payment Confirmation: ${
        paidByUser.name
      } paid ₹${payment.amount.toFixed(2)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2c3e50;">Payment Confirmation</h2>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <p><strong>From:</strong> ${payment.paidByName}</p>
            <p><strong>To:</strong> ${payment.paidToName}</p>
            <p><strong>Amount:</strong> ₹${payment.amount.toFixed(2)}</p>
            <p><strong>Date:</strong> ${formatDateForDisplay(
              payment.createdAt
            )}</p>
          </div>
          
          <p>This payment has been recorded successfully in the Roommates App.</p>
          
          <p style="margin-top: 20px; font-size: 14px; color: #7f8c8d;">This is an automated message from the Roommates App.</p>
        </div>
      `,
    };

    // Send email
    return await sendEmailWithFallback(mailOptions);
  } catch (error) {
    console.error("Error sending payment notification email:", error);
  }
};

/**
 * Send welcome email to a new user
 *
 * @param {Object} user - The user object
 * @returns {Promise} - Promise representing the email sending operation
 */
const sendNewUserWelcomeEmail = async (user) => {
  try {
    const mailOptions = {
      from: '"Roommates App" <roommates545675645@gmail.com>',
      to: user.email,
      subject: "Welcome to Roommates App!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2c3e50;">Welcome to Roommates App!</h2>
          
          <p>Hello ${user.name},</p>
          
          <p>Your account has been created successfully. Here are your login details:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <p><strong>User ID:</strong> ${user.userId}</p>
            <p><strong>Temporary Password:</strong> ${user.password}</p>
          </div>
          
          <p><strong>Important:</strong> You will be required to change your password when you first log in.</p>
          
          <p>If you have any questions, please contact your administrator.</p>
          
          <p style="margin-top: 20px; font-size: 14px; color: #7f8c8d;">This is an automated message from the Roommates App.</p>
        </div>
      `,
    };

    // Send email
    return await sendEmailWithFallback(mailOptions);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};

/**
 * Send a password reset link/information
 *
 * @param {string} email - User's email address
 * @param {string} userId - User's ID
 * @param {string} tempPassword - Temporary password
 * @returns {Promise} - Promise representing the email sending operation
 */
const sendPasswordResetEmail = async (email, userId, tempPassword) => {
  try {
    const mailOptions = {
      from: '"Roommates App" <roommates545675645@gmail.com>',
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2c3e50;">Password Reset</h2>
          
          <p>We received a request to reset the password for your account.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          
          <p>Please use this temporary password to log in. You will be prompted to create a new password immediately after logging in.</p>
          
          <p>If you did not request a password reset, please contact your administrator immediately.</p>
          
          <p style="margin-top: 20px; font-size: 14px; color: #7f8c8d;">This is an automated message from the Roommates App.</p>
        </div>
      `,
    };

    // Send email
    return await sendEmailWithFallback(mailOptions);
  } catch (error) {
    console.error("Error sending password reset email:", error);
  }
};

module.exports = {
  sendNewExpenseEmail,
  sendNewPaymentEmail,
  sendNewUserWelcomeEmail,
  sendPasswordResetEmail,
};
