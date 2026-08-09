import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';
import Header from '@/components/Header';
import TabNav from '@/components/TabNav';
import WelcomeModal from '@/components/WelcomeModal';
import AddModal from '@/components/AddModal';

export const metadata: Metadata = {
  title: 'Subfolio — 디지털 구독료 트래커',
  description: '넷플릭스부터 AI 구독까지, 매달 나가는 구독료와 갱신 일정을 한눈에.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* TODO: 배포 후 next/font/google로 전환하면 폰트 셀프호스팅 최적화 가능 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <StoreProvider>
            <div className="phone">
              <Header />
              {children}
              <TabNav />
              <WelcomeModal />
              <AddModal />
            </div>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
