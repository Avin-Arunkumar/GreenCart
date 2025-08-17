import React, { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";
import toast from "react-hot-toast";

const Orders = () => {
  const { currency, axios } = useAppContext();
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get("/api/order/seller", {
        withCredentials: true,
      });
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching orders");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div>
      <div className="md:p-10 p-4 space-y-4">
        <h2 className="text-lg font-medium">Orders List</h2>
        {orders.length > 0 ? (
          orders.map((order, index) => (
            <div
              key={index}
              className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center gap-5 p-5 max-w-4xl rounded-md border border-gray-300"
            >
              <div className="flex gap-5 max-w-80">
                <img
                  className="w-12 h-12 object-cover"
                  src={assets.box_icon}
                  alt="boxIcon"
                />
                <div>
                  {order.items?.length > 0 ? (
                    order.items.map((item, index) => (
                      <div key={index} className="flex flex-col">
                        <p className="font-medium">
                          {item.product?.name ||
                            "Unknown Product (ID: " + item.product + ")"}{" "}
                          <span className="text-primary">
                            x {item.quantity}
                          </span>
                        </p>
                      </div>
                    ))
                  ) : (
                    <p>No items in this order</p>
                  )}
                </div>
              </div>

              <div className="text-sm md:text-base text-black/60">
                <p className="text-black/80">
                  {order.address?.firstName && order.address?.lastName
                    ? `${order.address.firstName} ${order.address.lastName}`
                    : "No address available"}
                </p>
                <p>
                  {order.address?.street || ""}, {order.address?.city || ""},{" "}
                  {order.address?.state || ""}, {order.address?.zipcode || ""},{" "}
                  {order.address?.country || ""}
                </p>
              </div>

              <p className="font-medium text-lg my-auto">
                {currency}
                {order.amount || 0}
              </p>

              <div className="flex flex-col text-sm md:text-base text-black/60">
                <p>Method: {order.paymentType || "N/A"}</p>
                <p>
                  Date:{" "}
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
                <p>
                  Payment:{" "}
                  {order.isPaid
                    ? "Paid"
                    : order.isPaid === false
                    ? "Pending"
                    : "N/A"}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p>No orders found</p>
        )}
      </div>
    </div>
  );
};

export default Orders;
