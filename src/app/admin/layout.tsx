"use client";

import { LayoutDashboard, ShoppingCart, Package, Archive, Users, Megaphone, Settings, FileText, BarChart3, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Inventory", href: "/admin/inventory", icon: Archive },
    { name: "Customers", href: "/admin/customers", icon: Users },
    { name: "Marketing", href: "/admin/marketing", icon: Megaphone },
    { name: "Content", href: "/admin/content", icon: FileText },
    { name: "Reports", href: "/admin/reports", icon: BarChart3 },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-soft-grey font-sans text-charcoal">
      {/* Sidebar */}
      <aside className="w-64 bg-charcoal text-white flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6">
          <div className="font-serif font-bold text-xl tracking-tight text-sand flex flex-col">
            <span>BLESSED</span>
            <span className="text-[10px] tracking-widest text-white/60 uppercase">Clothing</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-olive text-white" 
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-soft-grey h-16 flex items-center justify-between px-8 sticky top-0 z-40">
          <h2 className="font-semibold capitalize">{pathname.split('/').pop() || 'Dashboard'}</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">Admin User</div>
            <div className="w-8 h-8 rounded-full bg-olive text-white flex items-center justify-center font-bold text-sm">
              A
            </div>
          </div>
        </header>
        <div className="p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
