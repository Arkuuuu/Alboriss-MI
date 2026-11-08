import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medical Insurance",
  description: "Medical Insurance Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#b0d2ce] select-none text-black">
        {children}
      </body>
    </html>
  );
}

