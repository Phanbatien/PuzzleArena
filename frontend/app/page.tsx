
import Link from "next/link";

const features = [
  {
    number: "01",
    icon: "🔢",
    title: "Sudoku",
    subtitle: "LOGIC · PRECISION",
    description:
      "Rèn luyện tư duy logic với các đề Sudoku có lời giải duy nhất. Mỗi nước đi đều quan trọng, hãy giữ độ chính xác để giành chiến thắng.",
    color: "from-violet-500/20 to-indigo-500/5",
    border: "group-hover:border-violet-400/50",
    iconStyle: "border-violet-400/20 bg-violet-500/10",
    accent: "text-violet-300",
  },
  {
    number: "02",
    icon: "💣",
    title: "Dò Mìn",
    subtitle: "STRATEGY · SPEED",
    description:
      "Phân tích từng ô, tránh những quả mìn nguy hiểm và đưa ra quyết định chính xác. Khả năng quan sát sẽ tạo nên khác biệt.",
    color: "from-cyan-500/15 to-blue-500/5",
    border: "group-hover:border-cyan-400/50",
    iconStyle: "border-cyan-400/20 bg-cyan-500/10",
    accent: "text-cyan-300",
  },
  {
    number: "03",
    icon: "🏆",
    title: "Đấu trường Elo",
    subtitle: "COMPETE · CLIMB",
    description:
      "Tham gia giải đấu, tích lũy thành tích và cạnh tranh thứ hạng với những người chơi khác trên bảng xếp hạng.",
    color: "from-amber-500/15 to-orange-500/5",
    border: "group-hover:border-amber-400/50",
    iconStyle: "border-amber-400/20 bg-amber-500/10",
    accent: "text-amber-300",
  },
];

const highlights = [
  {
    icon: "⚡",
    title: "Thi đấu kịch tính",
    description: "Thử thách bản thân qua những trận đấu trí.",
  },
  {
    icon: "📈",
    title: "Phát triển thứ hạng",
    description: "Theo dõi Elo và cải thiện thành tích của bạn.",
  },
  {
    icon: "🎯",
    title: "Rèn luyện mỗi ngày",
    description: "Duy trì thói quen luyện tập cùng Daily Puzzle.",
  },
];

export default function HomePage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden text-slate-100">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-[10%] top-[-180px] h-[460px] w-[460px] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute right-[-100px] top-[300px] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute bottom-[-100px] left-[25%] h-[350px] w-[350px] rounded-full bg-indigo-600/10 blur-[130px]" />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.045)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-[1320px] items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:px-10 lg:pb-24 lg:pt-24">
        <div className="relative z-10">
          <div className="mb-7 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/[0.08] px-3.5 py-2 text-xs font-semibold text-violet-200 sm:text-sm">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
            </span>
            <span>PuzzleArena</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">Play smart. Rise higher.</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-black leading-[1.12] tracking-[-0.045em] text-white sm:text-5xl md:text-6xl xl:text-7xl">
            Trí tuệ là vũ khí.
            <span className="mt-2 block bg-gradient-to-r from-violet-300 via-indigo-300 to-cyan-300 bg-clip-text pb-2 text-transparent">
              Chiến thắng là mục tiêu.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            Bước vào đấu trường trí tuệ trực tuyến. Thử thách khả năng với{" "}
            <strong className="font-semibold text-slate-200">Sudoku</strong>,{" "}
            <strong className="font-semibold text-slate-200">Dò Mìn</strong>,
            tham gia giải đấu và chinh phục bảng xếp hạng cùng PuzzleArena.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/tournaments"
              className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-violet-300/25 bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-4 text-sm font-extrabold text-white shadow-[0_12px_35px_rgba(99,75,220,0.25)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_16px_40px_rgba(99,75,220,0.35)]"
            >
              <span>⚔️</span>
              Khám phá giải đấu
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              href="/leaderboard"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/70 px-7 py-4 text-sm font-bold text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-slate-800/80"
            >
              <span>🏆</span>
              Xem bảng xếp hạng
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 sm:text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              Thử thách tư duy
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              Cạnh tranh thứ hạng
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              Luyện tập mỗi ngày
            </span>
          </div>
        </div>

        {/* Decorative game preview */}
        <div className="relative mx-auto w-full max-w-[470px] lg:ml-auto">
          <div
            aria-hidden="true"
            className="absolute inset-8 rounded-full bg-violet-500/15 blur-[80px]"
          />

          <div className="relative overflow-hidden rounded-[28px] border border-slate-700/80 bg-[#0c1224]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  YOUR NEXT CHALLENGE
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-white">
                  Brain Arena
                </h2>
              </div>

              <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                READY
              </span>
            </div>

            {/* Illustrative Sudoku grid */}
            <div className="mt-6 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 sm:p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-200">
                    Sudoku Challenge
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Logic starts here
                  </p>
                </div>
                <span className="text-2xl">🔢</span>
              </div>

              <div
                aria-label="Minh họa bảng Sudoku"
                className="grid grid-cols-9 overflow-hidden rounded-lg border border-indigo-300/30"
              >
                {[
                  5, 3, 4, 6, 7, 8, 9, 1, 2,
                  6, 7, 2, 1, 9, 5, 3, 4, 8,
                  1, 9, 8, 3, 4, 2, 5, 6, 7,
                  8, 5, 9, 7, 6, 1, 4, 2, 3,
                  4, 2, 6, 8, 5, 3, 7, 9, 1,
                  7, 1, 3, 9, 2, 4, 8, 5, 6,
                  9, 6, 1, 5, 3, 7, 2, 8, 4,
                  2, 8, 7, 4, 1, 9, 6, 3, 5,
                  3, 4, 5, 2, 8, 6, 1, 7, 9,
                ].map((number, index) => (
                  <div
                    key={index}
                    className={`flex aspect-square items-center justify-center border-r border-t border-slate-700/60 text-[10px] font-semibold sm:text-xs ${
                      Math.floor(index / 9) % 3 === 2 &&
                      Math.floor(index / 9) !== 8
                        ? "border-b border-b-indigo-300/50"
                        : ""
                    } ${
                      index % 9 === 2 || index % 9 === 5
                        ? "border-r-indigo-300/50"
                        : ""
                    } ${
                      [3, 10, 19, 29, 38, 47, 58, 67, 75].includes(index)
                        ? "bg-violet-500/20 text-violet-200"
                        : [4, 13, 22, 31, 40, 49, 58, 67, 76].includes(index)
                          ? "bg-cyan-500/[0.08] text-cyan-200"
                          : "text-slate-400"
                    }`}
                  >
                    {number}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-slate-500">Practice your strategy</span>
                <span className="font-semibold text-violet-300">
                  Keep improving ↗
                </span>
              </div>
            </div>

            {/* Game modes */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
                <div className="text-xl">💣</div>
                <p className="mt-2 text-sm font-bold text-slate-200">
                  Dò Mìn
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Think before you click
                </p>
              </div>

              <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.06] p-4">
                <div className="text-xl">🏆</div>
                <p className="mt-2 text-sm font-bold text-slate-200">
                  Ranked Arena
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Compete to rise
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-lg">
                ✦
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-200">
                  Your journey starts now
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Play smart. Rise higher.
                </p>
              </div>
              <span className="text-lg text-cyan-300">↗</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature section */}
      <section className="mx-auto w-full max-w-[1320px] px-5 pb-16 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-300">
              Explore the arena
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Chọn thử thách của bạn
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              Mỗi chế độ là một cách khác nhau để rèn luyện tư duy, cải thiện
              kỹ năng và khẳng định bản lĩnh.
            </p>
          </div>

          <Link
            href="/tournaments"
            className="inline-flex w-fit items-center gap-2 text-sm font-bold text-violet-300 transition hover:text-cyan-300"
          >
            Khám phá đấu trường <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.number}
              className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-slate-900/90 ${feature.border}`}
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.color} opacity-70`}
              />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl transition duration-300 group-hover:scale-105 ${feature.iconStyle}`}
                  >
                    {feature.icon}
                  </div>
                  <span className="text-xs font-black tracking-widest text-slate-600">
                    {feature.number}
                  </span>
                </div>

                <p
                  className={`mt-6 text-[10px] font-extrabold tracking-[0.18em] ${feature.accent}`}
                >
                  {feature.subtitle}
                </p>

                <h3 className="mt-2 text-xl font-extrabold text-white">
                  {feature.title}
                </h3>

                <p className="mt-3 min-h-[84px] text-sm leading-7 text-slate-400">
                  {feature.description}
                </p>

                <div className="mt-5 h-px bg-gradient-to-r from-slate-700 to-transparent" />

                <Link
                  href="/tournaments"
                  className={`mt-5 inline-flex items-center gap-2 text-sm font-bold transition group-hover:gap-3 ${feature.accent}`}
                >
                  Khám phá ngay <span>→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto w-full max-w-[1320px] px-5 pb-16 sm:px-8 lg:px-10 lg:pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-br from-[#151b35] via-[#101629] to-[#0c1827] p-6 sm:p-9 lg:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-[90px]"
          />

          <div className="relative grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-12">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                More than a game
              </p>
              <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
                Không chỉ chơi game.
                <span className="block text-slate-400">
                  Hãy vượt qua chính mình.
                </span>
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                Theo dõi hành trình của bạn, tham gia các thử thách và từng
                bước nâng cao thành tích tại PuzzleArena.
              </p>

              <Link
                href="/leaderboard"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/[0.08] px-5 py-3 text-sm font-bold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/[0.14]"
              >
                <span>🏅</span>
                Theo dõi bảng xếp hạng
                <span>→</span>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-5 transition hover:border-violet-400/30"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <h3 className="mt-4 text-sm font-extrabold text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-slate-800/80 bg-slate-950/40">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-5 py-7 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-lg">
              🧩
            </span>
            <span className="text-sm font-black text-white">
              Puzzle<span className="text-cyan-300">Arena</span>
            </span>
          </Link>

          <p className="text-xs leading-6 text-slate-500">
            PuzzleArena Platform · Đội ngũ phát triển phần mềm
          </p>

          <Link
            href="/tournaments"
            className="text-xs font-bold text-slate-400 transition hover:text-violet-300"
          >
            Bắt đầu khám phá →
          </Link>
        </div>
      </footer>
    </main>
  );
}
