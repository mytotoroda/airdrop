import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // 추가

// 상수 값들
const AUTH_COOKIE_NAME = 'auth'
const AUTH_COOKIE_VALUE = 'authenticated'
const ERROR_MESSAGE = '서버 오류가 발생했습니다.'

// 환경 변수 타입 정의
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ADMIN_USERNAME: string;
      NODE_ENV: 'development' | 'production' | 'test'; // 추가
    }
  }
}

// 응답 타입 정의
interface AuthCheckResponse {
  success: boolean;
  user: {
    username: string;
  } | null;
  error?: string;
}

// 유틸리티 함수
function createErrorResponse(message: string, status: number = 500): NextResponse<AuthCheckResponse> {
  return NextResponse.json(
    { 
      success: false, 
      user: null,
      error: message 
    },
    { status }
  )
}

function createSuccessResponse(user: AuthCheckResponse['user']): NextResponse<AuthCheckResponse> {
  return NextResponse.json({
    success: true,
    user
  })
}

// 타입 가드
function isAuthenticated(cookieValue: string | undefined): boolean {
  return cookieValue === AUTH_COOKIE_VALUE
}

/**
 * 인증 상태를 확인하는 API 핸들러
 * @returns {Promise<NextResponse<AuthCheckResponse>>} 인증 상태 및 사용자 정보
 */
export async function GET(): Promise<NextResponse<AuthCheckResponse>> {
  try {
    const cookieStore = cookies()
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME)
    
    if (!process.env.ADMIN_USERNAME) {
      console.error('ADMIN_USERNAME environment variable is not set')
      return createErrorResponse('서버 설정 오류가 발생했습니다.')
    }

    if (isAuthenticated(authCookie?.value)) {
      return createSuccessResponse({ 
        username: process.env.ADMIN_USERNAME 
      })
    }

    return createSuccessResponse(null)

  } catch (error) {
    console.error('Auth check error:', error instanceof Error ? error.message : 'Unknown error')
    return createErrorResponse(ERROR_MESSAGE)
  }
}