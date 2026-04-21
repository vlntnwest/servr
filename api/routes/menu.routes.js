const express = require("express");
const router = express.Router();
const menuControllers = require("../controllers/menu.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isRestaurantAdmin } = require("../middleware/role.middleware");
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
  reorderOptionGroupsSchema,
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
  isRestaurantAdmin,
  validate({ body: categorieSchema }),
  menuControllers.createProductCategorie,
);
router.put(
  "/restaurants/:restaurantId/categories/:categorieId",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: updateCategorieSchema }),
  menuControllers.updateProductCategorie,
);
router.delete(
  "/restaurants/:restaurantId/categories/:categorieId",
  checkAuth,
  isRestaurantAdmin,
  menuControllers.deleteProductCategorie,
);

// Products
router.post(
  "/restaurants/:restaurantId/products",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: productSchema }),
  menuControllers.createProduct,
);
router.put(
  "/restaurants/:restaurantId/products/:productId",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: updateProductSchema }),
  menuControllers.updateProduct,
);
router.delete(
  "/restaurants/:restaurantId/products/:productId",
  checkAuth,
  isRestaurantAdmin,
  menuControllers.deleteProduct,
);

// Option groups (restaurant-level)
router.get(
  "/restaurants/:restaurantId/option-groups",
  checkAuth,
  isRestaurantAdmin,
  menuControllers.listOptionGroups,
);
router.post(
  "/restaurants/:restaurantId/option-groups",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: productOptionGroupSchema }),
  menuControllers.createProductOptionGroup,
);
router.put(
  "/restaurants/:restaurantId/option-groups/:optionGroupId",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: updateProductOptionGroupSchema }),
  menuControllers.updateProductOptionGroup,
);
router.delete(
  "/restaurants/:restaurantId/option-groups/:optionGroupId",
  checkAuth,
  isRestaurantAdmin,
  menuControllers.deleteProductOptionGroup,
);

// Link / unlink / reorder option groups on products
router.post(
  "/restaurants/:restaurantId/products/:productId/option-groups",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: linkOptionGroupsSchema }),
  menuControllers.linkOptionGroups,
);
router.put(
  "/restaurants/:restaurantId/products/:productId/option-groups/reorder",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: reorderOptionGroupsSchema }),
  menuControllers.reorderProductOptionGroups,
);
router.delete(
  "/restaurants/:restaurantId/products/:productId/option-groups/:optionGroupId",
  checkAuth,
  isRestaurantAdmin,
  menuControllers.unlinkOptionGroup,
);

// Option choices
router.post(
  "/restaurants/:restaurantId/option-groups/:optionGroupId/option-choices",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: productOptionChoiceSchema }),
  menuControllers.createProductOptionChoice,
);
router.post(
  "/restaurants/:restaurantId/option-groups/:optionGroupId/option-choices/bulk",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: bulkOptionChoicesSchema }),
  menuControllers.createBulkOptionChoices,
);
router.put(
  "/restaurants/:restaurantId/option-choices/:optionChoiceId",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: updateProductOptionChoiceSchema }),
  menuControllers.updateProductOptionChoice,
);
router.delete(
  "/restaurants/:restaurantId/option-choices/:optionChoiceId",
  checkAuth,
  isRestaurantAdmin,
  menuControllers.deleteProductOptionChoice,
);

module.exports = router;
