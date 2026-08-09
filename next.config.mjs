/** @type {import('next').NextConfig} */
const nextConfig = {
  // Firebase Hosting 정적 배포용. 서버 기능(API Route 등) 도입 시 제거하고
  // Cloud Functions 연동 또는 다른 호스팅으로 전환할 것.
  output: 'export',
};
export default nextConfig;
