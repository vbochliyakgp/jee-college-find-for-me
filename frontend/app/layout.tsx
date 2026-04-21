import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AppProviders } from "@/components/providers/app-providers"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "JEE College Find",
    template: "%s · JEE College Find",
  },
  description:
    "Search JoSAA-style JEE Main and JEE Advanced cutoffs by institute type, quota, category, and closing-rank bands. No signup.",
  keywords: ["JoSAA cutoffs", "JEE cutoff search", "IIT closing rank", "NIT cutoffs", "JEE Main", "JEE Advanced"],
  alternates: {
    canonical: "/",
  },
  category: "education",
  applicationName: "JEE College Find",
  openGraph: {
    title: "JEE College Find",
    description:
      "JoSAA-style cutoff search. No signup or email required.",
    url: "/",
    siteName: "JEE College Find",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JEE College Find",
    description: "Filter cutoff rows by exam, quota, and rank bands. No signup.",
    creator: "@jeecollegefind",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} min-h-screen font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AppProviders>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </AppProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
