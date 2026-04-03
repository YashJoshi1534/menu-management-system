import { FiHome } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center w-fit mb-8 animate-in fade-in slide-in-from-left-4 duration-700">
      <div className="flex items-center bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/60 shadow-lg shadow-gray-200/40 select-none">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors font-bold text-sm"
        >
          <FiHome size={14} className="mb-0.5" />
          Dashboard
        </button>

        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            <span className="mx-3 text-slate-300 font-medium">/</span>
            {item.path ? (
              <button
                onClick={() => navigate(item.path!)}
                className="text-slate-400 hover:text-blue-600 transition-colors font-bold text-sm"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-slate-900 font-bold text-sm tracking-tight">
                {item.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
