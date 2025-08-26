"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Settings,
  DollarSign,
  Activity,
  AlertCircle,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminRoutes = [
  {
    label: "Status Management",
    href: "/admin/status",
    icon: Activity,
    description: "Monitor and update hackathon statuses",
  },
  {
    label: "Platform Fees",
    href: "/admin/platform-fees",
    icon: DollarSign,
    description: "Manage platform fee rates and collections",
  },
];

// Admin layout content component
function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { address, isConnected } = useAccount();
  const pathname = usePathname();

  // For now, any connected wallet is considered admin
  // In production, this should check against a list of admin addresses
  const isAdmin = !!address;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container px-4 py-8 mx-auto">
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-yellow-700">
              Please connect your wallet to access the admin dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container px-4 py-8 mx-auto">
          <Alert className="border-red-500 bg-red-50">
            <Shield className="w-4 h-4" />
            <AlertDescription className="text-red-700">
              Access denied. Admin privileges required.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container px-4 py-8 mx-auto">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <div className="mb-6">
              <h1 className="flex items-center gap-2 mb-2 text-2xl font-bold text-gray-900">
                <Shield className="w-6 h-6" />
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Administrative controls for platform management
              </p>
            </div>

            <nav className="space-y-2">
              {adminRoutes.map((route) => {
                const Icon = route.icon;
                const isActive = pathname === route.href;

                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                    )}
                  >
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{route.label}</div>
                      <div className="text-xs text-gray-500">
                        {route.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Warning Notice */}
            <div className="p-3 mt-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-700">
                  <div className="font-medium mb-1">Admin Access</div>
                  <div>
                    Admin actions affect the entire platform. Use with caution
                    and ensure proper authorization.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container px-4 py-8 mx-auto">
          <div className="space-y-4 animate-pulse">
            <div className="w-1/2 h-8 bg-gray-200 rounded"></div>
            <div className="w-1/4 h-4 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
