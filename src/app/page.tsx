"use client";

import { ShoppingBag, Search, Heart, User, SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCartStore } from "@/store/useCartStore";

// Type for our Product
interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  imageUrl: string;
  colors: string[];
  badge?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const cartTotal = useCartStore((state) => state.totalItems());

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        const fetchedProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        
        if (fetchedProducts.length > 0) {
          setProducts(fetchedProducts);
        } else {
          // Fallback dummy data if Firestore is empty
          setProducts([
            { id: "1", name: "Ankara Royal Wax Fabric", price: 85.00, unit: "Yard", imageUrl: "/api/placeholder/400/500", colors: ["#171717", "#5F6F52", "#D95D39", "#D8C8B8"] },
            { id: "2", name: "Linen Two-Piece Set", price: 420.00, unit: "", imageUrl: "/api/placeholder/400/500", colors: ["#171717", "#5F6F52"] },
            { id: "3", name: "Premium Men Kaftan", price: 580.00, unit: "", imageUrl: "/api/placeholder/400/500", colors: ["#171717", "#D95D39", "#D8C8B8"] },
            { id: "4", name: "Adire Cotton Fabric", price: 95.00, unit: "Yard", imageUrl: "/api/placeholder/400/500", colors: ["#1D2B53"] },
          ]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        // Fallback dummy data on error
        setProducts([
          { id: "1", name: "Ankara Royal Wax Fabric", price: 85.00, unit: "Yard", imageUrl: "/api/placeholder/400/500", colors: ["#171717", "#5F6F52", "#D95D39", "#D8C8B8"] },
          { id: "2", name: "Linen Two-Piece Set", price: 420.00, unit: "", imageUrl: "/api/placeholder/400/500", colors: ["#171717", "#5F6F52"] },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-soft-grey px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-2xl tracking-tight text-olive">BLESSED</span>
            <span className="text-[10px] tracking-widest text-charcoal uppercase">Clothing</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#" className="hover:text-olive transition-colors">New In</a>
            <a href="#" className="hover:text-olive transition-colors">Women</a>
            <a href="#" className="hover:text-olive transition-colors">Men</a>
            <a href="#" className="hover:text-olive transition-colors">Fabrics</a>
            <a href="#" className="hover:text-olive transition-colors">Traditional</a>
            <a href="#" className="text-terracotta hover:text-terracotta/80 transition-colors">Sale</a>
          </nav>
        </div>
        <div className="flex items-center gap-5">
          <button className="text-charcoal hover:text-olive transition-colors"><Search size={20} /></button>
          <button className="text-charcoal hover:text-olive transition-colors"><Heart size={20} /></button>
          <button className="text-charcoal hover:text-olive transition-colors"><User size={20} /></button>
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

      {/* Trust Strip */}
      <div className="bg-soft-grey py-2.5 px-4 text-xs flex justify-center items-center gap-8 text-charcoal/80 font-medium overflow-x-auto hide-scrollbar whitespace-nowrap">
        <div className="flex items-center gap-2"><span>🚚</span> Free delivery over GHS 300</div>
        <div className="flex items-center gap-2"><span>🔒</span> Secure MoMo & Card Payments</div>
        <div className="flex items-center gap-2"><span>💬</span> WhatsApp Support 24/7</div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-4xl font-semibold mb-1">SHOP ALL</h1>
            <p className="text-sm text-charcoal/60">{products.length} Products</p>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-2">
              <span className="text-charcoal/60">Sort by:</span>
              <select className="bg-transparent border-none outline-none font-semibold cursor-pointer">
                <option>Newest</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categories / Pills */}
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-4 mb-4">
          {["All", "New in", "Fabrics", "Women", "Men", "Traditional", "Sale"].map((cat, i) => (
            <button key={cat} className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${i === 0 ? "bg-olive text-white" : "bg-soft-grey hover:bg-soft-grey/80 text-charcoal"}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Two Column Layout (Filters + Grid) */}
        <div className="flex items-start gap-8 mt-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-sm uppercase tracking-wider">FILTER BY</h2>
              <button className="text-xs text-charcoal/50 hover:text-charcoal underline">Clear all</button>
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Category</h3>
              <div className="space-y-3">
                {["All Categories", "Fabrics", "Women", "Men", "Traditional", "Accessories"].map((cat, i) => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${i === 0 ? "bg-olive border-olive text-white" : "border-charcoal/30 group-hover:border-olive"}`}>
                      {i === 0 && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className="text-sm text-charcoal/80">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="animate-pulse flex flex-col">
                    <div className="aspect-[4/5] bg-soft-grey rounded-md mb-3"></div>
                    <div className="h-4 bg-soft-grey rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-soft-grey rounded w-1/2 mb-2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {products.map((product) => (
                  <Link href={`/product/${product.id}`} key={product.id} className="group flex flex-col cursor-pointer">
                    <div className="relative aspect-[4/5] bg-soft-grey rounded-md overflow-hidden mb-3">
                      <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                      <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-olive">
                        <Heart size={16} />
                      </button>
                      {product.badge && (
                        <span className={`absolute bottom-3 left-3 px-2 py-1 text-[10px] font-bold uppercase rounded ${
                          product.badge === 'Sale' ? 'bg-terracotta text-white' : 
                          product.badge === 'New' ? 'bg-olive text-white' : 'bg-sand text-charcoal'
                        }`}>
                          {product.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-sm md:text-base leading-tight mb-1">{product.name}</h3>
                    <div className="flex items-center gap-1 mb-2 text-sm">
                      <span className="font-semibold">GHS {product.price.toFixed(2)}</span>
                      {product.unit && <span className="text-charcoal/60 text-xs">/ {product.unit}</span>}
                    </div>
                    {/* Color Swatches */}
                    <div className="flex items-center gap-1.5 mt-auto">
                      {product.colors && product.colors.map((hex, j) => (
                        <div key={j} className="w-3 h-3 rounded-full border border-charcoal/10" style={{ backgroundColor: hex }}></div>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
