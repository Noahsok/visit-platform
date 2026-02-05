import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visit Door",
  description: "Member check-in for Visit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
