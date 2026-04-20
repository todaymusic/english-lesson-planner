import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: BookingPage,
  head: () => ({
    meta: [
      { title: "전화영어 수업 예약" },
      { name: "description", content: "원하는 시간에 전화영어 수업을 예약하세요." },
    ],
  }),
});

const TEACHERS = ["김민지", "이준호", "박서연"] as const;
type Teacher = (typeof TEACHERS)[number];

type Slot = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  time: string; // HH:mm
  teacher: Teacher;
  booked: boolean;
};

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function buildDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

const TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 18; h <= 22; h++) {
    for (const m of [0, 20, 40]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

// 시드 기반 의사난수 (안정적인 mock)
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateSlots(): Slot[] {
  const dates = buildDates();
  const rand = seeded(42);
  const slots: Slot[] = [];
  for (const d of dates) {
    const dateKey = ymd(d);
    for (const time of TIMES) {
      // 각 시간대마다 1~2명 선생님 배치
      const shuffled = [...TEACHERS].sort(() => rand() - 0.5);
      const count = rand() > 0.5 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        slots.push({
          id: `${dateKey}-${time}-${shuffled[i]}`,
          dateKey,
          time,
          teacher: shuffled[i],
          booked: rand() < 0.2,
        });
      }
    }
  }
  return slots;
}

function BookingPage() {
  const dates = useMemo(buildDates, []);
  const [selectedDate, setSelectedDate] = useState(ymd(dates[0]));
  const [teacherFilter, setTeacherFilter] = useState<"all" | Teacher>("all");
  const [slots, setSlots] = useState<Slot[]>(() => generateSlots());
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", email: "", coupon: "" });

  const visibleByTime = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const t of TIMES) map.set(t, []);
    for (const s of slots) {
      if (s.dateKey !== selectedDate) continue;
      if (teacherFilter !== "all" && s.teacher !== teacherFilter) continue;
      map.get(s.time)?.push(s);
    }
    return map;
  }, [slots, selectedDate, teacherFilter]);

  const openBooking = (slot: Slot) => {
    if (slot.booked) return;
    setActiveSlot(slot);
    setForm({ name: "", email: "", coupon: "" });
  };

  const submitBooking = () => {
    if (!activeSlot) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("이름과 이메일을 입력해주세요.");
      return;
    }
    setSlots((prev) =>
      prev.map((s) => (s.id === activeSlot.id ? { ...s, booked: true } : s))
    );
    setActiveSlot(null);
    toast.success("예약이 완료되었습니다!", { duration: 3000 });
  };

  const formatSlotLabel = (s: Slot) => {
    const d = new Date(s.dateKey);
    return `${s.teacher} 선생님 - ${d.getMonth() + 1}월 ${d.getDate()}일 ${s.time}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            전화영어 수업 예약
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            원하는 날짜와 시간을 선택해 수업을 예약하세요.
          </p>
        </header>

        {/* 날짜 선택 */}
        <section className="mb-6">
          <Label className="mb-3 block text-sm font-semibold">날짜 선택</Label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {dates.map((d) => {
              const key = ymd(d);
              const active = key === selectedDate;
              const isToday = key === ymd(new Date());
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    "flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2.5 transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  )}
                >
                  <span className={cn("text-xs", active ? "opacity-90" : "text-muted-foreground")}>
                    {WEEK_DAYS[d.getDay()]}
                  </span>
                  <span className="mt-1 text-lg font-semibold leading-none">{d.getDate()}</span>
                  {isToday && (
                    <span className={cn("mt-1 text-[10px]", active ? "opacity-90" : "text-primary")}>
                      오늘
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 선생님 필터 */}
        <section className="mb-6 flex items-center gap-3">
          <Label className="text-sm font-semibold">선생님</Label>
          <Select
            value={teacherFilter}
            onValueChange={(v) => setTeacherFilter(v as "all" | Teacher)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {TEACHERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {/* 시간 슬롯 그리드 */}
        <section>
          <Label className="mb-3 block text-sm font-semibold">시간 선택</Label>
          <div className="space-y-3">
            {TIMES.map((time) => {
              const items = visibleByTime.get(time) ?? [];
              return (
                <div key={time} className="flex items-start gap-3">
                  <div className="w-14 pt-2.5 text-sm font-medium tabular-nums text-foreground">
                    {time}
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
                    {items.length === 0 ? (
                      <div className="col-span-full rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                        가능한 슬롯 없음
                      </div>
                    ) : (
                      items.map((s) => (
                        <button
                          key={s.id}
                          disabled={s.booked}
                          onClick={() => openBooking(s)}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-left transition-all",
                            s.booked
                              ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                              : "border-border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-sm"
                          )}
                        >
                          <div className="text-sm font-semibold text-foreground">
                            {s.teacher}
                          </div>
                          <div className="mt-0.5 text-xs">
                            {s.booked ? (
                              <span className="text-muted-foreground">예약됨</span>
                            ) : (
                              <span className="text-primary">예약 가능</span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 예약 모달 */}
      <Dialog open={!!activeSlot} onOpenChange={(o) => !o && setActiveSlot(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>수업 예약</DialogTitle>
            <DialogDescription>
              {activeSlot ? formatSlotLabel(activeSlot) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                placeholder="홍길동"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coupon">쿠폰 번호 (선택)</Label>
              <Input
                id="coupon"
                placeholder="쿠폰 번호 입력"
                value={form.coupon}
                onChange={(e) => setForm((f) => ({ ...f, coupon: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setActiveSlot(null)}>
              취소
            </Button>
            <Button onClick={submitBooking}>예약하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
