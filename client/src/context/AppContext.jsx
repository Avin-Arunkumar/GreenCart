import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;
export const AppContent = createContext();
export const AppContextProvider = ({ children }) => {
  const currency = import.meta.env.VITE_CURRENCY;
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [searchQuery, setSearchQuery] = useState({});

  // Load cart from localStorage on initial render
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error("Error loading cart from localStorage:", error);
      }
    };
    loadCart();
  }, []);

  // When user changes, sync cart with backend
  useEffect(() => {
    const syncCartWithBackend = async () => {
      if (user?._id) {
        try {
          const { data } = await axios.get("/api/cart");
          if (data.success && data.cartItems) {
            // Merge local cart with server cart
            const mergedCart = {
              ...data.cartItems,
              ...JSON.parse(localStorage.getItem("cart") || "{}"),
            };
            setCartItems(mergedCart);
            await axios.post("/api/cart/update", { cartItems: mergedCart });
          }
        } catch (error) {
          console.error("Error syncing cart with backend:", error);
        }
      }
    };
    syncCartWithBackend();
  }, [user?._id]);

  // Save to localStorage and backend when cart changes
  useEffect(() => {
    const saveCart = async () => {
      try {
        // Save to localStorage
        localStorage.setItem("cart", JSON.stringify(cartItems));

        // Sync with backend if user is logged in
        if (user?._id) {
          await axios.post("/api/cart/update", { cartItems });
        }
      } catch (error) {
        console.error("Error saving cart:", error);
      }
    };
    saveCart();
  }, [cartItems, user?._id]);

  // Clear localStorage cart when user logs out
  useEffect(() => {
    if (!user) {
      localStorage.removeItem("cart");
    }
  }, [user]);

  // Add to Cart
  const addToCart = (itemId) => {
    setCartItems((prev) => {
      const newCart = {
        ...prev,
        [itemId]: (prev[itemId] || 0) + 1,
      };
      toast.success("Added to Cart");
      return newCart;
    });
  };

  // Update Cart Item Quantity
  const updateCartItem = (itemId, quantity) => {
    setCartItems((prev) => {
      if (quantity <= 0) {
        const newCart = { ...prev };
        delete newCart[itemId];
        toast.success("Removed from Cart");
        return newCart;
      }
      toast.success("Cart Updated");
      return { ...prev, [itemId]: quantity };
    });
  };

  // Remove Product from Cart
  const removeFromCart = (itemId) => {
    setCartItems((prev) => {
      const newCart = { ...prev };
      delete newCart[itemId];
      toast.success("Removed from Cart");
      return newCart;
    });
  };

  // Get Cart Item Count
  const getCartCount = () => {
    return Object.values(cartItems).reduce((sum, qty) => sum + qty, 0);
  };

  // Get Cart Total Amount
  const getCartAmount = () => {
    return Object.entries(cartItems).reduce((total, [key, quantity]) => {
      const product = products.find(
        (item) => String(item.id) === key || String(item._id) === key
      );
      return total + (product?.offerPrice || 0) * quantity;
    }, 0);
  };

  // Fetch Seller Status
  const fetchSeller = async () => {
    try {
      const { data } = await axios.get("/api/seller/is-auth");
      setIsSeller(data.success);
    } catch (error) {
      setIsSeller(false);
      if (error.response?.status !== 401) {
        toast.error(error.message);
      }
    }
  };

  // Fetch User Auth Status and Data
  const fetchUser = async () => {
    try {
      const { data } = await axios.get("/api/user/is-auth");
      if (data.success) {
        setUser(data.user);
        // Don't overwrite cartItems here - let the sync effect handle it
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    }
  };

  // Fetch All Products
  const fetchProducts = async () => {
    try {
      const { data } = await axios.get("/api/product/list");
      if (data.success) {
        setProducts(data.products);
      } else {
        toast.error(data.message);
        setProducts([]);
      }
    } catch (error) {
      toast.error(error.message);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchProducts();
    fetchSeller();
  }, []);

  const value = {
    navigate,
    user,
    setUser,
    setIsSeller,
    isSeller,
    showUserLogin,
    setShowUserLogin,
    products,
    currency,
    addToCart,
    removeFromCart,
    updateCartItem,
    cartItems,
    searchQuery,
    setSearchQuery,
    getCartAmount,
    getCartCount,
    axios,
    fetchProducts,
    setCartItems,
  };

  return <AppContent.Provider value={value}>{children}</AppContent.Provider>;
};

export const useAppContext = () => {
  return useContext(AppContent);
};
