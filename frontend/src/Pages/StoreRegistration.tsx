import React, { useState } from "react";
import axios from "axios";
import { FiUser, FiMapPin, FiMail, FiUploadCloud } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface FormState {
  name: string;
  address: string;
  email: string;
}

export default function StoreRegistration () {
  const [formData, setFormData] = useState<FormState>({
    name: "",
    address: "",
    email: "",
  });

  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = new FormData();
    payload.append("storeName", formData.name);
    payload.append("address", formData.address);
    payload.append("email", formData.email);
  
    images.forEach((file) => payload.append("images", file));

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/create-store-ai",
        payload
      );
      toast.success("Store registered successfully 🎉");
      console.log("Store URL:", res.data);
      // ⏳ small delay so user sees toast
      setTimeout(() => {
        navigate(res.data.storeUrl);
      }, 1200);
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
        "Store registration failed ❌"
      );
    }


    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center items-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-6">
          <h2 className="text-2xl font-bold">Store Registration</h2>
          <p className="text-sm opacity-90 mt-1">
            Upload your menu & let AI do the rest 🚀
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Store Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">Store Name</label>
            <div className="mt-1 relative">
              <FiUser className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                name="name"
                placeholder="Apna Restaurant"
                onChange={handleChange}
                required
                className="pl-10 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <div className="mt-1 relative">
              <FiMapPin className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                name="address"
                placeholder="Ahmedabad, Gujarat"
                onChange={handleChange}
                required
                className="pl-10 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1 relative">
              <FiMail className="absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                name="email"
                placeholder="owner@email.com"
                onChange={handleChange}
                required
                className="pl-10 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Upload Menu Images
            </label>

            <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-lg p-5 cursor-pointer hover:bg-blue-50 transition">
              <FiUploadCloud className="text-3xl text-blue-600 mb-2" />
              <span className="text-sm text-gray-600">
                Click to upload or drag & drop
              </span>
              <span className="text-xs text-gray-400 mt-1">
                JPG, PNG, WebP
              </span>

              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {images.length > 0 && (
              <p className="text-xs text-green-600 mt-2">
                {images.length} image(s) selected
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? "Processing..." : "Register Store"}
          </button>
        </div>
      </form>
    </div>
  );
}
