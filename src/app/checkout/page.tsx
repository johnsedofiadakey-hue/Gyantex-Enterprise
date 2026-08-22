"use client";

import { useCartStore } from "@/store/useCartStore";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form State
  const [deliveryZone, setDeliveryZone] = useState("accra_central");
  
  const deliveryFees: Record<string, number> = {
    "accra_central": 30,
    "outside_accra": 50,
    "pickup": 0
  };

  useEffect(() => {
    setMounted(true);
    if (useCartStore.getState().items.length === 0) {
      router.push("/cart");
    }
  }, [router]);

  if (!mounted || cart.items.length === 0) return null;

  const subtotal = cart.totalPrice();
  const deliveryFee = deliveryFees[deliveryZone];
  const total = subtotal + deliveryFee;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate network request for payment initialization
    setTimeout(() => {
      alert("Payment Gateway (Paystack/Flutterwave) will open here.");
      setIsProcessing(false);
      // cart.clearCart();
      // router.push("/order/success");
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-soft-grey">
      <header className="bg-white border-b border-soft-grey px-6 py-4 flex items-center justify-between">
        <Link href="/cart" className="flex items-center gap-2 text-charcoal hover:text-olive transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium text-sm">Back to Cart</span>
        </Link>
        <div className="font-serif font-bold text-xl tracking-tight text-olive">BLESSED</div>
        <div className="flex items-center gap-2 text-olive font-medium text-sm">
          <Lock size={16} /> Secure
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Checkout Form */}
        <div className="flex-1">
          <form id="checkout-form" onSubmit={handleCheckout} className="space-y-8">
            
            {/* Customer Details */}
            <section className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="font-serif text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-olive text-white text-xs flex items-center justify-center">1</span>
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">First Name *</label>
                  <input required type="text" className="w-full p-3 rounded-md border border-charcoal/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none" placeholder="Kwadwo" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Last Name *</label>
                  <input required type="text" className="w-full p-3 rounded-md border border-charcoal/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none" placeholder="Effah" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Phone Number *</label>
                  <input required type="tel" className="w-full p-3 rounded-md border border-charcoal/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none" placeholder="024 123 4567" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Email Address</label>
                  <input type="email" className="w-full p-3 rounded-md border border-charcoal/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none" placeholder="kwadwo@example.com" />
                </div>
              </div>
            </section>

            {/* Delivery Details */}
            <section className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="font-serif text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-olive text-white text-xs flex items-center justify-center">2</span>
                Delivery Method
              </h2>
              
              <div className="space-y-3 mb-6">
                <label className={`flex items-center justify-between p-4 border rounded-md cursor-pointer transition-colors ${deliveryZone === 'accra_central' ? 'border-olive bg-olive/5' : 'border-charcoal/20 hover:border-olive/50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="delivery" checked={deliveryZone === 'accra_central'} onChange={() => setDeliveryZone('accra_central')} className="accent-olive w-4 h-4" />
                    <span className="font-medium">Accra Central Delivery</span>
                  </div>
                  <span className="font-semibold">GHS 30.00</span>
                </label>
                <label className={`flex items-center justify-between p-4 border rounded-md cursor-pointer transition-colors ${deliveryZone === 'outside_accra' ? 'border-olive bg-olive/5' : 'border-charcoal/20 hover:border-olive/50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="delivery" checked={deliveryZone === 'outside_accra'} onChange={() => setDeliveryZone('outside_accra')} className="accent-olive w-4 h-4" />
                    <span className="font-medium">Outside Accra Delivery</span>
                  </div>
                  <span className="font-semibold">GHS 50.00</span>
                </label>
                <label className={`flex items-center justify-between p-4 border rounded-md cursor-pointer transition-colors ${deliveryZone === 'pickup' ? 'border-olive bg-olive/5' : 'border-charcoal/20 hover:border-olive/50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="delivery" checked={deliveryZone === 'pickup'} onChange={() => setDeliveryZone('pickup')} className="accent-olive w-4 h-4" />
                    <span className="font-medium">Store Pickup (East Legon)</span>
                  </div>
                  <span className="font-semibold text-olive">Free</span>
                </label>
              </div>

              {deliveryZone !== 'pickup' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Address / Landmark *</label>
                    <input required type="text" className="w-full p-3 rounded-md border border-charcoal/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none" placeholder="123 Example Street, near the Blue Kiosk" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Delivery Notes (Optional)</label>
                    <textarea className="w-full p-3 rounded-md border border-charcoal/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none resize-none h-24" placeholder="Any special instructions for the rider..."></textarea>
                  </div>
                </div>
              )}
            </section>

          </form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="w-full lg:w-96">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
            <h3 className="font-semibold text-lg mb-6">Order Summary</h3>
            
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative">
                    <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded bg-soft-grey" />
                    <span className="absolute -top-2 -right-2 bg-charcoal text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{item.quantity}</span>
                  </div>
                  <div className="flex-1 text-sm">
                    <h4 className="font-medium line-clamp-1">{item.name}</h4>
                    <p className="text-charcoal/60 text-xs mb-1">{item.color} | {item.purchaseType}</p>
                    <div className="font-semibold">GHS {(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm mb-6 border-t border-soft-grey pt-4">
              <div className="flex justify-between">
                <span className="text-charcoal/60">Subtotal</span>
                <span className="font-medium">GHS {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal/60">Delivery</span>
                <span className="font-medium">
                  {deliveryFee === 0 ? 'Free' : `GHS ${deliveryFee.toFixed(2)}`}
                </span>
              </div>
            </div>
            
            <div className="border-t border-soft-grey pt-4 mb-8 flex justify-between items-center">
              <span className="font-semibold">Total to Pay</span>
              <span className="font-bold text-xl">GHS {total.toFixed(2)}</span>
            </div>
            
            <button 
              type="submit" 
              form="checkout-form"
              disabled={isProcessing}
              className="w-full bg-olive text-white py-4 rounded-md font-semibold hover:bg-olive/90 transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {isProcessing ? "Initializing Payment..." : `Pay GHS ${total.toFixed(2)}`}
            </button>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-charcoal/60">
              <Lock size={12} /> Payments processed securely via Paystack
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
