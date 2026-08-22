import { ArrowUpRight, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    { name: "Total Sales", value: "GHS 12,450", change: "+15.8%", trend: "up" },
    { name: "Orders", value: "78", change: "+8.2%", trend: "up" },
    { name: "Pending Orders", value: "23", change: null, trend: "neutral" },
    { name: "Low Stock Items", value: "12", change: null, trend: "neutral", alert: true },
    { name: "Out of Stock", value: "4", change: null, trend: "neutral", alert: true },
  ];

  const recentOrders = [
    { id: "ORD-000123", customer: "John Mensah", amount: "GHS 550.00", payment: "Paid", status: "Pending" },
    { id: "ORD-000122", customer: "Ama Addo", amount: "GHS 450.00", payment: "Paid", status: "Processing" },
    { id: "ORD-000121", customer: "Kofi Boateng", amount: "GHS 380.00", payment: "Paid", status: "Shipped" },
    { id: "ORD-000120", customer: "Abena Darko", amount: "GHS 820.00", payment: "Paid", status: "Delivered" },
    { id: "ORD-000119", customer: "Kwame Asare", amount: "GHS 420.00", payment: "Pending", status: "Pending" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <select className="border border-charcoal/20 rounded-md px-3 py-1.5 text-sm bg-white outline-none focus:border-olive">
          <option>Today</option>
          <option>This Week</option>
          <option>This Month</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow-sm border border-soft-grey flex flex-col">
            <span className="text-sm font-medium text-charcoal/60 mb-2">{stat.name}</span>
            <span className={`text-2xl font-bold mb-2 ${stat.alert ? 'text-terracotta' : 'text-charcoal'}`}>
              {stat.value}
            </span>
            {stat.change && (
              <div className="flex items-center gap-1 text-xs font-medium text-olive mt-auto">
                <ArrowUpRight size={14} />
                {stat.change} vs last period
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Sales Overview Chart (Placeholder) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-soft-grey">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold">Sales Overview</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-olive"></span> This Week</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-charcoal/20"></span> Last Week</div>
            </div>
          </div>
          <div className="h-64 w-full flex items-center justify-center bg-soft-grey/30 rounded border border-dashed border-charcoal/10">
            <div className="flex flex-col items-center text-charcoal/40">
              <TrendingUp size={32} className="mb-2" />
              <span className="text-sm font-medium">Chart visualization</span>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-soft-grey">
          <h3 className="font-semibold mb-6">Recent Orders</h3>
          <div className="space-y-5">
            {recentOrders.map((order, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div>
                  <div className="font-medium text-olive">{order.id}</div>
                  <div className="text-charcoal/60">{order.customer}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{order.amount}</div>
                  <div className="flex gap-2 justify-end mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      order.payment === 'Paid' ? 'bg-olive/10 text-olive' : 'bg-terracotta/10 text-terracotta'
                    }`}>
                      {order.payment}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      order.status === 'Pending' ? 'bg-sand text-charcoal' : 
                      order.status === 'Processing' ? 'bg-charcoal/10 text-charcoal' : 
                      order.status === 'Shipped' ? 'bg-olive/10 text-olive' : 
                      'bg-olive text-white'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full text-center text-sm text-olive font-medium mt-6 hover:underline">
            View all orders →
          </button>
        </div>
      </div>
    </div>
  );
}
