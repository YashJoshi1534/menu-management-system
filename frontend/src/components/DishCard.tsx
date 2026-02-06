import type { Dish } from "../Pages/StorePage";

interface Props {
  dish: Dish;
}

export default function DishCard({ dish }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="h-40 w-full bg-gray-200 rounded mb-3 overflow-hidden">
        {dish.imageUrl ? (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">
            {dish.imageStatus === "generating"
              ? "Generating image..."
              : dish.imageStatus === "failed"
              ? "Image unavailable"
              : "Image pending"}
          </div>
        )}
      </div>

      <h3 className="font-semibold text-lg">{dish.name}</h3>

      {dish.price && (
        <p className="text-sm text-gray-600">₹{dish.price}</p>
      )}
    </div>
  );
}
