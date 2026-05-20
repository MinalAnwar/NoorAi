import { useRef, useEffect } from "react";
import { useMotionValue, useSpring } from "framer-motion";

interface MagneticOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  pullFactor?: number; // How strongly it pulls
}

/**
 * Creates a magnetic attraction effect on hover using Framer Motion variables.
 * Animates outside the standard React render lifecycle to prevent CPU choking.
 */
export function useMagnetic(options: MagneticOptions = {}) {
  const {
    stiffness = 80,
    damping = 15,
    mass = 0.8,
    pullFactor = 0.35,
  } = options;

  const elementRef = useRef<HTMLButtonElement | HTMLDivElement | null>(null);

  // Core motion values (out-of-render variables)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs to damp the movement physical-weight style
  const springConfig = { stiffness, damping, mass };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      
      // Calculate coordinates relative to element center
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Mouse distance from center
      const distanceX = event.clientX - centerX;
      const distanceY = event.clientY - centerY;

      // Check if mouse is hovering within bounding pull box
      // Let's create an active radius of roughly 1.5x the element bounds
      const hoverThresholdX = rect.width * 1.5;
      const hoverThresholdY = rect.height * 1.5;

      if (Math.abs(distanceX) < hoverThresholdX && Math.abs(distanceY) < hoverThresholdY) {
        // Apply magnetic pull
        x.set(distanceX * pullFactor);
        y.set(distanceY * pullFactor);
      } else {
        // Reset to original center coordinates
        x.set(0);
        y.set(0);
      }
    };

    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };

    // Attach listeners globally to trace proximity hover accurately
    window.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (element) {
        element.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [x, y, pullFactor]);

  return {
    ref: elementRef,
    style: {
      x: springX,
      y: springY,
    },
  };
}
