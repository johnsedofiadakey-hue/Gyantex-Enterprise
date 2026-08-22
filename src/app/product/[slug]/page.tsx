"use client";

import { useEffect, useState } from "react";
import { Heart, Search, User, ShoppingBag, ArrowLeft, Minus, Plus, ShieldCheck, Truck, RefreshCcw, Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useCartStore } from "@/store/useCartStore";

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const cart = useCartStore();
  const cartTotal = cart.totalItems();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [purchaseType, setPurchaseType] = useState<"full" | "half">("full");
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);

  useEffect(() => {
    async function fetchProduct() {
      if (!params.slug) return;
      try {
        const docRef = doc(db, "products", params.slug as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Dummy fallback for preview purposes
          setProduct({
            id: params.slug,
            name: "Adire Cotton Fabric",
            price: 95.00,
            unit: "Yard",
            imageUrl: "/api/placeholder/800/1000",
            colors: ["#5F6F52", "#171717", "#D95D39", "#1D2B53"]
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [params.slug]);

  const handleAddToCart = () => {
    if (!product) return;
    
    cart.addItem({
      id: Math.random().toString(),
      productId: product.id,
      name: product.name,
      price: purchaseType === 'half' ? product.price / 2 : product.price,
      image: product.imageUrl,
      color: product.colors?.[selectedColor] || "Standard",
      purchaseType,
      quantity
    });
    alert("Added to cart!");
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    // Add to cart and immediately bypass to checkout
    cart.addItem({
      id: Math.random().toString(),
      productId: product.id,
      name: product.name,
      price: purchaseType === 'half' ? product.price / 2 : product.price,
      image: product.imageUrl,
      color: product.colors?.[selectedColor] || "Standard",
      purchaseType,
      quantity
    });
    router.push('/checkout');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center">Product not found.</div>;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-soft-grey px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-charcoal hover:text-olive transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium text-sm hidden md:inline">Back to Shop</span>
        </Link>
        <Link href="/" className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
          <span className="font-serif font-bold text-xl md:text-2xl tracking-tight text-olive">BLESSED</span>
          <span className="text-[9px] md:text-[10px] tracking-widest text-charcoal uppercase">Clothing</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/cart" className="text-charcoal hover:text-olive transition-colors relative">
            <ShoppingBag size={20} />
            {cartTotal > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-olive text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {cartTotal}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-10 xl:gap-16">
          
          {/* Left: Image Gallery */}
          <div className="w-full lg:w-3/5 space-y-4">
            <div className="relative aspect-[4/5] md:aspect-square bg-soft-grey rounded-lg overflow-hidden">
              <img src={product.imageUrl || "/api/placeholder/800/1000"} alt={product.name} className="object-cover w-full h-full" />
              <button className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:text-olive transition-colors">
                <Heart size={20} />
              </button>
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="w-full lg:w-2/5 flex flex-col">
            <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">{product.name}</h1>
            <div className="flex items-end gap-3 mb-6">
              <span className="text-2xl font-bold">GHS {product.price?.toFixed(2)}</span>
              {product.unit && <span className="text-charcoal/60 mb-1">/ {product.unit}</span>}
            </div>

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium">Color Option</span>
                </div>
                <div className="flex gap-3">
                  {product.colors.map((hex: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedColor(idx)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedColor === idx ? 'border-olive p-0.5' : 'border-transparent'
                      }`}
                    >
                      <span className="w-full h-full rounded-full border border-charcoal/10" style={{ backgroundColor: hex }}></span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Type */}
            <div className="mb-6">
              <span className="font-medium block mb-3">Purchase Type</span>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setPurchaseType("full")}
                  className={`py-3 px-4 rounded-md border font-medium text-sm transition-colors ${
                    purchaseType === "full" ? "bg-olive text-white border-olive" : "bg-white text-charcoal border-charcoal/20 hover:border-olive/50"
                  }`}
                >
                  Full Piece
                </button>
                <button 
                  onClick={() => setPurchaseType("half")}
                  className={`py-3 px-4 rounded-md border font-medium text-sm transition-colors ${
                    purchaseType === "half" ? "bg-olive text-white border-olive" : "bg-white text-charcoal border-charcoal/20 hover:border-olive/50"
                  }`}
                >
                  Half Piece
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-8">
              <span className="font-medium block mb-3">Quantity</span>
              <div className="flex items-center gap-6">
                <div className="flex items-center border border-charcoal/20 rounded-md">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-soft-grey transition-colors text-charcoal/60 hover:text-charcoal"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-soft-grey transition-colors text-charcoal/60 hover:text-charcoal"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <span className="text-olive font-medium text-sm">In Stock</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 mb-10">
              <button onClick={handleAddToCart} className="w-full py-4 bg-olive text-white rounded-md font-semibold hover:bg-olive/90 transition-colors">
                Add to Cart
              </button>
              <button onClick={handleBuyNow} className="w-full py-4 bg-white text-charcoal border-2 border-charcoal rounded-md font-semibold hover:bg-soft-grey transition-colors">
                Buy Now
              </button>
            </div>

            {/* Trust Badges */}
            <div className="space-y-4 pt-6 border-t border-soft-grey text-sm text-charcoal/80">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-olive" size={20} />
                <span>High quality fabric guarantee</span>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="text-olive" size={20} />
                <span>Fast delivery across Ghana</span>
              </div>
              <div className="flex items-center gap-3">
                <RefreshCcw className="text-olive" size={20} />
                <span>7-day return policy</span>
              </div>
              <div className="flex items-center gap-3">
                <Lock className="text-olive" size={20} />
                <span>Secure payments (MoMo & Cards)</span>
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
