import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  getMyCart,
  addToCart as apiAddToCart,
  removeFromCart as apiRemoveFromCart,
  updateCartItemQuantity as apiUpdateCartItemQuantity,
} from '../services/cartService';

const LOCAL_CART_KEY = 'vtout_local_cart';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const refreshCart = useCallback(async (silent = false) => {
    if (!isLoaded) return;

    if (isSignedIn) {
      if (!silent) setLoading(true);
      try {
        const token = await getToken();
        const items = await getMyCart(token);
        setCart(items || []);
      } catch (err) {
        console.error('refreshCart error', err);
      } finally {
        if (!silent) setLoading(false);
      }
    } else {
      try {
        const saved = await AsyncStorage.getItem(LOCAL_CART_KEY);
        setCart(saved ? JSON.parse(saved) : []);
      } catch {
        setCart([]);
      }
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    if (!isSignedIn && isLoaded) {
      AsyncStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart)).catch(() => {});
    }
  }, [cart, isSignedIn, isLoaded]);

  const addToCart = async (productData, quantity = 1) => {
    if (isSignedIn) {
      const token = await getToken();
      await apiAddToCart({
        product_id: productData.product_id || productData.id,
        variant_id: productData.variant_id || null,
        quantity,
        price_snapshot: productData.price_snapshot || productData.price,
        image_url: productData.image_url || productData.images?.[0]?.image_url,
        selected_attributes: productData.selected_attributes || {},
        kit_id: productData.kit_id || null,
      }, token);
      await refreshCart(true);
    } else {
      setCart((prev) => {
        const index = prev.findIndex((item) => item.id === productData.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], quantity: updated[index].quantity + quantity };
          return updated;
        }
        return [...prev, { ...productData, quantity }];
      });
    }
  };

  const removeFromCart = async (itemId) => {
    const prevCart = cart;
    setCart((prev) => prev.filter((item) => item.id !== itemId));

    if (isSignedIn) {
      try {
        const token = await getToken();
        await apiRemoveFromCart(itemId, token);
        await refreshCart(true);
      } catch (err) {
        setCart(prevCart);
        throw err;
      }
    }
  };

  const updateQuantity = async (itemId, newQty) => {
    if (newQty < 1) return;
    const prevCart = cart;
    setCart((prev) => prev.map((item) => (item.id === itemId ? { ...item, quantity: newQty } : item)));

    if (isSignedIn) {
      try {
        const token = await getToken();
        await apiUpdateCartItemQuantity(itemId, newQty, token);
        await refreshCart(true);
      } catch (err) {
        setCart(prevCart);
        throw err;
      }
    }
  };

  const clearCart = async () => {
    setCart([]);
    if (!isSignedIn) await AsyncStorage.removeItem(LOCAL_CART_KEY);
  };

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <CartContext.Provider value={{ cart, cartCount, loading, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
