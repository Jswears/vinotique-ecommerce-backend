// Core types

enum WineTypeEnum {
  Red = "Red",
  White = "White",
  Rose = "Rose",
  Sparkling = "Sparkling",
  Dessert = "Dessert",
  Fortified = "Fortified",
}

export interface Wine {
  PK: string;
  SK: string;
  entityType: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  isAvailable: boolean;
  name: string;
  description: string;
  price: number;
  wineType: WineTypeEnum;
  region: string;
  producer: string;
  year: number;
  stock: number;
  sku: string;
  imageUrl: string;
  createdAt?: string;
  isFeatured: boolean;
}
