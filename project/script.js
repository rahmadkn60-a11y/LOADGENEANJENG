// ====== URL WORKER LU ======
const WORKER_URL = 'https://loadgeneanjeng.vanzmodeonaktif.workers.dev';
// ===========================

const inputCode = document.getElementById('inputCode');
const btnConvert = document.getElementById('btnConvert');
const btnCopy = document.getElementById('btnCopy');
const output = document.getElementById('output');
const status = document.getElementById('status');

let currentLoadstring = '';

btnConvert.addEventListener('click', async () => {
    const code = inputCode.value.trim();
    if (!code) {
        setStatus('Kode masih kosong, bro.', 'error');
        return;
    }

    btnConvert.disabled = true;
    btnConvert.textContent = '⏳ Processing...';
    setStatus('Mengirim ke server...', '');
    output.classList.add('empty');
    output.textContent = 'Processing...';

    try {
        const res = await fetch(WORKER_URL + '/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        // Baca raw text dulu, biar tau isinya kalau bukan JSON
        const rawText = await res.text();

        if (!rawText || rawText.trim() === '') {
            throw new Error(`Server balikin response kosong (HTTP ${res.status}). Cek log Worker.`);
        }

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseErr) {
            const preview = rawText.slice(0, 300);
            throw new Error(`Server balikin non-JSON (HTTP ${res.status}). Isi: ${preview}`);
        }

        if (!res.ok) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }

        currentLoadstring = data.loadstring;
        output.classList.remove('empty');
        output.textContent = currentLoadstring;
        btnCopy.disabled = false;
        setStatus('✅ Berhasil! Loadstring udah siap.', 'success');

    } catch (err) {
        output.classList.add('empty');
        output.textContent = 'Error. Cek status di bawah.';
        setStatus('❌ ' + err.message, 'error');
        console.error('[Convert Error]', err);
    } finally {
        btnConvert.disabled = false;
        btnConvert.textContent = '🔄 Convert & Upload';
    }
});

btnCopy.addEventListener('click', async () => {
    if (!currentLoadstring) return;
    try {
        await navigator.clipboard.writeText(currentLoadstring);
        setStatus('📋 Loadstring udah di-copy!', 'success');
        btnCopy.textContent = '✅ Copied!';
        setTimeout(() => { btnCopy.textContent = '📋 Copy Loadstring'; }, 2000);
    } catch (err) {
        setStatus('Gagal copy: ' + err.message, 'error');
    }
});

function setStatus(msg, type) {
    status.textContent = msg;
    status.className = 'status' + (type ? ' ' + type : '');
}
