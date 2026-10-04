// functions/_worker.js
// Vanz Auto Uploader — GitHub + Obfuscation Engine (MAX TIER)
// Owner: rahmadkn60-a11y
// Repo: LOADGENEANJENG
// Powered by vanz Labs × Kairo

const GITHUB_API = 'https://api.github.com';

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/convert') {
        return handleConvert(request, env);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}

async function handleConvert(request, env) {
    try {
        const { code } = await request.json();

        if (!code || typeof code !== 'string') {
            return json({ error: 'Kode kosong atau invalid.' }, 400);
        }

        if (code.length > 500000) {
            return json({ error: 'Kode kegedean, max 500KB.' }, 400);
        }

        // 1. Obfuscate MAX TIER
        const obfuscated = obfuscateLua(code);

        // 2. Random filename
        const filename = generateRandomFilename();

        // 3. Upload ke GitHub
        const rawUrl = await uploadToGithub(obfuscated, filename, env);

        // 4. Loadstring
        const loadstring = `loadstring(game:HttpGet("${rawUrl}"))()`;

        return json({
            success: true,
            filename,
            rawUrl,
            loadstring
        });

    } catch (err) {
        return json({ error: err.message || 'Internal error' }, 500);
    }
}

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
}

// ============================================================
// OBFUSCATION ENGINE — MAX TIER
// Layer 1 : Pre-processing (strip comments, collapse whitespace)
// Layer 2 : String encryption (semua string literal dienkripsi)
// Layer 3 : Control flow wrap (IIFE + marker)
// Layer 4 : Multi-round XOR + bit rotation + chunk shuffle + offset walk
// Layer 5 : Loader dengan runtime decode
// Layer 6 : Anti-debug guard (cek loadstring tersedia)
// Hasil : practically deobf-resistant
// ============================================================

function obfuscateLua(source) {
    // --- Layer 1: pre-process ---
    let cleaned = stripComments(source);
    cleaned = collapseWhitespace(cleaned);

    // --- Layer 2: string encryption ---
    cleaned = encryptStringLiterals(cleaned);

    // --- Layer 3: control flow wrap ---
    cleaned = flattenControlFlow(cleaned);

    // --- Layer 4: byte-level encoding ---
    const bytes = new TextEncoder().encode(cleaned);
    const arr = Array.from(bytes);

    const key = [];
    for (let i = 0; i < 48; i++) key.push(Math.floor(Math.random() * 256));

    const xored = arr.map((b, i) => b ^ key[i % key.length]);
    const rotated = xored.map(b => ((b << 5) | (b >> 3)) & 0xFF);

    const chunked = [];
    for (let i = 0; i < rotated.length; i += 24) {
        const chunk = rotated.slice(i, i + 24);
        chunked.push(...chunk.reverse());
    }

    const offsetKey = Math.floor(Math.random() * 256);
    const mulKey = 3 + Math.floor(Math.random() * 5);
    const offseted = chunked.map((b, i) => (b + offsetKey + ((i * mulKey) % 11)) & 0xFF);

    const encoded = offseted.map(b => b.toString(16).padStart(2, '0')).join('');

    // --- Layer 5 & 6: loader ---
    const v = randomVarNames(12);
    const loader = buildAdvancedLoader(encoded, key, offsetKey, mulKey, v);

    return loader;
}

function stripComments(src) {
    let out = src.replace(/--\[\[[\s\S]*?\]\]/g, '');
    out = out.replace(/--[^\n]*/g, '');
    return out;
}

function collapseWhitespace(src) {
    return src
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .join('\n');
}

function encryptStringLiterals(src) {
    let out = '';
    let i = 0;
    while (i < src.length) {
        const ch = src[i];
        if (ch === '"' || ch === "'") {
            const quote = ch;
            let j = i + 1;
            let buf = '';
            while (j < src.length && src[j] !== quote) {
                if (src[j] === '\\' && j + 1 < src.length) {
                    buf += src[j] + src[j + 1];
                    j += 2;
                } else {
                    buf += src[j];
                    j++;
                }
            }
            const real = unescapeLua(buf);
            const bytes = Array.from(new TextEncoder().encode(real));
            out += `_D({${bytes.join(',')}})`;
            i = j + 1;
        } else {
            out += ch;
            i++;
        }
    }
    const decoder = `local function _D(_t) local _s = {} for _i = 1, #_t do _s[_i] = string.char(_t[_i]) end return table.concat(_s) end`;
    return decoder + '\n' + out;
}

function unescapeLua(s) {
    return s
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
}

function flattenControlFlow(src) {
    if (src.length < 200) return src;
    const marker = randomHex(8);
    return `(function()\n${src}\nend)() --[[${marker}]]`;
}

function randomHex(len) {
    const arr = new Uint8Array(len / 2);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomVarNames(count) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const names = [];
    const used = new Set();
    while (names.length < count) {
        let len = 12 + Math.floor(Math.random() * 8);
        let n = '_';
        for (let i = 0; i < len; i++) {
            n += chars[Math.floor(Math.random() * chars.length)];
        }
        if (!used.has(n)) {
            used.add(n);
            names.push(n);
        }
    }
    return names;
}

function buildAdvancedLoader(hexData, key, offsetKey, mulKey, v) {
    const [a, b, c, d, e, f, g, h, i2, j2, k2, l2] = v;

    const loader = `
local ${a} = "${hexData}"
local ${b} = {}
for ${c} = 1, #${a}, 2 do
    ${b}[#${b} + 1] = tonumber(string.sub(${a}, ${c}, ${c} + 1), 16)
end
local ${d} = {}
for ${e} = 1, #${b} do
    ${d}[${e}] = (${b}[${e}] - ${offsetKey} - ((${e} - 1) * ${mulKey}) % 11) % 256
end
local ${f} = {}
for ${g} = 1, #${d}, 24 do
    local ${h} = {}
    for ${i2} = ${g}, math.min(${g} + 23, #${d}) do
        table.insert(${h}, 1, ${d}[${i2}])
    end
    for ${j2} = 1, #${h} do
        table.insert(${f}, ${h}[${j2}])
    end
end
local ${k2} = {${key.join(',')}}
local ${l2} = {}
for ${e} = 1, #${f} do
    local ${c} = ${f}[${e}]
    local ${g} = ((${c} >> 5) | ((${c} << 3) & 255)) & 255
    local ${i2} = ${g} ~ ${k2}[((${e} - 1) % #${k2}) + 1]
    ${l2}[${e}] = string.char(${i2})
end
local ${a} = table.concat(${l2})
if type(loadstring) ~= "function" and type(load) ~= "function" then return end
local ${b} = loadstring or load
local ${c} = ${b}(${a})
if ${c} then pcall(${c}) end
`.trim();

    return loader;
}

function generateRandomFilename() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let hex = '';
    for (const b of bytes) hex += b.toString(16).padStart(2, '0');
    return hex + '.lua';
}

// ============================================================
// GITHUB UPLOAD
// ============================================================

async function uploadToGithub(content, filename, env) {
    const token = env.GITHUB_TOKEN;
    const owner = env.GITHUB_OWNER || 'rahmadkn60-a11y';
    const repo = env.GITHUB_REPO || 'LOADGENEANJENG';
    const branch = env.GITHUB_BRANCH || 'main';

    if (!token) {
        throw new Error('GITHUB_TOKEN belum di-set di environment variables.');
    }

    // Safety: cek collision
    const checkRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${filename}?ref=${branch}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'vanz-auto-uploader',
                'Accept': 'application/vnd.github+json'
            }
        }
    );

    if (checkRes.status === 200) {
        const newName = generateRandomFilename();
        return uploadToGithub(content, newName, env);
    }

    // Encode base64
    const base64Content = btoa(unescape(encodeURIComponent(content)));

    // Upload
    const uploadRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${filename}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'vanz-auto-uploader',
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `auto: ${filename}`,
                content: base64Content,
                branch
            })
        }
    );

    if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(`GitHub upload gagal: ${uploadRes.status} — ${err}`);
    }

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
    return rawUrl;
}
