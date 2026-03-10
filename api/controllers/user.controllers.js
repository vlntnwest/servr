const prisma = require("../lib/prisma");
const supabase = require("../lib/supabase");
const logger = require("../logger");

module.exports.getUserData = async (req, res, next) => {
  const { id } = req.user;

  try {
    const data = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!data) {
      logger.error("User not found");
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.updateUserData = async (req, res, next) => {
  const { id } = req.user;
  const { fullName, phone } = req.body;

  try {
    const data = await prisma.user.update({
      where: { id },
      data: { fullName, phone },
    });

    logger.info({ userId: data.id }, "User data updated successfully");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.deleteUser = async (req, res, next) => {
  const { id } = req.user;

  try {
    await supabase.auth.admin.deleteUser(id);

    logger.info({ userId: id }, "User deleted successfully");
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};
