const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController.js");

const { decodeUserId } = require("../middleware/authMiddleware.js");

router.post("/:cartId", decodeUserId, orderController.createOrder);
router.get("/", decodeUserId, orderController.getOrders);
router.put("/:orderId/cancel", decodeUserId, orderController.cancelOrder);
router.put("/:orderId/pay", decodeUserId, orderController.payOrder);

module.exports = router;
