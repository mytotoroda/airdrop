import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// 상수 정의
const AUTH_COOKIE_NAME = 'auth'
const ERROR_MESSAGE = '서버 오류가 발생했습니다.'

// 응답 타입 정의
interface LogoutResponse {
  success: boolean;
  error?: string;
}

/**
 * 로그아웃 처리를 위한 API 핸들러
 * @returns {Promise<NextResponse<LogoutResponse>>} 로그아웃 처리 결과
 */
export async function POST(): Promise<NextResponse<LogoutResponse>> {
  try {
    const cookieStore = cookies()
    
    // 쿠키가 존재하는지 확인
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME)
    
    if (authCookie) {
      cookieStore.delete(AUTH_COOKIE_NAME)
    }
    
    return NextResponse.json({ 
      success: true 
    })
    
  } catch (error: unknown) {
    console.error('Logout error:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json(
      { 
        success: false, 
        error: ERROR_MESSAGE 
      },
      { status: 500 }
    )
  }
}