"use client";

import { LayoutDashboard, ShoppingCart, Package, Tag, Truck, Users, UserCog, Settings, Store, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAdminRole, type AdminRole } from "@/hooks/useAdminRole";
import BrandMark from "@/components/BrandMark";

const navItems: { name: string; href: string; icon: typeof LayoutDashboard; roles: AdminRole[] }[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["owner", "staff"] },
  { name: "POS", href: "/admin/pos", icon: Store, roles: ["owner", "staff"] },
  { name: "Orders", href: "/admin/orders", icon: ShoppingCart, roles: ["owner", "staff"] },
  { name: "Products", href: "/admin/products", icon: Package, roles: ["owner"] },
  { name: "Categories", href: "/admin/categories", icon: Tag, roles: ["owner"] },
  { name: "Delivery", href: "/admin/delivery", icon: Truck, roles: ["owner"] },
  { name: "Customers", href: "/admin/customers", icon: Users, roles: ["owner"] },
  { name: "Staff", href: "/admin/staff", icon: UserCog, roles: ["owner"] },
  { name: "Settings", href: "/admin/settings", icon: Settings, roles: ["owner"] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, user, role } = useAdminRole();

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    if (!loading && !user) router.replace("/admin/login");
  }, [loading, user, isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-grey">
        <div className="w-8 h-8 border-4 border-white border-t-olive rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // redirect effect above is already firing
  }

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-soft-grey px-4 text-center gap-4">
        <p className="font-medium">This account doesn&apos;t have admin access.</p>
        <button
          onClick={() => signOut(auth).then(() => router.replace("/admin/login"))}
          className="text-olive font-medium hover:underline"
        >
          Sign out and try a different account
        </button>
      </div>
    );
  }

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <div className="flex min-h-screen bg-soft-grey font-sans text-charcoal">
      {/* Sidebar */}
      <aside className="w-64 bg-charcoal text-white flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6">
          <BrandMark tone="dark" compact admin />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
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
          {role === "staff" && (
            <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-white/40">Staff account</div>
          )}
          <button
            onClick={() => signOut(auth).then(() => router.replace("/admin/login"))}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
          >
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
            <div className="text-sm font-medium">{user?.email}</div>
            <div className="w-8 h-8 rounded-full bg-olive text-white flex items-center justify-center font-bold text-sm">
              {user?.email?.[0]?.toUpperCase() || "A"}
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
