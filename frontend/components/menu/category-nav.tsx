"use client";

import { useEffect, useRef, useState } from "react";
import type { Category } from "@/types/api";
import { cn } from "@/lib/utils";

interface CategoryNavProps {
  categories: Category[];
}

export default function CategoryNav({ categories }: CategoryNavProps) {
  const [activeId, setActiveId] = useState<string>("");
  const navRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // IntersectionObserver to track which category is visible
  useEffect(() => {
    const ids = categories.map((c) => c.id);
    const elements = ids
      .map((id) => document.getElementById(`cat-${id}`))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.id.replace("cat-", "");
          setActiveId(id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  // Auto-scroll the nav bar to keep the active button visible
  useEffect(() => {
    if (!activeId) return;
    const btn = btnRefs.current.get(activeId);
    if (btn && navRef.current) {
      btn.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeId]);

  const handleClick = (id: string) => {
    const el = document.getElementById(`cat-${id}`);
    if (el) {
      const offset = 65 + (stickyRef.current?.offsetHeight ?? 0);
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveId(id);
    }
  };

  const visibleCategories = categories.filter((cat) =>
    cat.productCategories.some((pc) => pc.product.isAvailable),
  );

  if (visibleCategories.length === 0) return null;

  return (
    <div
      ref={stickyRef}
      className="sticky top-[65px] z-30 bg-background border-b border-border"
    >
      <div className="relative">
        <div
          ref={navRef}
          className="max-w-screen-3xl mx-auto flex overflow-x-auto scrollbar-hide gap-1 px-4 md:px-8 xl:px-16 py-6"
        >
          {visibleCategories.map((cat) => (
            <button
              key={cat.id}
              ref={(el) => {
                if (el) btnRefs.current.set(cat.id, el);
              }}
              onClick={() => handleClick(cat.id)}
              className={cn(
                "whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0",
                activeId === cat.id
                  ? "bg-black text-white"
                  : "text-muted-foreground hover:bg-foreground/5",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {/* Right fade indicator */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
