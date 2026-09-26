"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";

export function LionIntro({
  target,
  onDone,
}: {
  target: RefObject<HTMLElement | null>;
  onDone: () => void;
}) {
  const backdrop = useRef<HTMLDivElement>(null);
  const lion = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const node = lion.current;
    const layer = backdrop.current;
    const slot = target.current;
    if (reduced || !node || !layer || !slot) {
      onDone();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let cancelled = false;

    const ctx = gsap.context(() => {
      gsap.set(node, {
        transformPerspective: 1400,
        transformOrigin: "50% 50%",
        scale: 0.92,
        rotationX: 8,
        opacity: 0,
      });

      const timeline = gsap.timeline({ defaults: { ease: "sine.inOut" } });
      timeline
        .to(node, { opacity: 1, scale: 1, rotationX: 0, duration: 0.7, ease: "sine.out" })
        .to(node, { scale: 1.07, rotationX: -3, duration: 0.72 })
        .to(node, { scale: 0.95, rotationX: 4, duration: 0.72 })
        .to(node, { scale: 1.05, rotationX: -2, duration: 0.68 })
        .to(node, { scale: 1, rotationX: 0, duration: 0.55 })
        .add(() => {
          const from = node.getBoundingClientRect();
          const mark = slot.querySelector("img") ?? slot;
          const to = mark.getBoundingClientRect();
          if (from.width < 1 || to.width < 1) {
            onDone();
            return;
          }
          const currentScale = Number(gsap.getProperty(node, "scale")) || 1;
          const dx = to.left + to.width / 2 - (from.left + from.width / 2);
          const dy = to.top + to.height / 2 - (from.top + from.height / 2);
          const travel = gsap.timeline({
            onComplete: () => {
              if (!cancelled) onDone();
            },
          });
          travel.to(node, {
            x: dx,
            y: dy,
            scale: currentScale * (to.width / from.width),
            rotationX: 0,
            duration: 0.95,
            ease: "sine.inOut",
          });
          travel.to(layer, { opacity: 0, duration: 0.7, ease: "sine.out" }, "-=0.5");
        });
    });

    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
      ctx.revert();
    };
  }, [onDone, target]);

  return (
    <div className="fixed inset-0 z-50" aria-hidden>
      <div ref={backdrop} className="absolute inset-0 bg-ink" />
      <div className="relative grid h-full place-items-center">
        <img
          ref={lion}
          src="/lion.webp"
          alt=""
          className="w-[min(78vw,440px)] max-w-none"
        />
      </div>
    </div>
  );
}
