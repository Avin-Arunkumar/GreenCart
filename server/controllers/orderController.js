import Order from "../models/Order.js";
import Product from "../models/Product.js";
import stripe from "stripe";
import User from "../models/User.js";

// Place Order COD : /api/order/cod
export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, addressId } = req.body;
    if (!addressId || items.length === 0) {
      return res.json({ success: false, message: "Invalid data" });
    }
    let amount = await items.reduce(async (acc, item) => {
      const product = await Product.findById(item.product);
      return (await acc) + product.offerPrice * item.quantity;
    }, 0);
    // Add Tax Charge(2%)
    amount += Math.floor(amount * 0.02);
    const order = await Order.create({
      userId,
      items,
      amount,
      address: addressId,
      paymentType: "COD",
    });
    res.json({
      success: true,
      message: "Order Placed Successfully",
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// Place order stripe :/api/order/stripe

export const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, addressId } = req.body;
    const { origin } = req.headers;

    // Validate input
    if (!userId || !addressId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    // Calculate total amount
    let amount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`,
        });
      }
      amount += product.offerPrice * item.quantity;
    }
    // Add 2% tax
    amount += Math.floor(amount * 0.02);

    // Create order
    const order = await Order.create({
      userId,
      items,
      amount,
      address: addressId,
      paymentType: "online",
      isPaid: false,
    });

    // Initialize Stripe
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    // Create line items
    const line_items = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.product);
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.name,
              description: product.description?.[0] || "Product description",
            },
            unit_amount: Math.floor(product.offerPrice * 100),
          },
          quantity: item.quantity,
        };
      })
    );

    // Create Stripe session
    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader?next=my-orders&orderId=${order._id}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId,
      },
    });

    res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const stripeWebhooks = async (request, response) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  const sig = request.headers["stripe-signature"];

  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error.message);
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const { orderId, userId } = session.metadata;

      try {
        // Validate metadata
        if (!orderId || !userId) {
          console.error(
            "Missing orderId or userId in session metadata:",
            session.metadata
          );
          return response.status(400).send("Invalid metadata");
        }

        // Mark payment as paid
        const updatedOrder = await Order.findByIdAndUpdate(
          orderId,
          { isPaid: true },
          { new: true }
        );
        if (!updatedOrder) {
          console.error(`Order ${orderId} not found`);
          return response.status(404).send("Order not found");
        }

        // Clear user cart (assuming cartItems is an array or object)
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $set: { cartItems: [] } }, // Use [] for array, {} for object
          { new: true }
        );
        if (!updatedUser) {
          console.error(`User ${userId} not found`);
          return response.status(404).send("User not found");
        }

        console.log(
          `Order ${orderId} marked as paid and cart cleared for user ${userId}`
        );
      } catch (error) {
        console.error(
          "Error processing checkout.session.completed:",
          error.message
        );
        return response.status(500).send("Error processing webhook");
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const session = event.data.object;
      const { orderId } = session.metadata;

      try {
        const deletedOrder = await Order.findByIdAndDelete(orderId);
        if (!deletedOrder) {
          console.error(`Order ${orderId} not found for deletion`);
        } else {
          console.log(`Order ${orderId} deleted due to payment failure`);
        }
      } catch (error) {
        console.error("Error deleting order:", error.message);
        return response.status(500).send("Error processing webhook");
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  response.json({ received: true });
};

// Get Orders by User ID : /api/order/user
export const getuserOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    const orders = await Order.find({
      userId,
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.json({ success: false, message: error.message });
  }
};
// Get All Orders (for seller / admil): /api/order/seller

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.json({ success: false, message: error.message });
  }
};
