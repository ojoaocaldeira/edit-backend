const Joi = require("joi");
const { db, admin } = require("../config/firebaseConfig");
const { generateToken } = require("../middleware/authMiddleware");

const userSchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("user", "admin"),
})
  .strict()
  .unknown(false);

async function registerUser(req, res) {
  const { email } = req.body;
  const lowercaseEmail = email.toLowerCase();
  req.body.role = req.body.role.toLowerCase();

  // Checks body against schema
  const { error } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).send(error.message);
  }

  // Checks if email already exists in db
  const userDoc = await db
    .collection("users")
    .where("email", "==", lowercaseEmail)
    .limit(1)
    .get();

  if (!userDoc.empty) {
    return res.status(403).json({ message: "User already exists" });
  }

  const newUser = await db.collection("users").add({
    ...req.body,
    role: req.body.role == "admin" ? "admin" : "user",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.send("User created");
}

async function loginUser(req, res) {
  const { email, password } = req.body;
  const lowercaseEmail = email.toLowerCase();

  try {
    // Find user by email in the 'users' collection
    const userDoc = await db
      .collection("users")
      .where("email", "==", lowercaseEmail)
      .limit(1)
      .get();

    if (userDoc.empty) {
      return res.status(404).json({ message: "User not found" });
    }

    const userDocData = userDoc.docs[0].data();

    if (userDocData.password !== password) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    const userId = userDoc.docs[0].id;
    const role = userDocData.role;

    const token = generateToken(userId, role);

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { registerUser, loginUser };
