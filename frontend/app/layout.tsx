import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
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
    "JEE college predictor for JEE Main and JEE Advanced. Compare likely colleges and branches using rank, category, gender, and quota filters.",
  keywords: [
    "JEE college predictor",
    "JoSAA predictor",
    "JEE Main college predictor",
    "JEE Advanced college predictor",
    "NIT predictor",
    "IIIT predictor",
    "IIT predictor",
  ],
  alternates: {
    canonical: "/",
  },
  category: "education",
  applicationName: "JEE College Find",
  openGraph: {
    title: "JEE College Find",
    description:
      "Predict colleges from your JEE rank with category, gender, and quota-aware filtering.",
    url: "/",
    siteName: "JEE College Find",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JEE College Find",
    description: "Predict colleges from your JEE rank with category, gender, and quota-aware filtering.",
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
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
