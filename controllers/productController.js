const Joi = require("joi");
const { db, admin } = require("../config/firebaseConfig");

const coffeeAttributes = {
  type: ["capsule", "ground"],
  name: ["chiaro", "scuro", "corto", "vaniglia"],
  intensity: ["light", "mid", "intense"],
  flavor: ["cocoa", "woody", "caramel"],
};

const productSchema = Joi.object({
  type: Joi.string()
    .valid(...coffeeAttributes.type)
    .required(),
  name: Joi.string()
    .valid(...coffeeAttributes.name)
    .required(),
  description: Joi.string().required(),
  intensity: Joi.string()
    .valid(...coffeeAttributes.intensity)
    .required(),
  flavor: Joi.string()
    .valid(...coffeeAttributes.flavor)
    .required(),
  price: Joi.number().min(0).required(),
  stock: Joi.number().integer().min(0).required(),
})
  .strict()
  .unknown(false);

async function getProducts(req, res) {
  const get = await db.collection("products").get();
  const result = get.docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });
  res.json(result);
}

async function getProductByID(req, res) {
  const productId = req.params.id;
  const get = await db.collection("products").doc(productId).get();
  const result = get.data();
  return res.send({ productId: productId, ...result });
}

async function createProduct(req, res) {
  // Check if JWT is of admin user
  if (req.role !== "admin") {
    return res
      .status(401)
      .send("To perform this action please request admin permissions");
  }

  // Validate body against schema
  const { error } = productSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.message);
  }

  // Check if Product already exists based on type and name
  const getProducts = await db.collection("products").get();
  const productList = getProducts.docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });
  for (const product of productList) {
    if (product.type == req.body.type && product.name == req.body.name) {
      return res
        .status(403)
        .send(
          `Product already exists in the database with Id: "${product.id}"`
        );
    }
  }

  // Creates product
  const newProduct = await db.collection("products").add({
    ...req.body,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.send(`New product created with Id: "${newProduct.id}"`);
}

async function updateProduct(req, res) {
  // Check if JWT is of admin user
  if (req.role !== "admin") {
    return res
      .status(401)
      .send("To perform this action please request admin permissions");
  }

  // Validate body against schema
  const { error } = productSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.message);
  }

  // Updates product
  const productId = req.params.id;
  try {
    const get = await db
      .collection("products")
      .doc(productId)
      .update({
        ...req.body,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    res.send("Product updated");
  } catch (error) {
    res.status(404).send(error.details);
  }
}

async function deleteProduct(req, res) {
  // Check if JWT is of admin user
  if (req.role !== "admin") {
    return res
      .status(401)
      .send("To perform this action please request admin permissions");
  }

  const productId = req.params.id;
  const get = await db.collection("products").doc(productId).delete();
  res.send("Product deleted");
}

module.exports = {
  getProducts,
  getProductByID,
  createProduct,
  updateProduct,
  deleteProduct,
};
