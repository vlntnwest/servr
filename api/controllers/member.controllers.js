const crypto = require("crypto");
const prisma = require("../lib/prisma");
const logger = require("../logger");
const { sendInvitationEmail } = require("../lib/mailer");

module.exports.getMembers = async (req, res, next) => {
  const { restaurantId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  try {
    const [data, total] = await Promise.all([
      prisma.restaurantMember.findMany({
        where: { restaurantId },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, phone: true },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      prisma.restaurantMember.count({ where: { restaurantId } }),
    ]);

    logger.info({ restaurantId, page, limit }, "Members retrieved");
    return res.status(200).json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports.inviteMember = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { email, role = "STAFF" } = req.body;

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.restaurantMember.findUnique({
        where: { restaurantId_userId: { restaurantId, userId: existingUser.id } },
      });
      if (alreadyMember) {
        return res.status(409).json({ error: "User is already a member" });
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.invitationToken.upsert({
      where: { token },
      update: {},
      create: { restaurantId, email, role, token, expiresAt },
    });

    const inviteLink = `${process.env.CLIENT_URL}/invite/accept?token=${token}`;
    sendInvitationEmail({ to: email, restaurantName: restaurant.name, inviteLink });

    logger.info({ restaurantId, email }, "Invitation sent");
    return res.status(201).json({ message: "Invitation sent" });
  } catch (error) {
    next(error);
  }
};

module.exports.updateMemberRole = async (req, res, next) => {
  const { restaurantId, memberId } = req.params;
  const { role } = req.body;

  try {
    const member = await prisma.restaurantMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (member.role === "OWNER") {
      return res.status(400).json({ error: "Cannot change the role of the owner" });
    }

    const data = await prisma.restaurantMember.update({
      where: { id: memberId },
      data: { role },
    });

    logger.info({ restaurantId, memberId, role }, "Member role updated");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.removeMember = async (req, res, next) => {
  const { restaurantId, memberId } = req.params;

  try {
    const member = await prisma.restaurantMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (member.role === "OWNER") {
      return res.status(400).json({ error: "Cannot remove the owner" });
    }

    await prisma.restaurantMember.delete({ where: { id: memberId } });

    logger.info({ restaurantId, memberId }, "Member removed");
    return res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports.acceptInvitation = async (req, res, next) => {
  const { token } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;

  try {
    const invitation = await prisma.invitationToken.findUnique({
      where: { token },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Invalid or expired invitation" });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.invitationToken.delete({ where: { token } });
      return res.status(400).json({ error: "Invitation has expired" });
    }

    if (invitation.email !== userEmail) {
      return res.status(403).json({ error: "Invitation is for a different email address" });
    }

    const existing = await prisma.restaurantMember.findUnique({
      where: {
        restaurantId_userId: { restaurantId: invitation.restaurantId, userId },
      },
    });
    if (existing) {
      await prisma.invitationToken.delete({ where: { token } });
      return res.status(409).json({ error: "You are already a member" });
    }

    const data = await prisma.$transaction(async (tx) => {
      const member = await tx.restaurantMember.create({
        data: {
          restaurantId: invitation.restaurantId,
          userId,
          role: invitation.role,
        },
      });
      await tx.invitationToken.delete({ where: { token } });
      return member;
    });

    logger.info(
      { restaurantId: invitation.restaurantId, userId },
      "Invitation accepted",
    );
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};
