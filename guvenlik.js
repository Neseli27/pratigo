// ==============================
// PRATİGO - Güvenlik Yardımcıları
// ==============================

// SHA-256 hash fonksiyonu (şifreleri düz metin saklamak yerine)
async function sifreHashle(sifre) {
    const encoder = new TextEncoder();
    const data = encoder.encode(sifre + '_pratigo_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// HTML Sanitize — XSS koruması
function guvenliHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Kısa alias
const GH = guvenliHTML;
