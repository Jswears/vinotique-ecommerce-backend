import { z } from "zod";
import { WineCategoryEnum } from "../../types";
import { isValidUrl } from "./urlValidator";

// ---- Zod Schema for Validation: createWine ----
export const wineSchema = z.object({
  productName: z.string().min(2, "Product name must be at least 2 characters"),
  producer: z.string().min(2, "Producer must be at least 2 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  category: z.nativeEnum(WineCategoryEnum, { message: "Invalid category" }),
  region: z.string().min(2, "Region must be at least 2 characters"),
  country: z.string().min(2, "Country must be at least 2 characters"),
  grapeVarietal: z.array(z.string()).optional(),
  vintage: z.number().min(1900, "Vintage must be from 1900 onwards"),
  alcoholContent: z
    .number()
    .min(0, "Alcohol content cannot be negative")
    .optional(),
  sizeMl: z.number().min(1, "Bottle size must be greater than 0").optional(),
  price: z.number().min(0.01, "Price must be greater than 0"),
  stockQuantity: z.number().min(0, "Stock quantity cannot be negative"),
  isInStock: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  imageUrl: z.string().refine((url) => isValidUrl(url), {
    message: "Invalid image URL format",
  }),
  rating: z
    .number()
    .min(0, "Rating cannot be negative")
    .max(5, "Rating must be 5 or below")
    .optional(),
  reviewCount: z.number().min(0, "Review count cannot be negative").optional(),
});

export type CreateWineInput = z.infer<typeof wineSchema>;
