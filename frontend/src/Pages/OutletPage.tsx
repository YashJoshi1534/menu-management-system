import api from "../api/client";
import { useEffect, useRef, useState } from "react";
import DishCard from "../components/DishCard";
import { useParams } from "react-router-dom";

export interface Dish {
  dishId: string;
  name: string;
  price?: number;
  imageUrl?: string;
  imageStatus?: "pending" | "generating" | "ready" | "failed";
}

export default function OutletPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const { outletUid } = useParams<{ outletUid: string }>();

  // 🔒 prevents duplicate background runs
  const isGeneratingRef = useRef(false);

  const fetchDishes = async () => {
    if (!outletUid) return;

    const res = await api.get(
      `/outlets/${outletUid}/dishes`
    );
    setDishes(res.data);
  };

  // ✅ initial load
  useEffect(() => {
    fetchDishes();
  }, [outletUid]);

  // 🔥 background image generation (SAFE & SEQUENTIAL)
  useEffect(() => {
    const generateSequentially = async () => {
      if (isGeneratingRef.current) return;

      const toGenerate = dishes.filter(
        d =>
          (d.imageStatus === "pending" || d.imageStatus === "failed") &&
          !d.imageUrl
      );

      if (toGenerate.length === 0) return;

      isGeneratingRef.current = true;

      for (const dish of toGenerate) {
        try {
          await api.post(
            `/generate-dish-image/${dish.dishId}`
          );

          await fetchDishes();

          // ⏱️ Replicate free-tier safety
          await new Promise(res => setTimeout(res, 11000));
        } catch (err: any) {
          if (err?.response?.status === 429) {
            console.warn("⛔ Rate limit hit, stopping generation");
            break;
          }
        }
      }

      isGeneratingRef.current = false;
    };

    generateSequentially();
  }, [dishes]);



  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Menu</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {dishes.map(dish => (
          <DishCard key={dish.dishId} dish={dish} />
        ))}
      </div>
    </div>
  );
}
