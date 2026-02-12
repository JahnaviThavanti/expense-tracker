const jwt = require("jsonwebtoken");

module.exports = function(req, res, next) {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ msg: "No token, access denied" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const verified = jwt.verify(token, "expensesecret123");

    req.user = verified;
    next();

  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};
