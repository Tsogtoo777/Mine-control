import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MINE CONTROL | Уурхайн нэгдсэн бүртгэл',
  description: 'Ил уурхайн уулын ажил, үйлдвэрлэл, тээврийн бүртгэл',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="mn"><body>{children}</body></html>;
}
