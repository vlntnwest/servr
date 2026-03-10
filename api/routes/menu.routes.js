const express = require("express");
const router = express.Router();
const menuControllers = require("../controllers/menu.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isAdmin } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  categorieSchema,
  updateCategorieSchema,
  productSchema,
  updateProductSchema,
  productOptionGroupSchema,
  updateProductOptionGroupSchema,
  productOptionChoiceSchema,
  bulkOptionChoicesSchema,
  updateProductOptionChoiceSchema,
  linkOptionGroupsSchema,
} = require("../validators/schemas");

// Menu (public)
router.get(
  "/restaurants/:restaurantId/menu",
  menuControllers.getMenu,
);

// Product search/filter (public) — ?q=search&isAvailable=true
router.get(
  "/restaurants/:restaurantId/products",
  menuControllers.searchProducts,
);

// Products (public read)
router.get(
  "/restaurants/:restaurantId/products/:productId",
  menuControllers.getProduct,
);

// Categories
router.post(
  "/restaurants/:restaurantId/categories",
  checkAuth,
  isAdmin,
  validate({ body: categorieSchema }),
  menuControllers.createProductCategorie,
);
router.put(
  "/restaurants/:restaurantId/categories/:categorieId",
  checkAuth,
  isAdmin,
  validate({ body: updateCategorieSchema }),
  menuControllers.updateProductCategorie,
);
router.delete(
  "/restaurants/:restaurantId/categories/:categorieId",
  checkAuth,
  isAdmin,
  menuControllers.deleteProductCategorie,
);

// Products
router.post(
  "/restaurants/:restaurantId/products",
  checkAuth,
  isAdmin,
  validate({ body: productSchema }),
  menuControllers.createProduct,
);
router.put(
  "/restaurants/:restaurantId/products/:productId",
  checkAuth,
  isAdmin,
  validate({ body: updateProductSchema }),
  menuControllers.updateProduct,
);
router.delete(
  "/restaurants/:restaurantId/products/:productId",
  checkAuth,
  isAdmin,
  menuControllers.deleteProduct,
);

// Option groups (restaurant-level)
router.get(
  "/restaurants/:restaurantId/option-groups",
  checkAuth,
  isAdmin,
  menuControllers.listOptionGroups,
);
router.post(
  "/restaurants/:restaurantId/option-groups",
  checkAuth,
  isAdmin,
  validate({ body: productOptionGroupSchema }),
  menuControllers.createProductOptionGroup,
);
router.put(
  "/restaurants/:restaurantId/option-groups/:optionGroupId",
  checkAuth,
  isAdmin,
  validate({ body: updateProductOptionGroupSchema }),
  menuControllers.updateProductOptionGroup,
);
router.delete(
  "/restaurants/:restaurantId/option-groups/:optionGroupId",
  checkAuth,
  isAdmin,
  menuControllers.deleteProductOptionGroup,
);

// Link / unlink option groups to products
router.post(
  "/restaurants/:restaurantId/products/:productId/option-groups",
  checkAuth,
  isAdmin,
  validate({ body: linkOptionGroupsSchema }),
  menuControllers.linkOptionGroups,
);
router.delete(
  "/restaurants/:restaurantId/products/:productId/option-groups/:optionGroupId",
  checkAuth,
  isAdmin,
  menuControllers.unlinkOptionGroup,
);

// Option choices
router.post(
  "/restaurants/:restaurantId/option-groups/:optionGroupId/option-choices",
  checkAuth,
  isAdmin,
  validate({ body: productOptionChoiceSchema }),
  menuControllers.createProductOptionChoice,
);
router.post(
  "/restaurants/:restaurantId/option-groups/:optionGroupId/option-choices/bulk",
  checkAuth,
  isAdmin,
  validate({ body: bulkOptionChoicesSchema }),
  menuControllers.createBulkOptionChoices,
);
router.put(
  "/restaurants/:restaurantId/option-choices/:optionChoiceId",
  checkAuth,
  isAdmin,
  validate({ body: updateProductOptionChoiceSchema }),
  menuControllers.updateProductOptionChoice,
);
router.delete(
  "/restaurants/:restaurantId/option-choices/:optionChoiceId",
  checkAuth,
  isAdmin,
  menuControllers.deleteProductOptionChoice,
);

module.exports = router;
