import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// 상수 정의
const PROTECTED_PATHS = [
  '/meme-coins',
  '/airdrops',
  '/users',
  '/admin'
] as const;

// 분석에서 제외할 경로
const EXCLUDED_FROM_ANALYTICS = [
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/static/',
  '/images/',
  '/assets/',
  '/robots.txt',
  '/manifest.json',
  '/public/'
];

// 봇 패턴
const BOT_PATTERNS = [
  'bot', 'crawler', 'spider', 'ping', 'slurp',
  'lighthouse', 'pagespeed', 'googlebot'
];

// 타입 정의
type ProtectedPath = typeof PROTECTED_PATHS[number];
interface MiddlewareConfig {
  matcher: string[];
}

/**
 * 보호된 경로인지 확인하는 함수
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(path => pathname.startsWith(path));
}

/**
 * 분석 제외 경로인지 확인하는 함수
 */
function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_FROM_ANALYTICS.some(path => pathname.startsWith(path));
}

/**
 * 페이지 방문 기록 함수
 */
async function recordPageVisit(request: NextRequest, pathname: string) {
  try {
    // 봇 체크
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
    if (BOT_PATTERNS.some(pattern => userAgent.includes(pattern))) {
      return;
    }

    const visitorIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const referer = request.headers.get('referer') || '';

    // API 엔드포인트 호출
    await fetch(`${request.nextUrl.origin}/api/analytics/page-visit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pagePath: pathname,
        visitorIp,
        userAgent,
        referer,
      }),
    });
  } catch (error) {
    console.error('Failed to record page visit:', error);
  }
}

/**
 * 미들웨어 핸들러
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  try {
    // 현재 요청의 URL 정보 가져오기
    const { pathname } = request.nextUrl;
    
    // 인증 쿠키 확인
    const authCookie = request.cookies.get('auth');
    
    // API 경로는 제외 (API 라우트는 별도의 인증 처리)
    if (pathname.startsWith('/api')) {
      return NextResponse.next();
    }

    // public 폴더의 정적 파일 요청은 제외
    if (pathname.startsWith('/public/')) {
      return NextResponse.next();
    }
    
    // 로그인이 필요한 페이지 체크
    if (isProtectedPath(pathname)) {
      // 인증되지 않은 경우
      if (!authCookie?.value || authCookie.value !== 'authenticated') {
        const url = new URL('/login', request.url);
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
      }
    }
    
    // 이미 로그인한 사용자가 로그인 페이지에 접근하는 경우
    if (pathname === '/login' && authCookie?.value === 'authenticated') {
      const from = request.nextUrl.searchParams.get('from');
      const safeRedirectPath = from && isProtectedPath(from) ? from : '/';
      return NextResponse.redirect(new URL(safeRedirectPath, request.url));
    }

    // 페이지 방문 기록 (분석 제외 경로가 아닌 경우에만)
    if (!isExcludedPath(pathname)) {
      await recordPageVisit(request, pathname);
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

/**
 * 미들웨어가 실행될 경로 설정
 */
export const config: MiddlewareConfig = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};