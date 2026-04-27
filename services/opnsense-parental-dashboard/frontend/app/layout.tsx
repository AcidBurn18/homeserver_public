import "./globals.css";

export const metadata = {
  title: "OPNsense Parental Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

