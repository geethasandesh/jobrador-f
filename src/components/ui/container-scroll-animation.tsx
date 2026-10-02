"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

export function AppContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full overflow-hidden rounded-[30px] ${className}`}>
      {children}
    </div>
  );
}

export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent: ReactNode;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const eased = useTransform(scrollYProgress, (value) => 1 - (1 - value) ** 3);
  const rotate = useTransform(eased, [0, 1], isMobile ? [32, 0] : [26, 0]);
  const scale = useTransform(eased, [0, 1], isMobile ? [0.86, 1] : [0.92, 1]);
  const textY = useTransform(eased, (value) => `calc(-50% - ${value * 55}vh)`);
  const lift = useRef(420);
  const cardY = useTransform(eased, (value) => -lift.current * value);
  const [startTop, setStartTop] = useState(640);

  useEffect(() => {
    const measure = () => {
      const cardHeight = (isMobile ? 32 : 38) * 16;
      const headerHeight = 72;
      const visible = cardHeight * 0.3;
      const top = window.innerHeight - visible - headerHeight;
      const endTop = Math.max(96, Math.min(top, (window.innerHeight - cardHeight) / 2));
      lift.current = top - endTop;
      setStartTop(top);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isMobile]);

  return (
    <div ref={containerRef} className="relative h-[210vh]">
      <div className="sticky top-0 h-dvh overflow-hidden">
        <div className="relative h-full w-full" style={{ perspective: "1200px" }}>
          <Header translate={textY} titleComponent={titleComponent} />
          <Card rotate={rotate} scale={scale} y={cardY} startTop={startTop}>
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Header({
  translate,
  titleComponent,
}: {
  translate: MotionValue<string>;
  titleComponent: ReactNode;
}) {
  return (
    <motion.div style={{ y: translate }} className="absolute inset-x-0 top-[calc(50dvh-4.5rem)] z-20 mx-auto max-w-5xl px-4 text-center">
      {titleComponent}
    </motion.div>
  );
}

function Card({
  rotate,
  scale,
  y,
  startTop,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  y: MotionValue<number>;
  startTop: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      style={{ rotateX: rotate, scale, y, top: startTop, x: "-50%", transformOrigin: "center top" }}
      className="absolute left-1/2 h-[32rem] w-[92%] max-w-5xl rounded-[2.2rem] bg-black p-3 shadow-[0_40px_80px_rgba(0,0,0,0.28)] md:h-[38rem] md:rounded-[2.6rem] md:p-4"
    >
      <div className="h-full w-full overflow-hidden rounded-[1.45rem] bg-white md:rounded-[1.7rem]">{children}</div>
    </motion.div>
  );
}
