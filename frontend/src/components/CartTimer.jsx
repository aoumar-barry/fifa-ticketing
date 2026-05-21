import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { deleteCart } from '../services/cartService';

export default function CartTimer() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCartStore();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!cart || !cart.expiresAt) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = new Date(cart.expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(difference / 1000));
    };

    // Initial update
    const initialTime = calculateTimeLeft();
    setTimeLeft(initialTime);

    if (initialTime <= 0) {
      handleExpiration();
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        handleExpiration();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [cart]);

  const handleExpiration = async () => {
    if (cart?.cartId) {
      try {
        await deleteCart(cart.cartId);
      } catch (err) {
        console.warn('Failed to delete cart on expiration:', err);
      }
    }
    clearCart();
    navigate('/');
  };

  if (!cart || timeLeft <= 0) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isLowTime = timeLeft < 120; // 2 minutes
  const isCriticalTime = timeLeft < 60; // 1 minute

  let timerColorClass = 'text-text-secondary';
  let containerBorderClass = 'border-border-subtle';
  let pulseClass = '';

  if (isLowTime) {
    timerColorClass = 'text-brand-red font-bold';
    containerBorderClass = 'border-brand-red/30 bg-brand-red/5';
  }
  if (isCriticalTime) {
    pulseClass = 'animate-pulse';
  }

  return (
    <div 
      data-testid="cart-timer-container"
      className={`flex items-center gap-2 border px-3 py-1.5 rounded-full text-xs font-mono select-none transition-all duration-300 ${containerBorderClass} ${pulseClass}`}
    >
      <svg className={`w-3.5 h-3.5 ${isLowTime ? 'text-brand-red' : 'text-brand-gold'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[10px] text-text-muted uppercase tracking-wider hidden xs:inline">
        Panier expire dans :
      </span>
      <span className={timerColorClass} data-testid="cart-timer-countdown">
        {formattedTime}
      </span>
    </div>
  );
}
