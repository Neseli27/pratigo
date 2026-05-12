# PRATİGO — Proje Dokümantasyonu (Claude Code İçin)

## Proje Özeti
AVM food court'larında sipariş ve takip sistemi. Müşteriler QR kod okutarak menü görür, sipariş verir, masada otururken "SİPARİŞİNİZ HAZIR" bildirimi alır. Uygulama indirme gerektirmez (PWA).

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (framework yok)
- **Backend:** Firebase Firestore (gerçek zamanlı veritabanı)
- **Hosting:** Vercel (statik dosya hosting, GitHub auto-deploy)
- **Repo:** GitHub — `Neseli27/pratigo`
- **PWA:** manifest.json + sw.js (service worker)

## Dosya Yapısı
```
pratigo/
├── index.html          # Ana sayfa (QR yönlendirme + landing + AVM/mekan keşif)
├── avm.html            # AVM restoran listesi (müşteri QR ile girer)
├── musteri.html        # Müşteri paneli (menü, sepet, sipariş takip)
├── kasiyer.html        # İşletme paneli (kasa, kuyruk, menü, rapor, ayar)
├── kayit.html          # İşletme kayıt formu (AVM seçimli)
├── admin.html          # Süper admin paneli
├── firebase-config.js  # Firebase yapılandırması (gerçek bilgiler içerir)
├── guvenlik.js         # SHA-256 hash + GH() HTML escape helper
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (cache version manuel bump)
├── firestore.indexes.json  # Firestore composite index tanımları
├── icon-192.png, icon-512.png  # PWA ikonları
└── vercel.json         # Vercel routing + security headers
```

## Vercel Routing (vercel.json)
```json
{
  "rewrites": [
    { "source": "/", "destination": "/index.html" },
    { "source": "/avm", "destination": "/avm.html" },
    { "source": "/musteri", "destination": "/musteri.html" },
    { "source": "/kasiyer", "destination": "/kasiyer.html" },
    { "source": "/kayit", "destination": "/kayit.html" },
    { "source": "/admin", "destination": "/admin.html" }
  ],
  "headers": [
    { "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

## Firebase Firestore Veri Yapısı

### Koleksiyonlar

#### `sistem`
```
sistem/admin
  - sifreHash: string (süper admin SHA-256 hash)
  - sifre: string (DEPRECATED — eski düz metin, ilk girişte hash'e migrate olur)
```

#### `avmler`
```
avmler/{avmId}  (ID = slug, örn: "primemall", "sanko")
  - ad: string ("Primemall AVM")
  - slug: string ("primemall")
  - sehir: string ("Gaziantep") — opsiyonel, şehir filtresi için
  - olusturma: timestamp
```

#### `isletmeler`
```
isletmeler/{autoId}
  - ad: string ("Burger House")
  - sifreHash: string (SHA-256 hash, primary auth)
  - sifre: string (DEPRECATED — ilk girişte sifreHash'e migrate)
  - avmId: string | undefined ("primemall" veya undefined = bağımsız mekan)
  - avmAdi: string | undefined ("Primemall AVM")
  - sehir: string ("Gaziantep") — bağımsız mekanlar için filtreleme/keşif
  - tur: string ("Restoran" | "Kafe" | "Pastane" | "Fırın" | "Fast Food" | "Döner / Kebap" | "Tatlıcı" | "Diğer")
  - yetkili: string
  - telefon: string
  - tanitim: string
  - durum: string ("aktif" | "askida")
  - kategoriler: array ["Burger Çeşitleri", "İçecekler", ...]
  - calismaSaatleri: map
      pazartesi: { acilis: "10:00", kapanis: "22:00", kapali: false }
      sali: { ... }
      ...
  - gunOzel: map
      "2026-03-23": { acilis: "11:00", kapanis: "20:00", kapali: false }
  - tapiSure: number | null (tahmini bekleme süresi, dakika)
  - tapiVeriSayisi: number (kaç siparişten hesaplandı)
  - tapiSonGuncelleme: timestamp
  - olusturma: timestamp
```

#### `isletmeler/{id}/menu` (alt koleksiyon)
```
menu/{autoId}
  - ad: string ("Classic Burger")
  - fiyat: number (120)
  - aciklama: string ("200gr köfte, patates dahil")
  - kategori: string ("Burger Çeşitleri") | "" (kategorisiz)
  - aktif: boolean
  - sira: number (sıralama)
  - olusturma: timestamp
```

#### `oturumlar`
```
oturumlar/{autoId}
  - isletmeId: string
  - isletmeAdi: string
  - avmId: string | null
  - aktif: boolean
  - kod: string | null ("472") — 3 haneli, kasaya gönderilince üretilir
  - kodGosterim: string | null ("472") — kod ile aynı; UI'da farklı format gerekirse ayrılabilir
  - sepet: array [{ id, ad, fiyat, adet }, ...]
  - sepetToplam: number
  - sepetKasada: boolean — (legacy, aktif kullanım yok)
  - siparisNotu: string — son sipariş notu (kasaya gönderince güncellenir)
  - olusturma: timestamp
```

#### `siparisler`
```
siparisler/{autoId}
  - isletmeId: string
  - oturumId: string
  - musteriKod: string ("472")
  - urunler: array [{ id, ad, fiyat, adet }, ...]
  - toplam: number
  - not: string (sipariş notu)
  - durum: string (aşağıdaki akışa bak)
  - kaynak: string ("musteri" | "kasiyer") — siparişi kim oluşturdu
  - siraNo: string ("84") — POS fiş sıra numarası (ödendi basıldığında girilir)
  - onayZaman: timestamp — onaylandı/odeme_bekliyor başlangıcı, 2dk geri sayım buradan
  - mutfagaGiris: timestamp (ödendi basıldığında)
  - hazirZaman: timestamp (hazır basıldığında)
  - beklemeDk: number (mutfağa giriş → hazır, dakika)
  - teslimZaman: timestamp (müşteri ALDIM bastığında)
  - iptalZaman: timestamp (iptal/sure_doldu/reddedildi anında)
  - iptalEden: string ("musteri" | "kasiyer" — opsiyonel)
  - puan: number (1-5, müşteri değerlendirmesi)
  - puanEtiket: string ("Kötü" | "Orta" | "İyi" | "Güzel" | "Muhteşem")
  - olusturma: timestamp
```

## Sipariş Durum Akışı

**Gerçek durum kümesi (kodda kullanılan):**
```
beklemede        → kasiyer onayını bekliyor (kasiyer.html Kuyruk sekmesi BEKLEYEN)
onaylandi        → ölü durum, kod yolunda kullanılmıyor (yer tutucu)
odeme_bekliyor   → kasiyer kabul etti, müşteri 2dk içinde ödeme yapmalı
hazirlaniyor     → ödeme alındı + sıra no girildi, mutfakta
hazir            → kasiyer HAZIR bastı, müşteri bildirim aldı
teslim_edildi    → müşteri ALDIM bastı (veya 5dk otomatik)
iptal            → manuel iptal (kasiyer veya müşteri)
sure_doldu       → 2dk ödeme süresi otomatik dolması
reddedildi       → onay_bekliyor durumundan müşteri reddi (akış nadiren kullanılır)
onay_bekliyor    → ölü durum, eski kasiyer→müşteri onay akışı için (artık doğrudan odeme_bekliyor'a alınıyor)
```

**Tipik akış (müşteri-başlatan):**
`beklemede → odeme_bekliyor (kasiyer onay) → hazirlaniyor (ödeme + sıra no) → hazir → teslim_edildi`

**Tipik akış (kasiyer-başlatan, "müşteriye gönder"):**
`odeme_bekliyor (onayZaman set) → hazirlaniyor → hazir → teslim_edildi`

İptal yolları her aşamada mümkün: `iptal` (manuel), `sure_doldu` (2dk timeout, sadece `odeme_bekliyor`'dan)

## Sayfa Detayları

### index.html (Ana Sayfa)
- `?avm=primemall` → AVM sayfasına yönlendir
- `?isletme=xxx` → Oturum oluştur, müşteri sayfasına yönlendir
- Parametresiz → Landing: AVM keşfi, bağımsız mekan listesi, arama, şehir filtresi, son ziyaretler (localStorage), CTA
- **AVM ve işletme listeleri `onSnapshot` ile canlı** — silinen/eklenen anında yansır

### avm.html (AVM Restoran Listesi)
- `?id=primemall` parametresi
- `onSnapshot` ile AVM'nin işletmeleri canlı
- Askıdaki işletmeleri göstermez
- Her kartta: baş harf, ad, açık/kapalı, tahmini bekleme süresi (3+ tamamlanmış sipariş gerekli)

### musteri.html (Müşteri Paneli)
- `?oturum=xxx&isletme=xxx&avm=xxx`
- Üstte işletme adı + çıkış (←, sepet doluyken onay sorar) ve bilgi (ℹ️) butonları
- Kategori chip'leri + şerit menü
- Accordion açıklama
- Sticky alt bar: sepet ikonu + toplam + "Kasaya Gönder"
- Kasaya gönderilince 3 haneli kod üretilir, **oturum sepeti temizlenir**
- **Sayfa yenilense bile sepet ve kod Firestore'dan geri yüklenir**
- Sipariş durumu gerçek zamanlı izlenir (en yeni siparişi `olusturma` DESC ile seçer)
- **Bildirim sesi/titreşim sadece durum-grubu değişimlerinde tetiklenir** (puan eklenmesi vs. retrig etmez)
- `odeme_bekliyor` durumunda 2dk geri sayım
- Hazır olunca: ses + titreşim + ALDIM butonu + 5dk geri sayım otomatik kapanma
- ALDIM sonrası: 5 yıldız değerlendirme

### kasiyer.html (İşletme Paneli — 5 sekme)
- localStorage `pratigo_isletme_id` ile otomatik giriş
- Giriş: işletme adı + şifre (hash; eski düz metin fallback)
- Sekmeler: **Kasa, Kuyruk, Menü, Rapor, Ayar**

**Kasa sekmesi:**
- Müşteri kodu girişi + "Sepeti Çek" + menü grid + sepet + MÜŞTERİYE GÖNDER

**Kuyruk sekmesi (kuyruk listener 7 gün sliding window, gece yarısı yeniden bind):**
- Üst: 3 özet kart (Bekleyen / Ödeme bekliyor / Mutfakta)
- BEKLEYEN: müşteri-başlatan, onayla/reddet butonu
- ÖDEME BEKLEYENLER: 2dk geri sayım, sıra no input + ÖDENDİ butonu, otomatik `sure_doldu`
- MUTFAKTA: sıra no, ilerleme bar (30sn'de bir canlı güncellenir), kalan süre, HAZIR butonu
- Her sipariş kartında not (varsa sarı kutucuk)

**Menü sekmesi:** kategori yönetimi + ürün ekleme/düzenleme/aktif-pasif/sil

**Rapor sekmesi:**
- Tarih seç + Getir → günün tamamlanan siparişleri
- Sipariş sayısı + Ciro + Memnuniyet (yıldız ortalaması)
- Her satırda: sıra no, saat, bekleme süresi, yıldız, ürünler, not

**Ayar sekmesi:** QR kod, işletme bilgileri, çalışma saatleri, bugüne özel saat

### admin.html (Süper Admin)
- Şifre ile giriş (`sistem/admin` dokümanı yoksa ilk girişte yeni şifre kaydeder — `sistem` koleksiyonu için Firestore rules açık olmalı)
- Sidebar: Dashboard, AVM'ler, İşletmeler, Ayarlar
- **İşletme silme:** menü subcollection + ilişkili oturumlar + ilişkili siparişler cascade siliniyor (400'lük batch'lerle)

### kayit.html (İşletme Kayıt)
- AVM dropdown (sadece AVM'li kayıt; bağımsız kayıt için admin paneli)
- İşletme adı, şifre (SHA-256 hash'lenir), tanıtım, yetkili, telefon

## Akıllı Tahmini Bekleme Süresi Algoritması
1. Sipariş "ödendi" → `mutfagaGiris` timestamp
2. Sipariş "hazır" → `hazirZaman`, fark `beklemeDk` olarak hesap
3. Son 7 günün tamamlanmış siparişleri (tek where + JS filtre)
4. 2+ saat anormal değerler atılır
5. 5'ten fazla veri varsa uçlar (min/max) çıkarılır
6. Ortalama → `isletmeler.tapiSure`
7. Min 3 veri olmadan tahmin gösterilmez
8. Müşteri ekranında 30sn'de bir, kasiyer mutfak listesinde de 30sn'de bir güncellenir

## Özel Bildirim Modal Sistemi
Hem `kasiyer.html`, `admin.html`, `musteri.html` standart bildirim modal'ı kullanır:
- `bildirimGoster(mesaj, ikon)`
- `basariBildirim(mesaj)` — ✅
- `hataBildirim(mesaj)` — ⚠️
- `onayGoster(mesaj, tehlikeli)` — Promise döner; `tehlikeli=true` ise "Sil" kırmızı butonu, aksi "Evet" turuncu

`alert()` / `confirm()` hiçbir sayfada kullanılmaz.

## Firestore Sorgu ve Index Kuralları

**Composite index gerektiren sorgular kullanılır** — `firestore.indexes.json` dosyasında tanımlı. Mevcut indexler (Firebase'de deploy edilmiş):
- `siparisler/isletmeId + olusturma` — kuyruk + rapor + ortalama hesabı
- `oturumlar/kod + aktif + isletmeId` — müşteri kod çakışma kontrolü, kasiyer "Sepeti Çek"
- `oturumlar/aktif + olusturma` — admin oturum temizliği
- `isletmeler/ad + sifreHash` — kasiyer giriş
- `isletmeler/ad + avmId` — kayıt sırasında çakışma kontrolü

**Index deploy:** `firebase deploy --only firestore:indexes --project egitim-yonetim-platformu` (geçici klasörde `firebase.json` + `firestore.indexes.json` ile).

**JS-side filtreleme:** Karmaşık AND koşulları yerine tek `where` + JS `Array.filter()` + `Array.sort()` kullanılır (örn. `siparisler` durum bazlı filtreleme).

**`orderBy` kullanımı:** Tek-alan `orderBy` (örn. `menu` `sira`) index gerektirmez, kullanılır. Multi-field `orderBy` composite index gerektirir.

## Firestore Security Rules

`egitim-yonetim-platformu` projesi başka uygulamalarla paylaşılıyor (MarketPas). PRATİGO koleksiyonları için açık erişim (`allow read, write: if true`) — auth altyapısı eklenmediği için.

**Kapatılan koleksiyonlar (PRATİGO):**
`avmler`, `isletmeler`, `isletmeler/{}/menu`, `oturumlar`, `siparisler`, `sistem`

**Deploy:** `C:\Users\murat\AppData\Local\Temp\pratigo-rules\firestore.rules` dosyasında full rules tutulur. `firebase deploy --only firestore:rules` ile yayınlanır. MarketPas kuralları aynen korunur.

## Tasarım Kuralları
- Koyu tema: `#0f172a` (body), `#1e293b` (paneller), `#334155` (border)
- Ana renk: `#f97316` (turuncu)
- Yeşil: `#22c55e`, Kırmızı: `#ef4444`, Mavi: `#3b82f6`
- Max-width: 1100px (admin, kasiyer), 500px (müşteri), 900px (index)
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (DM Sans index'te)
- Tüm sayfalar PWA uyumlu (manifest + SW + apple meta)

## Service Worker Yönetimi
`sw.js:1` `CACHE_NAME = 'pratigo-vN'` — **her büyük deploy öncesi N manuel bump** yapılır. Activate event eski cache'leri temizler. Network-first stratejisi var ama offline durumda eski sürüm gelmesin diye bump şart.

## Deployment Kuralları
- GitHub'a push → Vercel otomatik deploy
- `firebase-config.js` gerçek Firebase bilgileri içerir (commit'lenmiş)
- Sadece değişen dosyalar deploy edilir
- Murat local dev environment kullanmaz, direkt deploy eder
- Bilinen bug listesi ve önceki düzeltmeler için `git log --oneline` ye bak

## İleride Eklenebilecek Özellikler (Henüz yapılmadı)
- Push notification (FCM — şu an sadece sayfa açıkken bildirim var)
- AVM genelinde tek sepet (çoklu restoran)
- "Son siparişimi tekrarla" butonu
- İşletme logo/görsel
- Yoğunluk göstergesi (aktif sipariş sayısı AVM kartlarında)
- Firebase Auth + claim-based Firestore rules (şu an güvenlik açık)
- Şifre hash PBKDF2/bcrypt (şu an salt+SHA-256, GPU brute-force korumasız)
- Düz metin şifre fallback temizliği (tüm kullanıcılar migrate olduktan sonra)
- PRATİGO için ayrı Firebase projesi (şu an MarketPas vs. paylaşıyor)
- Sipariş için Cloud Function timer (şu an `sure_doldu` istemci-tarafında zorlanıyor)
- Yazıcı entegrasyonu, çoklu dil, sadakat puanı vs.
