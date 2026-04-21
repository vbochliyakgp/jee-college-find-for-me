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
    default: "JEE College Cutoff Finder",
    template: "%s · JEE College Find",
  },
  description:
    "Find JEE Main and JEE Advanced cutoff trends in simple tables. Filter by exam, category, quota, institute type, and rank range. Free and easy to use.",
  keywords: [
    "JEE cutoff finder",
    "JEE Main cutoff",
    "JEE Advanced cutoff",
    "IIT NIT IIIT GFTI cutoff",
    "college cutoff by rank",
    "JoSAA cutoff trends",
  ],
  alternates: {
    canonical: "/",
  },
  category: "education",
  applicationName: "JEE College Find",
  openGraph: {
    title: "JEE College Cutoff Finder",
    description:
      "Check JEE cutoffs quickly with clear filters and simple tables. No signup required.",
    url: "/",
    siteName: "JEE College Find",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JEE College Cutoff Finder",
    description: "Search JEE Main and JEE Advanced cutoffs with easy filters. Free, no signup.",
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
