import type { Metadata } from "next";
import { Albert_Sans } from "next/font/google";
import { Suspense } from "react";

import { BagLink, CartBagLink } from "@/components/cart-bag-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { navigation } from "@/lib/sample-data";
import "./globals.css";

// Single geometric sans for the whole UI; weights 100–700 carry hierarchy.
const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Atelier", template: "%s | Atelier" },
  description: "Atelier store",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${albertSans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50">
          Skip to content
        </a>
        <p className="bg-ink py-2 text-center text-micro font-medium uppercase tracking-control text-paper">
          Complimentary shipping and returns on all orders
        </p>
        <SiteHeader
          navigation={navigation}
          bag={
            <Suspense fallback={<BagLink count={0} />}>
              <CartBagLink />
            </Suspense>
          }
        />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
