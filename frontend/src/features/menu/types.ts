export interface Addon {
    name: string;
    price: number;
}

export interface Variant {
    variantType?: string;
    label: string;
    price: number;
}

export interface Dish {
    dishId: string;
    requestId: string;
    name: string;
    price: number | null;
    weight: string | null;
    description: string | null;
    imageUrl: string | null;
    imageStatus?: string;
    generationCount?: number;
    pendingImageFile?: File;
    previewUrl?: string;
    variants: Variant[];
    addons: Addon[];
}

export interface Category {
    categoryId: string;
    categoryName: string;
    dishCount?: number;
    isPublished?: boolean;
}

export interface OutletData {
    storeName: string;
    logoUrl: string | null;
    currency?: string;
}
