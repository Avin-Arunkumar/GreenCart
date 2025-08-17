import jwt from "jsonwebtoken";

const authUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    console.log("No token found in request");
    return res.json({ success: false, message: "Not Authorized: No token" });
  }

  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
    if (tokenDecode.id) {
      req.body = req.body || {};
      req.body.userId = tokenDecode.id;
    } else {
      return res.json({ success: false, message: "Not Authorized" });
    }
    next();
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export default authUser;
