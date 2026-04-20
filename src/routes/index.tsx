import { createFileRoute } from "@tanstack/react-router";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: BookingFlowPage,
  head: () => ({
    meta: [
      { title: "전화영어 수업 예약" },
      { name: "description", content: "초대 코드 인증 후 수업 요일과 시간을 선택해 예약하세요." },
    ],
  }),
});

// ───────────────────────── Types & Context ─────────────────────────

const LEVELS = [
  { value: "Lv1", label: "Lv1 입문 - 짧게 반응 가능" },
  { value: "Lv2", label: "Lv2 초급 - 간단한 질문 답변" },
  { value: "Lv3", label: "Lv3 초중급 - 대화는 가능" },
  { value: "Lv4", label: "Lv4 중급 - 일상대화 참여" },
  { value: "Lv5", label: "Lv5 중고급 - 꽤 유창함" },
  { value: "Lv6", label: "Lv6 고급 - 자유롭게 토론" },
] as const;

const VALID_COUPONS = ["AAA999", "BBB123", "CCC456"];

const DAY_LABELS = ["월", "화", "수", "목", "금"] as const;
const DAY_VALUES = [1, 2, 3, 4, 5] as const;
type DayValue = (typeof DAY_VALUES)[number];

type FormState = {
  coupon: string;
  name: string;
  phone: string;
  kakaoLinked: boolean;
  level: string;
  selectedDays: DayValue[]; // up to 2, in selection order
  selectedTime: string;
};

const initialForm: FormState = {
  coupon: "",
  name: "",
  phone: "",
  kakaoLinked: false,
  level: "",
  selectedDays: [],
  selectedTime: "",
};

type Ctx = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  step: number;
  goNext: () => void;
  goPrev: () => void;
  reset: () => void;
};

const FormCtx = createContext<Ctx | null>(null);
const useForm = () => {
  const c = useContext(FormCtx);
  if (!c) throw new Error("FormCtx missing");
  return c;
};

// ───────────────────────── Helpers ─────────────────────────

const TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 18; h <= 22; h++) {
    for (const m of [0, 20, 40]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

// mock 마감 슬롯 (요일 조합과 무관하게 고정)
const CLOSED_TIMES = new Set(["18:40", "19:40", "20:20", "21:40"]);

function getNextDayOfWeek(targetDay: DayValue, base = new Date()): Date {
  const date = new Date(base);
  date.setHours(0, 0, 0, 0);
  const currentDay = date.getDay() === 0 ? 7 : date.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;
  date.setDate(date.getDate() + diff);
  return date;
}

function fmtMD(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function dayLabel(v: DayValue) {
  return DAY_LABELS[v - 1];
}

// 4회 수업 일정 계산: 선택한 두 요일에 주 2회 × 2주
function computeSchedule(days: DayValue[], time: string) {
  if (days.length !== 2 || !time) return [];
  const dates = days.map((d) => getNextDayOfWeek(d)).sort((a, b) => a.getTime() - b.getTime());
  const sortedDays: DayValue[] = dates.map(
    (d) => (d.getDay() === 0 ? 7 : d.getDay()) as DayValue,
  );
  const result: { date: Date; day: DayValue; time: string }[] = [];
  for (let week = 0; week < 2; week++) {
    for (let i = 0; i < 2; i++) {
      const d = new Date(dates[i]);
      d.setDate(d.getDate() + week * 7);
      result.push({ date: d, day: sortedDays[i], time });
    }
  }
  return result;
}

// ───────────────────────── Page ─────────────────────────

const STEPS = [1, 6, 7] as const;

function BookingFlowPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [stepIdx, setStepIdx] = useState(0);

  const ctx: Ctx = {
    form,
    setForm,
    step: STEPS[stepIdx],
    goNext: () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)),
    goPrev: () => setStepIdx((i) => Math.max(i - 1, 0)),
    reset: () => {
      setForm(initialForm);
      setStepIdx(0);
    },
  };

  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  return (
    <FormCtx.Provider value={ctx}>
      <div className="min-h-screen bg-background text-foreground">
        <Toaster position="top-center" richColors />
        <div className="mx-auto max-w-xl px-4 pb-10 pt-6 sm:pt-8">
          {/* 진행률 */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                STEP {stepIdx + 1} / {STEPS.length}
              </span>
              <span className="text-xs font-medium text-primary">
                {stepIdx + 1}/{STEPS.length}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {stepIdx === 0 && <StepCoupon />}
          {stepIdx === 1 && <StepRegistration />}
          {stepIdx === 2 && <StepSchedule />}
        </div>
      </div>
    </FormCtx.Provider>
  );
}

// ───────────────────────── Step 1: 쿠폰 ─────────────────────────

function StepCoupon() {
  const { form, setForm, goNext } = useForm();
  const [error, setError] = useState("");

  const verify = () => {
    const code = form.coupon.trim().toUpperCase();
    if (!VALID_COUPONS.includes(code)) {
      setError("유효하지 않은 코드입니다");
      return;
    }
    setError("");
    setForm((f) => ({ ...f, coupon: code }));
    goNext();
  };

  return (
    <StepShell title="🎟️ 초대 코드를 입력해 주세요" description="발급받은 초대 코드를 입력하면 수업 신청을 시작할 수 있어요.">
      <div className="space-y-2">
        <Label htmlFor="coupon" className="text-sm font-semibold">
          쿠폰 번호
        </Label>
        <Input
          id="coupon"
          placeholder="AAA999"
          value={form.coupon}
          onChange={(e) => {
            setForm((f) => ({ ...f, coupon: e.target.value }));
            if (error) setError("");
          }}
          className="h-12 rounded-lg text-base uppercase tracking-wider"
          autoFocus
        />
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </div>

      <div className="pt-2">
        <Button onClick={verify} className="h-12 w-full rounded-lg text-base font-semibold">
          인증하기
        </Button>
      </div>

      <NavBar nextLabel="다음" onNext={verify} hidePrev nextDisabled={!form.coupon.trim()} />
    </StepShell>
  );
}

// ───────────────────────── Step 6: 수강 등록 ─────────────────────────

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function StepRegistration() {
  const { form, setForm } = useForm();

  const phoneValid = /^010-\d{4}-\d{4}$/.test(form.phone);
  const canNext = form.name.trim().length > 0 && phoneValid && form.level.length > 0;

  return (
    <StepShell title="📝 수강 등록 신청서" description="수업 안내를 위해 기본 정보를 입력해 주세요.">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-semibold">
          이름 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="홍길동"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="h-12 rounded-lg text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-semibold">
          연락처 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          inputMode="numeric"
          placeholder="010-0000-0000"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
          className="h-12 rounded-lg text-base"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">카카오톡 연동</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant={form.kakaoLinked ? "secondary" : "outline"}
            onClick={() => setForm((f) => ({ ...f, kakaoLinked: true }))}
            disabled={form.kakaoLinked}
            className="h-11 min-w-[88px] rounded-lg"
          >
            확인
          </Button>
          {form.kakaoLinked && (
            <span className="text-sm font-semibold text-primary">✓ 연동 완료</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          영어 실력 <span className="text-destructive">*</span>
        </Label>
        <Select value={form.level} onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}>
          <SelectTrigger className="h-12 rounded-lg text-base">
            <SelectValue placeholder="현재 영어 실력을 선택해 주세요" />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <NavBar nextDisabled={!canNext} />
    </StepShell>
  );
}

// ───────────────────────── Step 7: 요일·시간 ─────────────────────────

function StepSchedule() {
  const { form, setForm, reset } = useForm();
  const { selectedDays, selectedTime } = form;

  const dayDates = useMemo(() => {
    const map = new Map<DayValue, Date>();
    for (const d of DAY_VALUES) map.set(d, getNextDayOfWeek(d));
    return map;
  }, []);

  const toggleDay = (d: DayValue) => {
    setForm((f) => {
      const cur = f.selectedDays;
      if (cur.includes(d)) {
        return { ...f, selectedDays: cur.filter((x) => x !== d), selectedTime: "" };
      }
      if (cur.length < 2) {
        return { ...f, selectedDays: [...cur, d], selectedTime: "" };
      }
      // 2개 이미 선택 → 가장 먼저 선택한 것 제거 후 새 것 추가
      return { ...f, selectedDays: [cur[1], d], selectedTime: "" };
    });
  };

  const schedule = useMemo(
    () => computeSchedule(selectedDays, selectedTime),
    [selectedDays, selectedTime],
  );

  const sortedDayLabels = useMemo(() => {
    if (selectedDays.length !== 2) return [];
    const sorted = [...selectedDays].sort((a, b) => {
      const da = dayDates.get(a)!.getTime();
      const db = dayDates.get(b)!.getTime();
      return da - db;
    });
    return sorted.map(dayLabel);
  }, [selectedDays, dayDates]);

  const submit = () => {
    if (selectedDays.length !== 2 || !selectedTime) return;
    const payload = {
      coupon: form.coupon,
      name: form.name,
      phone: form.phone,
      kakaoLinked: form.kakaoLinked,
      level: form.level,
      days: [...selectedDays].sort((a, b) => a - b).map(dayLabel),
      time: selectedTime,
      schedule: schedule.map((s) => ({
        date: fmtMD(s.date),
        day: dayLabel(s.day),
        time: s.time,
      })),
    };
    // eslint-disable-next-line no-console
    console.log("[예약 신청 데이터]", payload);
    toast.success("예약이 완료되었습니다!", { duration: 3000 });
    reset();
  };

  return (
    <StepShell
      title="📅 수업 요일을 선택하세요 (2개)"
      description="⚠️ 무료수강권은 주 2회 수업만 가능합니다"
    >
      {/* 요일 */}
      <div className="grid grid-cols-5 gap-2">
        {DAY_VALUES.map((d) => {
          const date = dayDates.get(d)!;
          const active = selectedDays.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center rounded-lg border px-2 py-3 transition-all",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/50",
              )}
            >
              <span className="text-base font-semibold">{dayLabel(d)}</span>
              <span
                className={cn(
                  "mt-1 text-xs tabular-nums",
                  active ? "opacity-90" : "text-muted-foreground",
                )}
              >
                {fmtMD(date)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        ※ 표시된 날짜는 첫 수업 시작일입니다.
        <br />
        이후 매주 같은 요일·시간에 수업합니다.
      </p>

      {/* 시간 */}
      {selectedDays.length === 2 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold">
            🕐 {sortedDayLabels.join("·")} 모두 가능한 시간
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {TIMES.map((t) => {
              const closed = CLOSED_TIMES.has(t);
              const active = selectedTime === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={closed}
                  onClick={() => setForm((f) => ({ ...f, selectedTime: t }))}
                  className={cn(
                    "flex min-h-[48px] flex-col items-center justify-center rounded-lg border px-2 py-2 text-sm font-semibold tabular-nums transition-all",
                    closed
                      ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                      : active
                        ? "border-2 border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400",
                  )}
                >
                  <span>{t}</span>
                  {closed && <span className="mt-0.5 text-[10px] font-medium">마감</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 요약 */}
      {selectedDays.length === 2 && selectedTime && schedule.length === 4 && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-foreground">선택한 시간: {selectedTime}</p>
          <p className="text-foreground">
            📌 첫 수업: {fmtMD(schedule[0].date)} ({dayLabel(schedule[0].day)}){" "}
            {schedule[0].time}
          </p>
          <p className="text-foreground">
            📌 마지막 수업: {fmtMD(schedule[3].date)} ({dayLabel(schedule[3].day)}){" "}
            {schedule[3].time}
          </p>
          <p className="text-xs text-muted-foreground">(주2회 × 2주 = 총 4회)</p>
        </div>
      )}

      <NavBar
        nextLabel="예약 완료"
        onNext={submit}
        nextDisabled={selectedDays.length !== 2 || !selectedTime}
      />
    </StepShell>
  );
}

// ───────────────────────── Shared ─────────────────────────

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function NavBar({
  onNext,
  nextLabel = "다음",
  nextDisabled,
  hidePrev,
}: {
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hidePrev?: boolean;
}) {
  const { goNext, goPrev, step } = useForm();
  const showPrev = !hidePrev && step !== 1;
  return (
    <div className="flex gap-2 pt-4">
      {showPrev && (
        <Button
          variant="outline"
          onClick={goPrev}
          className="h-12 flex-1 rounded-lg text-base font-semibold"
        >
          이전
        </Button>
      )}
      <Button
        onClick={onNext ?? goNext}
        disabled={nextDisabled}
        className={cn("h-12 rounded-lg text-base font-semibold", showPrev ? "flex-1" : "w-full")}
      >
        {nextLabel}
      </Button>
    </div>
  );
}
