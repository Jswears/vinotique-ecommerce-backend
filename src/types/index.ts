// Core types

enum WineTypeEnum {
  Red = "Red",
  White = "White",
  Rose = "Rose",
  Sparkling = "Sparkling",
  Dessert = "Dessert",
  Fortified = "Fortified",
}

interface WineProduct {
  PK: string;
  SK: string;
  wineId: string;
  type: string;
  productName: string;
  description: string;
  categoryId: string;
  region: string;
  country: string;
  grapeVarietal: string[];
  vintage: number;
  alcoholContent: number;
  sizeMl: number;
  price: number;
  stockQuantity: number;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  rating: number;
  reviewCount: number;
}
