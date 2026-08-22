"use client";

import { useCartStore } from "@/store/useCartStore";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const cart = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-soft-grey">
      <header className="bg-white border-b border-soft-grey px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-charcoal hover:text-olive transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium text-sm">Continue Shopping</span>
        </Link>
        <div className="font-serif font-bold text-xl tracking-tight text-olive">BLESSED</div>
        <div className="w-24"></div> {/* Spacer */}
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12">
        <h1 className="font-serif text-3xl font-semibold mb-8">Your Cart</h1>

        {cart.items.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm">
            <h2 className="text-xl font-medium mb-4">Your cart is empty</h2>
            <Link href="/" className="inline-block bg-olive text-white px-8 py-3 rounded-md font-medium hover:bg-olive/90 transition-colors">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
              <div className="space-y-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4 border-b border-soft-grey last:border-0 last:pb-0">
                    <img src={item.image} alt={item.name} className="w-24 h-32 object-cover rounded-md bg-soft-grey" />
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <button onClick={() => cart.removeItem(item.id)} className="text-charcoal/40 hover:text-terracotta transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <p className="text-sm text-charcoal/60 mb-2">{item.color} | {item.purchaseType === 'full' ? 'Full Piece' : 'Half Piece'}</p>
                      <div className="font-semibold mb-auto">GHS {item.price.toFixed(2)}</div>
                      
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center border border-charcoal/20 rounded-md">
                          <button 
                            onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-soft-grey text-charcoal/60 hover:text-charcoal transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button 
                            onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-soft-grey text-charcoal/60 hover:text-charcoal transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-80 bg-white rounded-lg shadow-sm p-6 h-fit sticky top-6">
              <h3 className="font-semibold text-lg mb-6">Order Summary</h3>
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-charcoal/60">Subtotal</span>
                  <span className="font-medium">GHS {cart.totalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal/60">Delivery</span>
                  <span className="text-charcoal/60">Calculated at checkout</span>
                </div>
              </div>
              <div className="border-t border-soft-grey pt-4 mb-6 flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">GHS {cart.totalPrice().toFixed(2)}</span>
              </div>
              <Link href="/checkout" className="block text-center w-full bg-olive text-white py-3.5 rounded-md font-semibold hover:bg-olive/90 transition-colors">
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
