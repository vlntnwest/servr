const express = require("express");
const router = express.Router();
const memberControllers = require("../controllers/member.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isAdmin, isOwner } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  inviteMemberSchema,
  updateMemberRoleSchema,
  acceptInvitationSchema,
} = require("../validators/schemas");

router.get(
  "/restaurants/:restaurantId/members",
  checkAuth,
  isAdmin,
  memberControllers.getMembers,
);

router.post(
  "/restaurants/:restaurantId/members/invite",
  checkAuth,
  isOwner,
  validate({ body: inviteMemberSchema }),
  memberControllers.inviteMember,
);

router.patch(
  "/restaurants/:restaurantId/members/:memberId/role",
  checkAuth,
  isOwner,
  validate({ body: updateMemberRoleSchema }),
  memberControllers.updateMemberRole,
);

router.delete(
  "/restaurants/:restaurantId/members/:memberId",
  checkAuth,
  isOwner,
  memberControllers.removeMember,
);

// Accept an invitation (auth required — user must be logged in)
router.post(
  "/members/accept",
  checkAuth,
  validate({ body: acceptInvitationSchema }),
  memberControllers.acceptInvitation,
);

module.exports = router;
