const Joi = require("joi");
const { db, admin } = require("../config/firebaseConfig");

const cartSchema = Joi.object({
  products: Joi.array().items(
    Joi.object().keys({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(0).required(),
    })
  ),
})
  .strict()
  .unknown(false);

async function getCarts(req, res) {
  const userId = req.userId;

  // Find user by userID in the 'cart' collection
  const userCarts = await db
    .collection("cart")
    .where("userId", "==", userId)
    .get();

  const userCartsData = userCarts.docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });

  // Stops the function if cart is not found
  if (userCarts.empty) {
    return res.status(404).json({ message: "Cart not found" });
  }

  return res.send(userCartsData);
}

// Function to be used when creating or updating a cart - counts total number of products
function countItems(products) {
  let finalNumber = 0;
  products.map((i) => {
    finalNumber += i.quantity;
  });
  return finalNumber;
}

async function createCart(req, res) {
  // Validate body against schema
  const { error } = cartSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.message);
  }

  // Counts total quantity of products
  const products = req.body.products;
  countItems(products);

  // Creates cart
  const newCart = await db.collection("cart").add({
    userId: req.userId,
    ...req.body,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    totalItems: countItems(products),
  });
  res.json(newCart.id);
}

async function updateCart(req, res) {
  // Validate body against schema
  const { error } = cartSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.message);
  }

  const userId = req.userId;
  const cartId = req.params.id;

  // Checks if user is the owner of the cart
  const getCart = await db.collection("cart").doc(cartId).get();
  const cartData = getCart.data();
  if (cartData.userId !== userId) {
    return res
      .status(403)
      .send("Cart can only be updated by the user that created it");
  }

  // Counts total quantity of products
  const products = req.body.products;
  countItems(products);

  // Updates cart
  try {
    const get = await db
      .collection("cart")
      .doc(cartId)
      .update({
        ...req.body,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        totalItems: countItems(products),
      });
    res.send("Cart updated");
  } catch (error) {
    res.status(404).send(error.details);
  }
}

async function removeProductFromCart(req, res) {
  const userId = req.userId;
  const cartId = req.params.cartId;
  const productId = req.params.productId;

  // Find carts
  const getCart = await db.collection("cart").doc(cartId).get();

  // If cart is not found return error
  if (getCart.empty) {
    return res.status(404).json({ message: "Cart not found" });
  }

  const cartData = getCart.data();
  const productList = cartData.products;

  // Checks if user is the owner of the cart
  if (cartData.userId !== userId) {
    return res
      .status(403)
      .send("Cart can only be updated by the user that created it");
  }

  // Variables that store product data to be updated in the cart
  const updatedProductList = [];
  let productQuantity = undefined;

  // Finds product to be removed by productId and (1) stores that product quantity, (2) creates a new list without that item
  for (const item of productList) {
    if (item.productId == productId) {
      productQuantity = item.quantity;
    } else {
      updatedProductList.push(item);
    }
  }

  // Updates cart data
  try {
    const get = await db
      .collection("cart")
      .doc(cartId)
      .update({
        products: updatedProductList,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        totalItems: admin.firestore.FieldValue.increment(-productQuantity),
      });
    res.send("Product removed from cart");
  } catch (error) {
    res.status(404).send(error.details);
  }
}

module.exports = { createCart, updateCart, getCarts, removeProductFromCart };
