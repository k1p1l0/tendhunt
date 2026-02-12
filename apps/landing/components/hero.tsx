"use client";
import React, { useEffect, useState } from "react";
import { Container } from "./container";
import { Heading } from "./heading";
import { SubHeading } from "./subheading";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "./button";
import { Badge } from "./badge";
import { HeroImage } from "./hero-image";
import Link from "next/link";

const EASE_OUT_QUINT = [0.23, 1, 0.32, 1] as const;

export const Hero = () => {
  const shouldReduceMotion = useReducedMotion();
  const [skipIntro, setSkipIntro] = useState(true); // default true to avoid flash

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem("hasSeenHeroIntro");
    if (hasSeenIntro) {
      setSkipIntro(true);
    } else {
      setSkipIntro(false);
      sessionStorage.setItem("hasSeenHeroIntro", "true");
    }
  }, []);

  const noAnim = shouldReduceMotion || skipIntro;

  const initial = (i: number) =>
    noAnim ? false : { opacity: 0, y: 20 };

  const animate = { opacity: 1, y: 0 };

  const transition = (i: number) => ({
    duration: 0.6,
    delay: 0.1 + i * 0.12,
    ease: EASE_OUT_QUINT,
  });

  return (
    <Container className="border-divide relative flex min-h-[560px] flex-col border-x px-4 pt-10 pb-10 md:min-h-[640px] md:pt-32 md:pb-20">
      {/* Map background — sits behind the text */}
      <HeroImage />

      {/* Content — left-aligned, z-10 over the map */}
      <div className="relative z-10 flex max-w-xl flex-col items-start">
        <motion.div
          initial={initial(0)}
          animate={animate}
          transition={transition(0)}
        >
          <Badge text="UK Procurement Intelligence Platform" />
        </motion.div>

        <motion.div
          initial={initial(1)}
          animate={animate}
          transition={transition(1)}
        >
          <Heading className="mt-4 text-left lg:text-5xl">
            The only platform built for{" "}
            UK public sector sales —{" "}
            <span className="text-brand">from signal to close</span>
          </Heading>
        </motion.div>

        <motion.div
          initial={initial(2)}
          animate={animate}
          transition={transition(2)}
        >
          <SubHeading className="mt-6 max-w-lg text-left">
            Find government contracts before your competitors, reveal buyer
            contacts, and track procurement signals in one platform.
          </SubHeading>
        </motion.div>

        <motion.div
          className="mt-6 flex items-center gap-4"
          initial={initial(3)}
          animate={animate}
          transition={transition(3)}
        >
          <Button as={Link} href="#waitlist">
            Book a Demo
          </Button>
          <Button variant="secondary" as={Link} href="#how-it-works">
            See How It Works
          </Button>
        </motion.div>

        <div className="mt-6 flex items-center gap-6">
          {["Free to start", "No credit card", "10 free credits"].map(
            (text, index) => (
              <motion.div
                key={index}
                initial={noAnim ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: noAnim ? 0 : 0.55 + index * 0.1,
                  ease: EASE_OUT_QUINT,
                }}
                className="flex items-center gap-1.5"
              >
                <svg
                  className="size-4 shrink-0 text-brand"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs text-gray-600 sm:text-sm">
                  {text}
                </span>
              </motion.div>
            ),
          )}
        </div>
      </div>
    </Container>
  );
};
