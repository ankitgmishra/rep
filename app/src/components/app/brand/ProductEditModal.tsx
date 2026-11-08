"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateProduct } from "@/lib/actions/brands";
import type { Database, Json } from "@/lib/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface ProductEditModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedProduct: Product) => void;
}

export function ProductEditModal({
  product,
  isOpen,
  onClose,
  onSaved,
}: ProductEditModalProps) {
  const [title, setTitle] = useState(product.title || "");
  const [priceFormatted, setPriceFormatted] = useState(
    product.price_formatted || (product.price ? `$${Number(product.price).toFixed(2)}` : "")
  );
  const [category, setCategory] = useState(product.category || "");
  const [description, setDescription] = useState(product.description || "");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Product title is required.");
      return;
    }

    setIsLoading(true);

    try {
      // Parse numeric price from formatted text if possible
      const cleanNum = parseFloat(priceFormatted.replace(/[^0-9.]/g, ""));
      const priceVal = !isNaN(cleanNum) ? cleanNum : product.price;

      const existingUserEdits = (product.user_edits as Record<string, unknown>) || {};
      const newUserEdits: Record<string, unknown> = {
        ...existingUserEdits,
        title: {
          original: product.title,
          updated: title.trim(),
          edited_at: new Date().toISOString(),
        },
        price_formatted: {
          original: product.price_formatted,
          updated: priceFormatted.trim(),
          edited_at: new Date().toISOString(),
        },
        category: {
          original: product.category,
          updated: category.trim(),
          edited_at: new Date().toISOString(),
        },
        description: {
          original: product.description,
          updated: description.trim(),
          edited_at: new Date().toISOString(),
        },
      };

      const result = await updateProduct({
        productId: product.id,
        title: title.trim(),
        description: description.trim(),
        price: priceVal || undefined,
        priceFormatted: priceFormatted.trim() || undefined,
        category: category.trim() || undefined,
        userEdits: newUserEdits,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to update product details.");
        setIsLoading(false);
        return;
      }

      onSaved({
        ...product,
        title: title.trim(),
        description: description.trim(),
        price: priceVal,
        price_formatted: priceFormatted.trim() || null,
        category: category.trim() || null,
        user_edits: newUserEdits as unknown as Json,
        updated_at: new Date().toISOString(),
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error saving product.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
      <div className="relative w-full max-w-xl border-2 border-neutral-950 bg-white p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-neutral-400">
              CATALOG CORRECTION • SKU {product.id.slice(0, 8)}
            </div>
            <h2 className="font-serif-title text-xl font-bold text-neutral-950 mt-1">
              Edit Product Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-950 font-bold px-2 py-1 border border-neutral-200"
          >
            [ ESC / CLOSE ]
          </button>
        </div>

        {/* Display Real Image Preview with Source Protection Notice */}
        <div className="flex items-center gap-4 p-3 border border-neutral-200 bg-neutral-50">
          <div className="h-16 w-16 bg-white border border-neutral-300 shrink-0 overflow-hidden flex items-center justify-center">
            {product.main_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.main_image_url}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[9px] text-neutral-400">No Image</span>
            )}
          </div>
          <div className="space-y-1">
            <span className="text-[9px] text-green-800 font-bold uppercase tracking-wider block">
              [ REAL STORE PHOTOGRAPHY PRESERVED ]
            </span>
            <p className="text-[11px] text-neutral-600 font-sans">
              Original product image will be used as the anchor layer for advertising composition.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="border border-red-300 bg-red-50 p-3 text-red-900">
            [ ERROR ]: {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Product Title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Price"
              type="text"
              value={priceFormatted}
              onChange={(e) => setPriceFormatted(e.target.value)}
              placeholder="$48.00"
            />
            <Input
              label="Category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Serums, Footwear..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700">
              Product Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-neutral-300 p-2.5 text-xs text-neutral-950 font-sans focus:outline-none focus:border-neutral-950"
              placeholder="Key product specifications, clinical dew benefits, or ingredients..."
            />
          </div>

          <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400">
              * Original data preserved. Product marked as [ USER EDITED ].
            </span>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isLoading}
              >
                Save SKU Edits
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
