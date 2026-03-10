"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import type { Product, OptionGroup, OptionChoice } from "@/types/api";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { formatEuros } from "@/lib/utils";
import { useCart } from "@/contexts/cart-context";
import type { CartItem } from "@/types/api";

interface SelectedOptions {
  [groupId: string]: string[]; // list of selected optionChoiceIds
}

interface ProductDetailSheetProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export default function ProductDetailSheet({
  product,
  open,
  onClose,
}: ProductDetailSheetProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});

  // Reset when sheet opens
  useEffect(() => {
    if (open) {
      setQuantity(1);
      const defaults: SelectedOptions = {};
      product.optionGroups.forEach((group) => {
        defaults[group.id] = [];
      });
      setSelectedOptions(defaults);
    }
  }, [open, product]);

  const basePrice = parseFloat(product.price);

  const optionsTotal = Object.entries(selectedOptions).reduce(
    (total, [groupId, choiceIds]) => {
      const group = product.optionGroups.find((g) => g.id === groupId);
      if (!group) return total;
      return (
        total +
        choiceIds.reduce((sum, cId) => {
          const choice = group.optionChoices.find((c) => c.id === cId);
          return sum + (choice ? parseFloat(choice.priceModifier) : 0);
        }, 0)
      );
    },
    0
  );

  const totalPrice = (basePrice + optionsTotal) * quantity;

  const isValid = product.optionGroups.every((group) => {
    const selected = selectedOptions[group.id] ?? [];
    return !group.isRequired || selected.length >= group.minQuantity;
  });

  const handleRadioChange = (groupId: string, choiceId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [groupId]: [choiceId] }));
  };

  const handleCheckboxChange = (
    group: OptionGroup,
    choice: OptionChoice,
    checked: boolean
  ) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id] ?? [];
      if (checked) {
        if (current.length >= group.maxQuantity) return prev;
        return { ...prev, [group.id]: [...current, choice.id] };
      } else {
        return { ...prev, [group.id]: current.filter((id) => id !== choice.id) };
      }
    });
  };

  const handleAddToCart = () => {
    if (!isValid) return;

    const cartItemSelectedOptions = product.optionGroups
      .map((group) => {
        const choiceIds = selectedOptions[group.id] ?? [];
        const choices = choiceIds.map((id) => {
          const choice = group.optionChoices.find((c) => c.id === id)!;
          return {
            id: choice.id,
            name: choice.name,
            priceModifier: parseFloat(choice.priceModifier),
          };
        });
        return { optionGroupId: group.id, optionGroupName: group.name, choices };
      })
      .filter((g) => g.choices.length > 0);

    const item: CartItem = {
      id: `${product.id}-${Date.now()}-${Math.random()}`,
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePrice,
      selectedOptions: cartItemSelectedOptions,
      quantity,
    };

    addItem(item);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[90dvh] flex flex-col p-0 md:max-w-lg md:mx-auto md:left-1/2 md:-translate-x-1/2 md:inset-y-4 md:rounded-lg md:h-auto md:max-h-[90vh]"
      >
        <div className="flex-1 overflow-y-auto">
          {product.imageUrl && (
            <div className="relative w-full h-48">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="p-4">
            <SheetTitle className="text-xl font-bold">{product.name}</SheetTitle>
            {product.description && (
              <p className="text-[#676767] text-sm mt-1">{product.description}</p>
            )}
            <p className="font-semibold mt-2">{formatEuros(basePrice)}</p>
          </div>

          {product.optionGroups.map((group) => (
            <div key={group.id} className="px-4 pb-4">
              <Separator className="mb-4" />
              <div className="mb-3">
                <h4 className="font-bold text-sm">{group.name}</h4>
                {group.isRequired ? (
                  <p className="text-xs text-[#676767]">Obligatoire</p>
                ) : (
                  <p className="text-xs text-[#676767]">
                    Optionnel
                    {group.maxQuantity > 1 ? ` · max ${group.maxQuantity}` : ""}
                  </p>
                )}
              </div>

              {!group.hasMultiple ? (
                <RadioGroup
                  value={(selectedOptions[group.id] ?? [])[0] ?? ""}
                  onValueChange={(val) => handleRadioChange(group.id, val)}
                >
                  {group.optionChoices.map((choice) => (
                    <div key={choice.id} className="flex items-center gap-3 py-1.5">
                      <RadioGroupItem value={choice.id} id={choice.id} />
                      <Label htmlFor={choice.id} className="flex-1 cursor-pointer font-normal">
                        {choice.name}
                      </Label>
                      {parseFloat(choice.priceModifier) > 0 && (
                        <span className="text-sm text-[#676767]">
                          +{formatEuros(parseFloat(choice.priceModifier))}
                        </span>
                      )}
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-1.5">
                  {group.optionChoices.map((choice) => {
                    const isChecked = (selectedOptions[group.id] ?? []).includes(choice.id);
                    const isDisabled =
                      !isChecked &&
                      (selectedOptions[group.id] ?? []).length >= group.maxQuantity;
                    return (
                      <div key={choice.id} className="flex items-center gap-3 py-1.5">
                        <Checkbox
                          id={choice.id}
                          checked={isChecked}
                          disabled={isDisabled}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(group, choice, !!checked)
                          }
                        />
                        <Label
                          htmlFor={choice.id}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          {choice.name}
                        </Label>
                        {parseFloat(choice.priceModifier) > 0 && (
                          <span className="text-sm text-[#676767]">
                            +{formatEuros(parseFloat(choice.priceModifier))}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-white">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-3 border rounded-sm">
              <button
                className="p-2 hover:bg-black/5 transition-colors disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                className="p-2 hover:bg-black/5 transition-colors"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <Button
              className="flex-1 h-11"
              disabled={!isValid}
              onClick={handleAddToCart}
            >
              Ajouter · {formatEuros(totalPrice)}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
