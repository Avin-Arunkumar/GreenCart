import User from "../models/User.js";

export const getCart = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming authUser sets req.user
    // Fetch cart from User model or a separate Cart model
    const user = await User.findById(userId).select("cartItems");
    res.json({ success: true, cartItems: user.cartItems || {} });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
// Update User CartData : /api/cart/update
export const updateCart = async (req, res) => {
  try {
    const { userId, cartItems } = req.body;
    await User.findByIdAndUpdate(userId, { cartItems });

    res.json({
      success: true,
      message: "Cart updated ",
    });
  } catch (error) {
    console.log(error.message);
    res.json({
      success: false,
      message: error.message,
    });
  }
};
