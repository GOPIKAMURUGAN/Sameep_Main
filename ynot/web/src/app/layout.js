import "../styles/globals.css";

export const metadata = {
  title: "YNOT - Get Your Business Online",
  description: "Public onboarding funnel for YNOT business setup.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
