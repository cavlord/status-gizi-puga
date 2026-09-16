import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Stagger-fade children of a container on mount.
 * Respects prefers-reduced-motion — skips animation and shows final state immediately.
 * Spec: Subtle tier — y:8, duration:0.3, stagger:0.06, power1.out
 */
export function useStaggerReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;

      gsap.from(children, {
        opacity: 0,
        y: 8,
        duration: 0.3,
        stagger: 0.06,
        ease: "power1.out",
        clearProps: "all",
      });
    });

    // Under reduced-motion: ensure elements are fully visible immediately
    mm.add("(prefers-reduced-motion: reduce)", () => {
      const children = Array.from(el.children) as HTMLElement[];
      gsap.set(children, { opacity: 1, y: 0 });
    });

    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/**
 * Scroll-triggered fade reveal for a single element.
 * Respects prefers-reduced-motion.
 * Spec: Subtle tier — y:12, duration:0.35, power1.out, start:'top 90%'
 */
export function useScrollReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(el, {
        opacity: 0,
        y: 12,
        duration: 0.35,
        ease: "power1.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none reverse",
        },
        clearProps: "all",
      });
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(el, { opacity: 1, y: 0 });
    });

    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
