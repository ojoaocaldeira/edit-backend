const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController.js");

const { decodeUserId } = require("../middleware/authMiddleware.js");

router.get("/", productController.getProducts);
router.get("/:id", productController.getProductByID);
router.post("/", decodeUserId, productController.createProduct);
router.put("/:id", decodeUserId, productController.updateProduct);
router.delete("/:id", decodeUserId, productController.deleteProduct);

module.exports = router;
