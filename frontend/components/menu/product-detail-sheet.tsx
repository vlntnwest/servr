"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";
import type { Product, OptionGroup, OptionChoice } from "@/types/api";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
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
    0,
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
    checked: boolean,
  ) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id] ?? [];
      if (checked) {
        if (current.length >= group.maxQuantity) return prev;
        return { ...prev, [group.id]: [...current, choice.id] };
      } else {
        return {
          ...prev,
          [group.id]: current.filter((id) => id !== choice.id),
        };
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
        return {
          optionGroupId: group.id,
          optionGroupName: group.name,
          choices,
        };
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
    <ResponsiveModal open={open} onOpenChange={(v) => !v && onClose()}>
      <ResponsiveModalContent
        hideCloseButton
        mobileClassName="h-[90dvh] rounded-t-2xl overflow-hidden flex flex-col"
        desktopClassName="max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl"
        className="p-0"
      >
        <div className="flex-1 overflow-y-auto">
          {product.imageUrl ? (
            <div className="relative w-full aspect-[4/3]">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 576px"
                className="object-cover"
              />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-brand-ink/70 backdrop-blur-sm text-brand-cream hover:bg-brand-ink transition-colors hover:cursor-pointer"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between px-5 pt-5 gap-4">
              <ResponsiveModalTitle className="font-display-italic italic font-black text-[28px] leading-none text-brand-ink">
                {product.name}
              </ResponsiveModalTitle>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-brand-border hover:bg-brand-ink/5 transition-colors shrink-0 hover:cursor-pointer"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="px-5 pt-5 pb-4">
            {product.imageUrl && (
              <ResponsiveModalTitle className="font-display-italic italic font-black text-[32px] leading-none text-brand-ink">
                {product.name}
              </ResponsiveModalTitle>
            )}
            {product.description && (
              <p className="text-body text-brand-stone mt-3 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {product.optionGroups.map((group) => (
            <div key={group.id} className="px-5 pb-4">
              <Separator className="mb-5 bg-brand-border" />
              <div className="mb-3">
                <h4 className="font-display text-principle tracking-tight text-brand-ink">
                  {group.name}
                </h4>
                <p className="text-caption uppercase tracking-label text-brand-stone font-medium mt-1">
                  {group.isRequired
                    ? "Obligatoire"
                    : group.maxQuantity > 1
                      ? `Optionnel · Max ${group.maxQuantity}`
                      : "Optionnel"}
                </p>
              </div>

              {!group.hasMultiple ? (
                <RadioGroup
                  value={(selectedOptions[group.id] ?? [])[0] ?? ""}
                  onValueChange={(val) => handleRadioChange(group.id, val)}
                  className="gap-0"
                >
                  {group.optionChoices.map((choice) => (
                    <div
                      key={choice.id}
                      className="flex items-center py-1.5 px-2 hover:cursor-pointer hover:bg-brand-ink/[0.03] transition-colors rounded-full cursor-pointer"
                    >
                      <Label
                        htmlFor={choice.id}
                        className="flex-1 cursor-pointer font-semibold text-body py-1"
                      >
                        {choice.name}
                      </Label>
                      {parseFloat(choice.priceModifier) > 0 && (
                        <span className="text-body-sm text-brand-stone">
                          +{formatEuros(parseFloat(choice.priceModifier))}
                        </span>
                      )}
                      <RadioGroupItem
                        value={choice.id}
                        id={choice.id}
                        className="m-2 border-2"
                      />
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div>
                  {group.optionChoices.map((choice) => {
                    const isChecked = (
                      selectedOptions[group.id] ?? []
                    ).includes(choice.id);
                    const isDisabled =
                      !isChecked &&
                      (selectedOptions[group.id] ?? []).length >=
                        group.maxQuantity;
                    return (
                      <div
                        key={choice.id}
                        className="flex items-center py-1.5 px-2 hover:cursor-pointer hover:bg-brand-ink/[0.03] transition-colors rounded-full cursor-pointer"
                      >
                        <Label
                          htmlFor={choice.id}
                          className="flex-1 cursor-pointer font-semibold text-body py-1"
                        >
                          {choice.name}
                        </Label>
                        {parseFloat(choice.priceModifier) > 0 && (
                          <span className="text-body-sm text-brand-stone">
                            +{formatEuros(parseFloat(choice.priceModifier))}
                          </span>
                        )}
                        <Checkbox
                          id={choice.id}
                          checked={isChecked}
                          disabled={isDisabled}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(group, choice, !!checked)
                          }
                          className="m-2 border-2"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-card">
          <div className="flex flex-col items-center gap-4 mb-3 w-full">
            <div className="flex items-center justify-evenly gap-3 w-full">
              <button
                className="p-0 hover:bg-foreground/5 transition-colors disabled:opacity-40 border-2 border-primary rounded-full cursor-pointer disabled:cursor-not-allowed"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Diminuer la quantité"
              >
                <Minus className="w-4 h-4 text-primary" strokeWidth={3} />
              </button>
              <span className="w-8 text-center">{quantity}</span>
              <button
                className="p-0 hover:bg-foreground/5 transition-colors border-2 border-primary rounded-full cursor-pointer"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Augmenter la quantité"
              >
                <Plus className="w-4 h-4 text-primary" strokeWidth={3} />
              </button>
            </div>
            <Button
              className="h-12 w-full uppercase rounded-full hover:cursor-pointer active:scale-95 transition-transform"
              disabled={!isValid}
              onClick={handleAddToCart}
            >
              Ajouter · {formatEuros(totalPrice)}
            </Button>
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
