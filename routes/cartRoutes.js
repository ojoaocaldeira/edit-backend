const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController.js");

const { decodeUserId } = require("../middleware/authMiddleware.js");

router.get("/", decodeUserId, cartController.getCarts);
router.post("/", decodeUserId, cartController.createCart);
router.put("/:id", decodeUserId, cartController.updateCart);
router.delete(
  "/:cartId/:productId",
  decodeUserId,
  cartController.removeProductFromCart
);

module.exports = router;
