const Joi = require("joi");
const { db, admin } = require("../config/firebaseConfig");

const orderSchema = Joi.object({
  products: Joi.array().items(
    Joi.object().keys({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(0).required(),
    })
  ),
  status: Joi.string().valid("placed", "canceled", "paid"),
  shippingAddress: Joi.string().required(),
})
  .strict()
  .unknown(false);

async function getProductByID(productId) {
  const get = await db.collection("products").doc(productId).get();
  const result = get.data();
  return { id: productId, ...result };
}

async function getCart(cartId) {
  const userCarts = await db.collection("cart").doc(cartId).get();
  const userCartsData = userCarts.data();

  return userCartsData;
}

async function createOrder(req, res) {
  // Validate body against schema
  const { error } = orderSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.message);
  }

  const userId = req.userId;
  const cartId = req.params.cartId;
  const cart = await getCart(cartId);
  const cartProducts = cart.products;
  const shippingAddress = req.body.shippingAddress;

  // Checks if user is the owner of the cart
  if (cart.userId !== userId) {
    return res
      .status(403)
      .send("Order can only be created by the user that owns the cart");
  }

  // Checks if the product stock is enough to create the order
  let outOfStockItems = [];
  let counter = 0;
  for (const item of cartProducts) {
    const productData = await getProductByID(item.productId);
    if (productData.stock < item.quantity) {
      counter++;
      outOfStockItems.push(`(${counter}) ${productData.name}`);
    }
  }

  if (outOfStockItems.length > 0) {
    return res.status(403).send(`
      The following products are out of stock at the moment:
      ${outOfStockItems.join(", ")}
      Please remove them from the cart if you wish to proceed with the order.
    `);
  }

  // Creates order
  const newOrder = await db.collection("orders").add({
    userId: req.userId,
    products: cartProducts,
    totalItems: cart.totalItems,
    shippingAddress: shippingAddress,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "placed",
  });

  // Updates product stock once order is created
  for (const item of cartProducts) {
    const productData = await getProductByID(item.productId);
    const updateProductStock = await db
      .collection("products")
      .doc(item.productId)
      .update({
        stock: productData.stock - item.quantity,
      });
  }

  // Cleans cart data
  const cleanCart = await db.collection("cart").doc(cartId).delete();

  return res.json(newOrder.id);
}

async function getOrders(req, res) {
  const userId = req.userId;
  const get = await db.collection("orders").where("userId", "==", userId).get();
  const result = get.docs.map((doc) => {
    return { orderId: doc.id, ...doc.data() };
  });
  res.json(result);
}

async function getOrder(orderId) {
  const get = await db.collection("orders").doc(orderId).get();
  const result = get.data();
  return result;
}

async function cancelOrder(req, res) {
  // Validate body against schema
  const { error } = orderSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.message);
  }

  const orderId = req.params.orderId;
  const orderData = await getOrder(orderId);

  if (orderData == undefined) {
    return res.status(404).send("Order not found");
  }

  if (orderData.status == "placed") {
    try {
      const update = await db.collection("orders").doc(orderId).update({
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "canceled",
      });
      res.send("Order canceled");
    } catch (error) {
      res.status(404).send(error.details);
    }
  } else {
    res.status(404).send("Order is not in a status possible to cancel");
  }
}

async function payOrder(req, res) {
  // Validate body against schema
  const { error } = orderSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.message);
  }

  const orderId = req.params.orderId;
  const orderData = await getOrder(orderId);

  if (orderData == undefined) {
    res.status(404).send("Order not found");
  }

  if (orderData.status == "placed") {
    try {
      const update = await db.collection("orders").doc(orderId).update({
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "paid",
      });
      res.send("Order paid");
    } catch (error) {
      res.status(404).send(error.details);
    }
  } else {
    res.status(404).send("Order is not in a status possible to pay");
  }
}
module.exports = { createOrder, getOrders, cancelOrder, payOrder };
