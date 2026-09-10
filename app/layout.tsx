import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'M2MFly - Crash Game Simulator',
  description: 'Simulador de Crash Game M2MFly com física de voo, Provably Fair, gradiente azul e botão unificado de aposta e retirada.',
  openGraph: {
    title: 'M2MFly - Crash Game Simulator',
    description: 'Simulador de Crash Game M2MFly com física de voo, Provably Fair, gradiente azul e botão unificado de aposta e retirada.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'M2MFly - Crash Game Simulator',
    description: 'Simulador de Crash Game M2MFly com física de voo, Provably Fair, gradiente azul e botão unificado de aposta e retirada.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className="dark">
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
