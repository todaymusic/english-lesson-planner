/**
 * Supabase 클라이언트 (Lovable Cloud 연결)
 *
 * URL/anon key는 .env에 자동 주입된 VITE_SUPABASE_URL,
 * VITE_SUPABASE_PUBLISHABLE_KEY를 사용합니다.
 * 실제 클라이언트 인스턴스는 src/integrations/supabase/client.ts 에서 생성되며,
 * 여기서는 편의를 위해 그대로 re-export 합니다.
 */
export { supabase } from "@/integrations/supabase/client";

import { supabase } from "@/integrations/supabase/client";

/**
 * 연결 상태 확인용 헬퍼.
 * coupons 테이블에 head 요청을 보내 200 응답이 오면 연결 OK.
 * (실제 데이터 조회 로직은 다음 단계에서 추가)
 */
export async function checkSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    // 테이블 타입이 아직 생성되지 않았을 수 있으므로 any 캐스팅으로 우회
    const { error } = await (supabase as any)
      .from("coupons")
      .select("*", { count: "exact", head: true });

    if (error) {
      return { ok: false, message: `Supabase 응답 오류: ${error.message}` };
    }
    return { ok: true, message: "Supabase 연결 성공" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Supabase 연결 실패: ${msg}` };
  }
}

// 개발 중 빠른 확인용: 브라우저 콘솔에 결과 출력
if (typeof window !== "undefined") {
  checkSupabaseConnection().then((r) => {
    // eslint-disable-next-line no-console
    console.log("[Supabase]", r.message);
  });
}
