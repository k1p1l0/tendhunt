"use client";

import Script from "next/script";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Mail } from "lucide-react";

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

interface AccountManagerCardProps {
  name: string;
  email: string;
  calendlyUrl: string;
  greeting: string;
}

export function AccountManagerCard({
  name,
  email,
  calendlyUrl,
  greeting,
}: AccountManagerCardProps) {
  return (
    <>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Account Manager</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start gap-4">
          <Avatar size="lg">
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{greeting}</p>
            </div>
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              {email}
            </a>
            <div className="pt-1">
              <Button
                size="sm"
                onClick={() => {
                  window.Calendly?.initPopupWidget({ url: calendlyUrl });
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Book a meeting
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
