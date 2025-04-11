const jwt = require("jsonwebtoken");

const generateToken = (userId, role) => {
  const payload = {
    userId: userId,
    role: role,
  };

  return jwt.sign(payload, "edit1234", { expiresIn: "5h" });
};

const decodeUserId = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  jwt.verify(token, "edit1234", (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  });
};

module.exports = {
  generateToken,
  decodeUserId,
};
