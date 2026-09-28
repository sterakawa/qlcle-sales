import "./globals.css";

export const metadata = {
  title: "QLCLE Sales",
  description: "QLCLE internal sales documents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
