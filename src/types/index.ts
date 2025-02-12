// ---- Wine Types ----

export interface WineProduct {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  entityType: string;
  wineId: string;
  productName: string;
  producer: string;
  description: string;
  category: WineCategoryEnum;
  region: string;
  country: string;
  grapeVarietal: string[];
  vintage: number;
  alcoholContent: number;
  sizeMl: number;
  price: number;
  stockQuantity: number;
  isInStock: boolean;
  isFeatured: boolean;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Wine {
  productName: string;
  description: string;
  category: WineCategoryEnum;
  region: string;
  country: string;
  grapeVarietal?: string[];
  vintage: number;
  alcoholContent?: number;
  sizeMl?: number;
  price: number;
  stockQuantity?: number;
  isInStock?: boolean;
  isFeatured?: boolean;
  imageUrl: string;
  createdAt?: string;
  updatedAt?: string;
  rating?: number;
  reviewCount?: number;
}

export enum WineCategoryEnum {
  Red = "Red",
  White = "White",
  Rose = "Rose",
  Sparkling = "Sparkling",
  Dessert = "Dessert",
  Fortified = "Fortified",
}

export interface QueryParams {
  pageSize?: string;
  nextToken?: string;
}

export interface CategoryPathParams {
  category?: string;
}

export interface WinePathParams {
  wineId?: string;
}

export interface WineResponse {
  wines: Wine[];
  totalCount: number;
  nextToken: string | null;
}

// ---- Cart Types ----
export interface CartItem {
  wineId: string;
  quantity: number;
  addedAt: string;
}

export interface CartDocument {
  PK: string;
  SK: string;
  cartId: string;
  cartItems: CartItem[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: number;
}
