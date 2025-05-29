import { useAnimation, useInView } from "framer-motion";
import { useEffect } from "react";

export function useFadeInOnScroll(ref, options = { once: false }) {
  const controls = useAnimation();
  const isInView = useInView(ref, options);

  useEffect(() => {
    if (isInView) {
      controls.start({ opacity: 1, y: 0 });
    }
  }, [isInView, controls]);

  return controls;
}