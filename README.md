# Badge Admin

Badge uygulamasını uzaktan yönettiğin panel.

| Sayfa | Ne yapar |
|---|---|
| Genel bakış | Gösterilen ekran (Normal / Bakım / Ürün sayfası / Bekleme listesi), iOS ve Android durumu, bir sürümü test etme, son değişiklikler |
| Ekranlar | Bakım, Güncelleme gerekli, Ürün sayfası ve Bekleme listesi ekranları: gösterilecek ekranı seç, görsel/video yükle, metinleri düzenle, telefon önizlemesi |
| Bekleme listesi | Katılanlar (e-posta + tarih), arama, CSV indirme, kayıt silme |
| Sürüm ve mağaza linkleri | iOS → App Store, Android → Google Play linki; minimum ve en son sürüm; "herkesi güncellemeye zorla" |
| Özellikler | Sekmeleri gizleme ve açma, Help/Terms/Privacy linkleri |
| Mağaza | Ürün ekle, düzenle, sil, sırala; yıldız ürünü seç (uygulamada en önde, “Ürün sayfası” ekranında gösterilen). Her ürünün görselleri, stoğu, fiyatı, satın alma linki |
| İçerik | Animasyonlar (ekle, düzenle, dosyayı değiştir, sil), akıştaki gönderiler, uygulama metinleri |
| Medya | Onboarding videosu, logo, sembol, cihaz görselleri: önizle, değiştir, kaldır |
| Değişiklik kaydı | Kim neyi, ne zaman, neyden neye değiştirdi |
| Yöneticiler | Yönetici ekleme, rol değiştirme, çıkarma (sadece sahip) |

Silinen ya da değiştirilen her dosya Supabase Storage'dan da silinir. Dosya başka bir yerde hâlâ kullanılıyorsa silinmez.

## Dokploy'a kurulum (Docker Compose)

Compose'un imajı derleyebilmesi için kodun bir Git reposunda olması gerekir.

1. Bu klasörün içeriğini **özel (private)** bir GitHub reposuna yükle. Dosyalar reponun kök dizininde olmalı: `Dockerfile` ve `docker-compose.yml` en üstte.
2. Dokploy → Project → **Create Service → Compose**.
3. **General → Provider:** GitHub, ardından repoyu ve branch'i seç. **Compose Path:** `./docker-compose.yml`. **Compose Type:** Docker Compose (Stack değil).
4. **Environment** sekmesine şunları yaz:
   ```
   SUPABASE_URL=https://supabase.senindomainin.com
   SUPABASE_ANON_KEY=eyJ...
   ADMIN_TIMEZONE=Europe/Istanbul
   ```
5. **Domains → Add Domain:** host `admin.senindomainin.com`, service `badge-admin`, container port `3000`, HTTPS açık (Let's Encrypt).
6. **Deploy**. İlk derleme 2–4 dakika sürer.

`SUPABASE_URL` veya `SUPABASE_ANON_KEY` eksikse deploy, hangisinin eksik olduğunu yazan bir mesajla durur.

### Alternatif: Application + Dockerfile

Git kullanmak istemezsen **Create Service → Application** seç, Provider olarak **Drop** ile bu klasörün zip'ini yükle ve **Build Type** olarak **Dockerfile** seç. Environment ve Domain adımları aynı (port 3000).

## Giriş

Panele girebilmek için iki şey gerekir:

- Supabase'te bir kullanıcı: Studio → Authentication → Add user, *Auto Confirm* açık.
- Bu kullanıcının `admin_users` tablosunda kayıtlı olması:

```sql
insert into public.admin_users (user_id, email, role)
select id, email, 'owner' from auth.users where email = 'sen@mail.com';
```

| Rol | Yetki |
|---|---|
| `owner` | Her şey + yönetici ekleyip çıkarma |
| `admin` | Her şey (yönetici yönetimi hariç) |
| `editor` | Mağaza, içerik ve medya. Uygulama modu, sürüm, özellikler ve marka dosyalarını sadece görür. |

Roller hem panelde hem veritabanında (RLS) uygulanır: bir editör panel dışından, doğrudan Supabase API'siyle denese bile yetkisi olmayanı değiştiremez. Son sahip silinemez ya da düşürülemez, kimse kendini çıkaramaz.

## Güvenlik

- **Yetki veritabanında:** Panel `SERVICE_ROLE_KEY` kullanmaz. Her işlem, giriş yapan kişinin oturumuyla yapılır ve Supabase'teki kurallar (RLS) admin olmayanın yazmasını engeller. Panel hacklense bile admin olmayan bir hesapla hiçbir şey değiştirilemez.
- **Rol kontrolü:** Her sayfa ve her işlem sunucuda rol kontrolünden geçer.
- **Oturum çerezi:** `httpOnly`, `Secure` ve `SameSite=Lax`; sayfadaki JavaScript çereze erişemez.
- **Giriş denemesi sınırı:** IP başına 15 dakikada 20, aynı IP ve e-posta için 5 deneme. Panel kayıt (sign-up) sayfası içermez.
- **Güvenlik başlıkları:** Nonce tabanlı Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `noindex`.
- **Form istekleri:** Next.js server action'ları başka bir siteden gelen istekleri (Origin kontrolü) reddeder. Tüm girdiler sunucuda uzunluk ve biçim açısından doğrulanır.
- **Dosya yükleme:** Dosyanın türü uzantısına değil ilk baytlarına bakılarak bulunur. Kabul edilenler: PNG, JPG, WebP, GIF (en fazla 10 MB), MP4/MOV (en fazla 20 MB). SVG kabul edilmez, çünkü içinde script olabilir. Değiştirilen ya da silinen dosya başka bir yerde kullanılmıyorsa depolamadan da silinir.
- **Bağımlılıklar:** `npm audit` 0 açık. PostCSS güncel sürüme sabitlendi.
- **Container:** Root olmayan kullanıcı (uid 1001), salt okunur dosya sistemi, tüm Linux yetkileri kapalı (`cap_drop: ALL`), `no-new-privileges`, bellek ve işlem sınırı, healthcheck.
- **Kayıt:** Her değişiklik `audit_log` tablosunda tutulur.

### Supabase (Dokploy) yayın öncesi kontrol listesi

- [ ] `DISABLE_SIGNUP=true`: dışarıdan kimse hesap açamaz
- [ ] `JWT_SECRET` en az 32 karakter ve rastgele; `ANON_KEY` ile `SERVICE_ROLE_KEY` bu secret ile yeniden üretilmiş (template'teki demo anahtarlar değil)
- [ ] `POSTGRES_PASSWORD` ve `DASHBOARD_PASSWORD` güçlü ve benzersiz
- [ ] Postgres portu (5432) internete açık değil; sadece Docker ağı içinde
- [ ] Studio'ya sadece sen erişiyorsun (Dokploy'da ayrı domain + güçlü şifre, mümkünse IP kısıtı)
- [ ] `SERVICE_ROLE_KEY` hiçbir yerde kullanılmıyor (panel ve uygulama sadece `ANON_KEY` kullanır)
- [ ] Dokploy → Database Backups: Postgres için günlük yedek açık
- [ ] Güncelleme 1 ve Güncelleme 2 SQL'leri çalıştırıldı

## Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `SUPABASE_URL` | Evet | Supabase adresin |
| `SUPABASE_ANON_KEY` | Evet | Supabase anon anahtarı |
| `ADMIN_TIMEZONE` | Hayır | Tarih/saat gösterimi, varsayılan `Europe/Istanbul` |
| `COOKIE_SECURE` | Hayır | Varsayılan `true`. Sadece HTTPS'siz yerel testte `false` yap. |
| `ALLOWED_ORIGINS` | Hayır | Panel bir proxy arkasında farklı bir host adıyla açılıyorsa, virgülle ayrılmış domain listesi |

Bu değişkenler derleme sırasında değil, çalışma anında okunur. Değiştirirsen sadece yeniden başlatman yeter.

## Yerelde çalıştırma

```bash
cp .env.example .env.local   # değerleri doldur, COOKIE_SECURE=false ekle
npm install
npm run dev                  # http://localhost:3000
```
