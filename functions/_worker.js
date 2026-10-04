// functions/_worker.js
// Vanz Auto Uploader — GitHub + Obfuscation Engine
// Powered by vanz Labs × Kairo

const GITHUB_API = 'https://api.github.com';

export async function onRequest(context) {
    const { request, env } = context;

    // CORS preflight
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

        // 1. Obfuscate multi-layer
        const obfuscated = obfuscateLua(code);

        // 2. Random filename (32 char hex, hampir mustahil tabrakan)
        const filename = generateRandomFilename();

        // 3. Upload ke GitHub
        const rawUrl = await uploadToGithub(obfuscated, filename, env);

        // 4. Bikin loadstring
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
// OBFUSCATION ENGINE — Multi-Layer
// ============================================================
// Layer 1: Source → byte array
// Layer 2: Multi-round XOR + rotation dengan key random
// Layer 3: Chunk splitting + random variable names
// Layer 4: Runtime decoder wrapper (Lua)
// Hasil akhir: string terenkripsi + loader yang decode saat runtime
// ============================================================

function obfuscateLua(source) {
    // Convert source ke UTF-8 bytes
    const bytes = new TextEncoder().encode(source);
    const arr = Array.from(bytes);

    // Random key 32 bytes
    const key = [];
    for (let i = 0; i < 32; i++) key.push(Math.floor(Math.random() * 256));

    // Layer 2a: XOR dengan key yang diperpanjang
    const xored = arr.map((b, i) => b ^ key[i % key.length]);

    // Layer 2b: Bit rotation per byte (rotasi 3 bit)
    const rotated = xored.map(b => ((b << 3) | (b >> 5)) & 0xFF);

    // Layer 2c: Reverse sebagian chunk (setiap 16 byte, reverse isi)
    const chunked = [];
    for (let i = 0; i < rotated.length; i += 16) {
        const chunk = rotated.slice(i, i + 16);
        chunked.push(...chunk.reverse());
    }

    // Layer 2d: Offset add dengan pseudo-random sequence
    const offsetKey = Math.floor(Math.random() * 256);
    const offseted = chunked.map((b, i) => (b + offsetKey + (i % 7)) & 0xFF);

    // Encode jadi string numerik (lebih kecil dari base64 tapi tetap obscure)
    const encoded = offseted.join(',');

    // Random nama variable buat loader (biar ga ketebak)
    const varNames = randomVarNames(6);

    // Layer 4: Lua loader
    const loader = buildLoader(encoded, key, offsetKey, varNames);

    return loader;
}

function randomVarNames(count) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const names = [];
    const used = new Set();
    while (names.length < count) {
        let len = 8 + Math.floor(Math.random() * 8);
        let n = '';
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

function buildLoader(encodedData, key, offsetKey, v) {
    // v = [0]..v[5] — nama variable acak
    const [a, b, c, d, e, f] = v;

    // Loader Lua: decode byte array balik ke string, terus loadstring
    const loader = `
local ${a} = {${encodedData}}
local ${b} = {${key.join(',')}}
local ${c} = ${offsetKey}
local ${d} = {}
for ${e} = 1, #${a} do
    local ${f} = (${a}[${e}] - ${c} - ((${e} - 1) % 7)) % 256
    ${d}[${e}] = ${f}
end
local function ${v[0]}_rev(t)
    local r = {}
    for i = 1, #t, 16 do
        local chunk = {}
        for j = i, math.min(i + 15, #t) do
            table.insert(chunk, 1, t[j])
        end
        for _, val in ipairs(chunk) do
            table.insert(r, val)
        end
    end
    return r
end
local ${a} = ${v[0]}_rev(${d})
local ${d} = {}
for ${e} = 1, #${a} do
    local ${f} = ${a}[${e}]
    local ${v[1]} = ((${f} >> 3) | ((${f} << 5) & 255)) & 255
    local ${v[2]} = ${v[1]} ~ ${b}[((${e} - 1) % #${b}) + 1]
    ${d}[${e}] = string.char(${v[2]})
end
local ${v[3]} = table.concat(${d})
local ${v[4]} = loadstring or load
local ${v[5]} = ${v[4]}(${v[3]})
if ${v[5]} then
    ${v[5]}()
end
`.trim();

    return loader;
}

function generateRandomFilename() {
    // 32 char hex — collision probability astronomically low
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
    const owner = env.GITHUB_OWNER;
    const repo = env.GITHUB_REPO;
    const branch = env.GITHUB_BRANCH || 'main';

    if (!token || !owner || !repo) {
        throw new Error('GitHub env belum di-set. Cek GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO.');
    }

    // 1. Cek dulu filename (safety double-check, walau random)
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
        // Filename tabrakan (langka banget), regenerate
        const newName = generateRandomFilename();
        return uploadToGithub(content, newName, env);
    }

    // 2. Encode content ke base64
    const base64Content = btoa(unescape(encodeURIComponent(content)));

    // 3. Upload
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

    // 4. Raw URL
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
    return rawUrl;
}
