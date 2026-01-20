import fs from "fs";
import path from "path";

const ROOT = process.cwd();

// 네 프로젝트 MD 위치에 맞춰 조정
const MD_DIR = path.join(ROOT, "src", "md");
const OUT = path.join(MD_DIR, "ROUTES.md");

function listMdFiles(dir) {
    const all = [];
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) all.push(...listMdFiles(p));
        else if (name.toLowerCase().endsWith(".md")) all.push(p);
    }
    return all;
}

function extractRoutes(mdText) {
    // "## 1. 라우트" 섹션에서 "- /xxx"만 추출
    const lines = mdText.split(/\r?\n/);
    let inSection = false;
    const routes = [];

    for (const line of lines) {
        const t = line.trim();

        if (/^##\s*1\.\s*라우트/.test(t)) {
            inSection = true;
            continue;
        }
        if (inSection && /^##\s+/.test(t)) {
            inSection = false;
        }
        if (!inSection) continue;

        const m = t.match(/^-+\s*(\/[^\s]*)\s*$/);
        if (m) routes.push(m[1]);
    }
    return routes;
}

// 접근 제어 추출: 페이지 MD에 "## 8. 접근 제어" 같은 게 있으면 우선 사용
function extractAccessType(mdText) {
    // 반환값: "PUBLIC" | "GUEST" | "PROTECTED" | null
    // (너희 템플릿 섹션명에 맞춰 키워드만 잡음)
    const text = mdText;

    // 가장 강한 규칙: 명시된 단어가 있으면 그걸로 고정
    if (/Guest\s*Only|비로그인\s*전용/i.test(text)) return "GUEST";
    if (/Protected|로그인\s*필수/i.test(text)) return "PROTECTED";
    if (/Public|공개\s*페이지/i.test(text)) return "PUBLIC";

    // 없으면 null
    return null;
}

function defaultAccessType(route) {
    // AUTH_GUARD.md의 일반적 규칙을 코드로 고정
    if (route === "/login" || route === "/signup") return "GUEST";
    if (route.startsWith("/my") || route.startsWith("/chat") || route.endsWith("/new") || route.includes("/edit"))
        return "PROTECTED";
    return "PUBLIC";
}

function main() {
    if (!fs.existsSync(MD_DIR)) {
        throw new Error(`MD_DIR 없음: ${MD_DIR}`);
    }

    const files = listMdFiles(MD_DIR);

    const routeMap = new Map(); // route -> { type, sources[] }

    for (const f of files) {
        const name = path.basename(f);
        // ROUTES.md 자체는 입력에서 제외
        if (name.toLowerCase() === "routes.md") continue;

        const md = fs.readFileSync(f, "utf8");
        const routes = extractRoutes(md);
        if (routes.length === 0) continue;

        const explicitType = extractAccessType(md);

        for (const r of routes) {
            const prev = routeMap.get(r) ?? { type: null, sources: [] };
            prev.sources.push(path.relative(MD_DIR, f));

            // 접근 타입 결정: 명시가 있으면 우선, 없으면 기존 유지, 다 없으면 default
            const t = explicitType ?? prev.type ?? defaultAccessType(r);
            prev.type = t;

            routeMap.set(r, prev);
        }
    }

    if (routeMap.size === 0) {
        throw new Error("MD에서 라우트를 못 찾음. 각 페이지 MD에 '## 1. 라우트(페이지)' 아래 '- /xxx' 형식이 있어야 함.");
    }

    // 타입별 정렬 출력
    const byType = { PUBLIC: [], GUEST: [], PROTECTED: [] };
    for (const [route, meta] of routeMap.entries()) {
        byType[meta.type].push({ route, meta });
    }

    const sortFn = (a, b) => a.route.localeCompare(b.route);
    byType.PUBLIC.sort(sortFn);
    byType.GUEST.sort(sortFn);
    byType.PROTECTED.sort(sortFn);

    const lines = [];
    lines.push("# ROUTES");
    lines.push("");
    lines.push("본 문서는 **각 페이지 MD의 `## 1. 라우트(페이지)`** 에서 추출한 라우트의 집계본이다.");
    lines.push("`app/` 디렉토리, `middleware.ts`, layout 적용은 **본 문서를 기준으로만** 생성한다.");
    lines.push("");

    lines.push("## Public (공개 페이지)");
    lines.push("");
    for (const x of byType.PUBLIC) lines.push(`- ${x.route}`);
    lines.push("");

    lines.push("## Guest Only (비로그인 전용)");
    lines.push("");
    for (const x of byType.GUEST) lines.push(`- ${x.route}`);
    lines.push("");

    lines.push("## Protected (로그인 필수)");
    lines.push("");
    for (const x of byType.PROTECTED) lines.push(`- ${x.route}`);
    lines.push("");

    lines.push("## 출처 매핑");
    lines.push("");
    lines.push("| Route | Sources(MD) |");
    lines.push("|------|-------------|");
    const allSorted = [...routeMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [r, meta] of allSorted) {
        const src = meta.sources.map(s => `\`${s}\``).join("<br/>");
        lines.push(`| ${r} | ${src} |`);
    }
    lines.push("");

    fs.writeFileSync(OUT, lines.join("\n"), "utf8");
    console.log(`✅ ROUTES.md 생성 완료: ${path.relative(ROOT, OUT)}`);
}

main();
