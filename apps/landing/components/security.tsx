"use client";

import React from "react";
import { Container } from "./container";
import { DivideX } from "./divide";
import { SectionHeading } from "./seciton-heading";
import { SubHeading } from "./subheading";
import { Button } from "./button";
import { AnimateInView } from "./animate-in-view";

import Link from "next/link";

export const Security = () => {
  return (
    <>
      <Container className="border-divide border-x">
        <h2 className="pt-10 pb-5 text-center font-mono text-sm tracking-tight text-neutral-500 uppercase md:pt-20 md:pb-10 dark:text-neutral-400">
          DATA YOU CAN TRUST
        </h2>
      </Container>
      <DivideX />
      <Container className="border-divide grid grid-cols-1 border-x bg-gray-100 px-8 py-12 md:grid-cols-2 dark:bg-neutral-900">
        <AnimateInView>
          <div>
            <SectionHeading className="text-left">
              Built for Trust
            </SectionHeading>
            <SubHeading as="p" className="mt-4 text-left">
              TendHunt is fully GDPR compliant and adheres to UK data protection
              standards. All data is sourced from public procurement records and
              served through Cloudflare-secured infrastructure.
            </SubHeading>
            <Button
              className="mt-4 mb-8 inline-block w-full md:w-auto"
              as={Link}
              href="#waitlist"
            >
              Get Early Access
            </Button>
          </div>
        </AnimateInView>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {[
            "GDPR Compliant",
            "UK GDPR",
            "Cloudflare Secured",
            "ISO 27001 (Coming Soon)",
          ].map((badge, index) => (
            <AnimateInView
              key={badge}
              delay={index * 0.08}
              y={10}
              scale={0.96}
            >
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <svg
                  className="size-4 shrink-0 text-brand"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {badge}
              </div>
            </AnimateInView>
          ))}
        </div>
      </Container>
    </>
  );
};
