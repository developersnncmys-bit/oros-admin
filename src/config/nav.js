import {
    LayoutDashboard,
    Package,
    FileText,
    CreditCard,
    Box,
    LayoutGrid,
    ShoppingCart,
    Tag,
    Users,
    UserCheck,
    PlusSquare,
    Image,
    Settings
} from "lucide-react";

export const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
        label: "Categories & Sub categories",
        href: "/dashboard/categories",
        icon: LayoutGrid,
        match: ["/dashboard/categories", "/dashboard/subcategories"]
    },
    { label: "Products", href: "/dashboard/products", icon: Box },
    { label: "Quotations", href: "/dashboard/quotations", icon: FileText },
    { label: "Orders", href: "/dashboard/orders", icon: Package },
    { label: "Team", href: "/dashboard/users", icon: Users },
    { label: "Customers", href: "/dashboard/customers", icon: UserCheck },
    { label: "Reports", href: "/dashboard/payments", icon: CreditCard },
    { label: "Manual order", href: "/dashboard/manual-order", icon: PlusSquare },
    { label: "Banners", href: "/dashboard/banners", icon: Image },
    { label: "Abandoned carts", href: "/dashboard/abandoned-carts", icon: ShoppingCart },
    { label: "Coupons", href: "/dashboard/coupons", icon: Tag },
    { label: "Settings", href: "/dashboard/settings", icon: Settings }
];
