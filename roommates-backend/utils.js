const fs = require("fs").promises;
const path = require("path");
const dateUtils = require("./dateUtils");

const readJSON = async (filename) => {
  try {
    const data = await fs.readFile(`./data/${filename}`, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeJSON = async (filename, content) => {
  try {
    const filePath = `./data/${filename}`;
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    try {
      await fs.access(filePath);
    } catch (err) {
      await fs.writeFile(filePath, JSON.stringify([], null, 2));
    }

    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
  } catch (err) {
    console.error("Failed to save data", err);
  }
};

// Helper function to get a unique ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Initialize default users if none exist
const initializeDefaultUsers = async () => {
  const users = await readJSON("users.json");

  // If no users exist, create a default admin
  if (users.length === 0) {
    const defaultAdmin = {
      userId: "admin",
      name: "Administrator",
      email: "admin@roommates.app",
      password: "admin123",
      isAdmin: true,
      isTempPassword: false,
      isActive: true,
      createdBy: "system",
      createdAt: dateUtils.toISOStringIST(),
    };

    users.push(defaultAdmin);
    await writeJSON("users.json", users);
    console.log("Default admin user created");
  }
};

module.exports = { readJSON, writeJSON, generateId, initializeDefaultUsers };
