import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// 동적 라우팅 설정 추가
export const dynamic = 'force-dynamic'

// 환경 변수 타입 정의
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ADMIN_USERNAME: string;
      ADMIN_PASSWORD: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// 타입 정의
interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    username: string;
  };
  error?: string;
}

interface LogoutResponse {
  success: boolean;
  error?: string;
}

interface AuthCheckResponse {
  user: {
    username: string;
  } | null;
  error?: string;
}

// 환경 변수 가져오기를 함수 내부로 이동
export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse | LogoutResponse>> {
  const path = request.nextUrl.pathname
  
  if (path.endsWith('/login')) {
    try {
      const { username, password }: LoginRequest = await request.json()
      const adminUsername = process.env.ADMIN_USERNAME
      const adminPassword = process.env.ADMIN_PASSWORD
    
      if (username === adminUsername && password === adminPassword) {
        // 쿠키 스토어 사용
        const cookieStore = cookies()
        cookieStore.set('auth', 'authenticated', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30일
        })
        
        return NextResponse.json({
          success: true,
          user: { username }
        })
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: '아이디 또는 비밀번호가 잘못되었습니다.' 
        },
        { status: 401 }
      )
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          error: '잘못된 요청 형식입니다.' 
        },
        { status: 400 }
      )
    }
  }
  
  if (path.endsWith('/logout')) {
    const cookieStore = cookies()
    cookieStore.delete('auth')
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json(
    { 
      success: false,
      error: '잘못된 요청입니다.' 
    },
    { status: 400 }
  )
}

export async function GET(request: NextRequest): Promise<NextResponse<AuthCheckResponse>> {
  const path = request.nextUrl.pathname
  
  if (path.endsWith('/check')) {
    const cookieStore = cookies()
    const authCookie = cookieStore.get('auth')
    
    if (authCookie?.value === 'authenticated') {
      return NextResponse.json({
        user: { username: process.env.ADMIN_USERNAME || '' }
      })
    }
    
    return NextResponse.json({ user: null })
  }
  
  return NextResponse.json(
    { 
      user: null,
      error: '잘못된 요청입니다.' 
    },
    { status: 400 }
  )
}