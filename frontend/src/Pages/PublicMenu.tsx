import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";

interface Dish {
    dishId: string;
    name: string;
    price: number | null;
    weight: string | null;
    description: string | null;
    imageUrl: string | null;
}

interface Category {
    categoryName: string;
    dishes: Dish[];
}

interface StoreData {
    storeName: string;
    logoUrl: string;
}

export default function PublicMenu() {
    const { storeUid } = useParams();
    const [store, setStore] = useState<StoreData | null>(null);
    const [menu, setMenu] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        if (storeUid) fetchMenu();
    }, [storeUid]);

    const fetchMenu = async () => {
        try {
            const res = await api.get(`/stores/${storeUid}/menu`);
            setStore(res.data.store);
            setMenu(res.data.menu);
        } catch (error) {
            console.error("Failed to load menu", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTheme = () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
    };

    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center text-lg font-medium">
                Loading Menu...
            </div>
        );

    if (!store)
        return (
            <div className="min-h-screen flex items-center justify-center text-lg font-medium">
                Store not found
            </div>
        );

    const isDark = theme === "dark";

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>

            {/* HERO SECTION */}
            <div className={`relative overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"} shadow-sm`}>
                <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">

                    <div className="flex items-center gap-6">
                        {store.logoUrl && (
                            <img
                                src={store.logoUrl}
                                alt={store.storeName}
                                className="w-20 h-20 rounded-2xl object-cover shadow-lg"
                            />
                        )}

                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                                {store.storeName}
                            </h1>
                            <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                Crafted with passion • Fresh ingredients • Premium taste
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href="/"
                            className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${isDark
                                ? "border-gray-700 hover:bg-gray-800"
                                : "border-gray-200 hover:bg-gray-100"
                                }`}
                        >
                            New Process
                        </a>
                        <button
                            onClick={() => window.location.href = `/manage-menu/${storeUid}`}
                            className={`px-4 py-2 rounded-xl border text-sm font-medium transition bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700`}
                        >
                            Edit Menu
                        </button>
                        <button
                            onClick={toggleTheme}
                            className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${isDark
                                ? "border-gray-700 hover:bg-gray-800"
                                : "border-gray-200 hover:bg-gray-100"
                                }`}
                        >
                            {isDark ? "Light Mode ☀️" : "Dark Mode 🌙"}
                        </button>
                    </div>
                </div>
            </div>

            {/* MENU CONTENT */}
            <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">

                {menu.map((category) => (
                    <section key={category.categoryName}>

                        {/* Category Title */}
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                                {category.categoryName}
                            </h2>
                            <div className={`h-[2px] flex-1 ml-6 ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />
                        </div>

                        {/* Dish Grid */}
                        <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-8">
                            {category.dishes.map((dish) => (
                                <div
                                    key={dish.dishId}
                                    className={`rounded-2xl p-5 flex gap-5 transition-all duration-300 hover:shadow-xl ${isDark
                                        ? "bg-gray-900 border border-gray-800"
                                        : "bg-white border border-gray-100"
                                        }`}
                                >
                                    {/* Image */}
                                    <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0">
                                        {dish.imageUrl ? (
                                            <img
                                                src={dish.imageUrl}
                                                alt={dish.name}
                                                className="w-full h-full object-cover hover:scale-105 transition duration-500"
                                            />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center text-xs ${isDark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"
                                                }`}>
                                                No Image
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-lg font-semibold">
                                                    {dish.name}
                                                </h3>

                                                {dish.price !== null && (
                                                    <span className="text-lg font-bold text-blue-600">
                                                        ₹{dish.price}
                                                    </span>
                                                )}
                                            </div>

                                            {dish.description && (
                                                <p className={`text-sm mt-2 leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"
                                                    }`}>
                                                    {dish.description}
                                                </p>
                                            )}
                                        </div>

                                        {dish.weight && (
                                            <span className={`mt-4 text-xs px-3 py-1 rounded-full w-fit ${isDark
                                                ? "bg-gray-800 text-gray-300"
                                                : "bg-gray-100 text-gray-600"
                                                }`}>
                                                {dish.weight}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {/* Empty State */}
                {menu.length === 0 && (
                    <div className="text-center py-24 text-gray-400">
                        No menu items available.
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <footer className={`text-center py-10 text-sm ${isDark ? "text-gray-500 border-t border-gray-800" : "text-gray-400 border-t border-gray-200"
                }`}>
                © {new Date().getFullYear()} {store.storeName}. All rights reserved.
            </footer>
        </div>
    );
}
