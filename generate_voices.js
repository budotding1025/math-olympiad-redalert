/**
 * Edge TTS 预生成长官男声（Yunyang）
 * 用法：node generate_voices.js
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = __dirname;
const OUT = path.join(ROOT, "voice");
const VOICE = "zh-CN-YunyangNeural";

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function tts(text, outfile) {
  return new Promise((resolve, reject) => {
    const args = [
      "-m",
      "edge_tts",
      "--voice",
      VOICE,
      "--rate=-10%",
      "--text",
      text,
      "--write-media",
      outfile,
    ];
    const p = spawn("python", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (c) => (err += c.toString()));
    p.on("close", (code) => {
      if (code === 0 && fs.existsSync(outfile) && fs.statSync(outfile).size > 200) resolve();
      else reject(new Error((err || "fail") + " -> " + outfile));
    });
  });
}

async function gen(text, rel) {
  const file = path.join(OUT, rel);
  ensureDir(path.dirname(file));
  if (fs.existsSync(file) && fs.statSync(file).size > 200) {
    console.log("skip", rel);
    return;
  }
  process.stdout.write("gen " + rel + " ... ");
  await tts(text, file);
  console.log("ok");
}

function briefingLines(ex, hint) {
  if (!ex) return ["士兵，听好了。" + (hint || "仔细审题。")];
  const lines = [];
  if (ex.t === "sd") {
    const less = (ex.S - ex.D) / 2;
    const more = less + ex.D;
    lines.push(`士兵，看战术板。${ex.A}和${ex.B}一共${ex.S}。`);
    lines.push(`${ex.A}比${ex.B}多${ex.D}。先把多出来的${ex.D}拿掉，两边就一样长了。`);
    lines.push(`剩下的${ex.S - ex.D}平分，每边是${less}。这就是${ex.B}。`);
    if (ex.want === "B") lines.push(`所以${ex.B}是${less}。记住：和差问题，先减差再平分。`);
    else if (ex.want === "both")
      lines.push(`${ex.A}就是${less}加${ex.D}，等于${more}。答案是${more}和${less}。`);
    else lines.push(`${ex.A}是${less}加${ex.D}，等于${more}。目标锁定！`);
  } else if (ex.t === "give") {
    const diff = ex.Xa - ex.Xb;
    const half = diff / 2;
    lines.push(`士兵，${ex.A}有${ex.Xa}，${ex.B}有${ex.Xb}。差是${diff}。`);
    lines.push(`要一样多，把差的一半交给对方。一半是${half}。`);
    lines.push(`所以从${ex.A}拿出${half}给${ex.B}，两边就扳平了。`);
  } else if (ex.t === "mul") {
    lines.push(`士兵，这是倍数侦察。${ex.A}是${ex.Xa}，${ex.B}是${ex.Xb}。`);
    lines.push(`${ex.Xa}除以${ex.Xb}，等于${ex.Xa / ex.Xb}倍。命中。`);
  } else if (ex.t === "cd") {
    const small = ex.D / (ex.K - 1);
    const big = small * ex.K;
    lines.push(`差倍战术：${ex.A}是${ex.B}的${ex.K}倍，又多${ex.D}。`);
    lines.push(`多出来的${ex.D}，正好是${ex.K - 1}份。所以一份是${small}。`);
    lines.push(ex.want === "A" ? `${ex.A}有${ex.K}份，是${big}。` : `${ex.B}就是一份，等于${small}。目标确认！`);
  } else if (ex.t === "hb") {
    const small = ex.S / (ex.K + 1);
    const big = small * ex.K;
    lines.push(`和倍作战：一共${ex.S}，${ex.A}是${ex.B}的${ex.K}倍。把总数分成${ex.K + 1}份。`);
    lines.push(`${ex.S}除以${ex.K + 1}，一份是${small}。这就是${ex.B}。`);
    lines.push(ex.want === "A" ? `${ex.A}有${ex.K}份，是${big}。` : `所以${ex.B}是${small}。漂亮。`);
  } else if (ex.t === "hbm") {
    const totalParts = ex.parts.reduce((a, b) => a + b, 0);
    const one = ex.S / totalParts;
    lines.push(`多部队联合作战。按倍数分成${ex.parts.join("、")}份，总共${totalParts}份。`);
    lines.push(
      `${ex.S}除以${totalParts}，大约每份${Number.isInteger(one) ? one : one.toFixed(1)}。题目要求取整，第三支是${ex.exact}。`
    );
  } else if (ex.t === "tree") {
    const segs = ex.L / ex.G;
    const n = ex.mode === "none" ? segs - 1 : segs + 1;
    lines.push(`防线长${ex.L}米，每隔${ex.G}米一个点。先算段数：${ex.L}除以${ex.G}等于${segs}段。`);
    lines.push(
      ex.mode === "none"
        ? `两端都不建，点数等于段数减一：${segs}减1等于${n}。`
        : `两端都建，点数等于段数加一：${segs}加1等于${n}。`
    );
  } else if (ex.t === "digit") {
    const tens = (ex.S + ex.D) / 2;
    const ones = tens - ex.D;
    lines.push(`密码破译：十位与个位之和${ex.S}，十位比个位大${ex.D}。这就是和差。`);
    lines.push(`十位等于和加差再除以2：${tens}。个位是${ones}。密码是${tens}${ones}。`);
  } else if (ex.t === "stair") {
    const c = (ex.S - ex.d1 - ex.d2) / 3;
    lines.push(
      `三座军火库像台阶一样：甲最高，乙居中，丙最低。甲比丙多${ex.d1}，乙比丙多${ex.d2}。设丙为基准。`
    );
    lines.push(`三个加起来共${ex.S}吨。丙等于（${ex.S}减去${ex.d1}再减去${ex.d2}）再除以3，等于${c}。`);
  }
  return lines;
}

function extractQuestions(html) {
  const items = [];
  const courseRe =
    /\{\s*week:\s*(\d+),\s*day:\s*(\d+),\s*name:[\s\S]*?questions:\s*\[([\s\S]*?)\]\s*\}/g;
  let cm;
  while ((cm = courseRe.exec(html))) {
    const week = +cm[1];
    const day = +cm[2];
    const body = cm[3];
    const qRe = /\{[^{}]*ex:\s*(\{[^{}]+\})[^{}]*\}/g;
    let qm;
    let index = 0;
    // better: split by "ex:"
    const parts = body.split(/\{\s*q:/).slice(1);
    parts.forEach((part, i) => {
      const exMatch = part.match(/ex:\s*(\{[\s\S]*?\})\s*\}/);
      if (!exMatch) return;
      let ex;
      try {
        ex = eval("(" + exMatch[1] + ")");
      } catch (e) {
        console.warn("ex parse fail", week, day, i, e.message);
        return;
      }
      items.push({ week, day, index: i, ex });
    });
  }
  return items;
}

async function main() {
  ensureDir(OUT);
  console.log("voice:", VOICE);

  const fixed = {
    "clear.mp3": "完美！今日任务全部完成，你证明了自己！",
    "review-done.mp3": "恭喜你，士兵！本周战场已全部清扫干净。",
    "timer.mp3": "时间到！今日任务完成，撤退休整！",
    "miss-0.mp3": "目标丢失，别灰心，重新瞄准！",
    "miss-1.mp3": "记住，真正的战士不是不失败，而是失败后依然冲锋。",
    "miss-2.mp3": "一次失手不算什么，站起来，再给敌人一炮！",
    "miss-3.mp3": "冷静，士兵。看清题意，我们还能赢。",
    "hit-0.mp3": "干得漂亮，士兵！继续保持。",
    "hit-1.mp3": "命中目标！你是个好苗子。",
    "hit-2.mp3": "漂亮！我已经看到你身上的将军潜质了。",
    "hit-3.mp3": "完美！这一仗打得漂亮，我为你骄傲。",
    "welcome-0.mp3": "士兵，欢迎归队！今天的目标是拿下这个据点。",
    "welcome-1.mp3": "看到你来了，我就放心了。开始行动吧。",
    "welcome-2.mp3": "战场已经准备好，就差你了，指挥官。",
    "welcome-3.mp3": "别让敌人觉得你好欺负，让他们见识你的厉害！",
    "brief-end.mp3": "讲解完毕。听懂了就去瞄准目标！",
  };

  for (const [f, t] of Object.entries(fixed)) {
    await gen(t, f);
  }

  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const qs = extractQuestions(html);
  console.log("questions with ex:", qs.length);

  for (const q of qs) {
    const lines = briefingLines(q.ex);
    for (let s = 0; s < lines.length; s++) {
      const rel = `brief/w${q.week}-d${q.day}-q${q.index}-s${s}.mp3`;
      await gen(lines[s], rel);
    }
  }

  // manifest for runtime
  const manifest = { voice: VOICE, fixed: Object.keys(fixed), briefs: {} };
  for (const q of qs) {
    const key = `w${q.week}-d${q.day}-q${q.index}`;
    manifest.briefs[key] = briefingLines(q.ex).length;
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("done. files in voice/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
