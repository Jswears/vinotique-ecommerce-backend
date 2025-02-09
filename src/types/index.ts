// Core types

// Type definitions
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
  imageUrl: string;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export enum WineCategoryEnum {
  Red = "Red",
  White = "White",
  Rose = "Rose",
  Sparkling = "Sparkling",
  Dessert = "Dessert",
  Fortified = "Fortified",
}
