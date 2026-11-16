import "@/index.css";

export const metadata = {
  title: "BDPAMKE Attendance",
  description: "Attendance management for BDPAMKE class",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
