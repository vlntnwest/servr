require("dotenv").config();
const prisma = require("../lib/prisma");
const supabase = require("../lib/supabase");
const logger = require("../logger");

const checkAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  let dbUser;

  if (!token) {
    logger.warn("No token provided");
    return res.status(401).json({ error: "Not authenticated" });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    logger.warn({ error: error?.message || "No user found" }, "Invalid token");
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        restaurantMembers: { include: { restaurant: true } },
      },
    });
  } catch (error) {
    logger.warn({ error: error.message }, "Error finding user in database");
    return res.status(500).json({ error: "Internal server error" });
  }

  if (!dbUser) {
    logger.warn({ userId: user.id }, "User not found in database");
    return res.status(401).json({ error: "User not found" });
  }

  req.user = dbUser;
  next();
};

module.exports = checkAuth;
