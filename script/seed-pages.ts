import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const requiresSsl =
  /sslmode=require/i.test(url) ||
  /neon\.tech|supabase\.co|aivencloud\.com/i.test(url);
const allowInsecureSsl = process.env.DB_SSL_INSECURE === "true";

const client = new pg.Client({
  connectionString: url,
  ssl: requiresSsl ? { rejectUnauthorized: !allowInsecureSsl } : undefined,
});

await client.connect();
console.log("Connected to database");

interface LandingPage {
  name: string;
  html: string;
}

const pages: LandingPage[] = [
  // ============================================
  // 1. GOLF BLOG
  // ============================================
  {
    name: "Golf & Country Life Blog",
    html: `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Green Fairway - Golf & Country Life</title>
<meta name="description" content="Golf tutkunları için teknik ipuçları, saha incelemeleri ve ekipman rehberleri. Türkiye ve dünyadan golf haberleri.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Georgia',serif;background:#f8f6f1;color:#2c3e2d}
header{background:linear-gradient(135deg,#1a3a2a 0%,#2d5a3f 100%);padding:0}
.top-bar{background:#0f2219;padding:8px 0;text-align:center;font-size:12px;color:#8fbc8f;letter-spacing:2px;text-transform:uppercase}
nav{max-width:1100px;margin:0 auto;padding:18px 20px;display:flex;justify-content:space-between;align-items:center}
.logo{color:#c9dbb2;font-size:28px;font-weight:bold;letter-spacing:1px}
.logo span{color:#7cb342}
nav ul{list-style:none;display:flex;gap:28px}
nav a{color:#b8d4a8;text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase}
nav a:hover{color:#fff}
.hero{background:url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><rect fill="%23e8f5e9"/><circle cx="900" cy="200" r="180" fill="%23c8e6c9" opacity="0.5"/><circle cx="300" cy="300" r="120" fill="%23a5d6a7" opacity="0.3"/></svg>') center/cover;padding:80px 20px;text-align:center}
.hero h1{font-size:42px;color:#1a3a2a;margin-bottom:16px;line-height:1.3}
.hero p{font-size:18px;color:#4a6a4a;max-width:600px;margin:0 auto 30px;line-height:1.7}
.container{max-width:1100px;margin:0 auto;padding:50px 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:30px}
.card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);transition:transform .3s}
.card:hover{transform:translateY(-4px)}
.card-img{height:200px;background:linear-gradient(45deg,#2d5a3f,#4a8c5c);display:flex;align-items:center;justify-content:center;font-size:48px}
.card-body{padding:24px}
.card-tag{display:inline-block;background:#e8f5e9;color:#2e7d32;padding:4px 12px;border-radius:20px;font-size:12px;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px}
.card h3{font-size:20px;margin-bottom:10px;color:#1a3a2a;line-height:1.4}
.card p{color:#5a7a5a;font-size:14px;line-height:1.7}
.card-meta{margin-top:16px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:12px;color:#888}
.sidebar{background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 20px rgba(0,0,0,0.06)}
.sidebar h3{font-size:18px;margin-bottom:20px;color:#1a3a2a;padding-bottom:12px;border-bottom:2px solid #7cb342}
.sidebar ul{list-style:none}
.sidebar li{padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#5a7a5a}
.sidebar li:last-child{border:none}
.stats-bar{background:#1a3a2a;padding:40px 20px;margin:40px 0}
.stats-bar .container{display:flex;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:20px}
.stat{color:#fff}
.stat .num{font-size:36px;font-weight:bold;color:#7cb342}
.stat .label{font-size:13px;color:#8fbc8f;margin-top:4px;text-transform:uppercase;letter-spacing:1px}
footer{background:#0f2219;padding:40px 20px;text-align:center;color:#5a7a5a;font-size:13px}
footer a{color:#7cb342;text-decoration:none}
@media(max-width:768px){.hero h1{font-size:28px}nav ul{display:none}.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="top-bar">Est. 2019 — Premium Golf Content</div>
<header>
<nav>
<div class="logo">Green<span>Fairway</span></div>
<ul><li><a href="#">Ana Sayfa</a></li><li><a href="#">Sahalar</a></li><li><a href="#">Ekipman</a></li><li><a href="#">Teknik</a></li><li><a href="#">Haberler</a></li></ul>
</nav>
</header>
<div class="hero">
<h1>Golf Tutkunları İçin<br>Profesyonel İçerikler</h1>
<p>Türkiye'nin en kapsamlı golf blogu. Saha incelemeleri, ekipman testleri, swing teknikleri ve turnuva haberleri.</p>
</div>
<div class="container">
<div class="grid">
<div class="card"><div class="card-img">&#9971;</div><div class="card-body"><span class="card-tag">Teknik</span><h3>Driver Vuruşunda Mesafeyi Artırmanın 5 Yolu</h3><p>PGA antrenörlerinin önerdiği tekniklerle drive mesafenizi 20-30 yard artırabilirsiniz. Grip, duruş ve backswing detayları.</p><div class="card-meta"><span>12 Şubat 2026</span><span>8 dk okuma</span></div></div></div>
<div class="card"><div class="card-img" style="background:linear-gradient(45deg,#1565c0,#42a5f5)">&#127948;</div><div class="card-body"><span class="card-tag">Saha İnceleme</span><h3>Antalya Belek: Türkiye'nin Golf Cenneti</h3><p>15 şampiyonluk sahası ile Belek, Avrupa'nın en prestijli golf destinasyonlarından biri. Detaylı saha karşılaştırması.</p><div class="card-meta"><span>8 Şubat 2026</span><span>12 dk okuma</span></div></div></div>
<div class="card"><div class="card-img" style="background:linear-gradient(45deg,#37474f,#78909c)">&#127942;</div><div class="card-body"><span class="card-tag">Ekipman</span><h3>2026 Yılının En İyi Iron Setleri</h3><p>TaylorMade, Callaway ve Titleist'in yeni sezon iron setlerini detaylı test ettik. Performans, his ve fiyat karşılaştırması.</p><div class="card-meta"><span>5 Şubat 2026</span><span>10 dk okuma</span></div></div></div>
</div>
</div>
<div class="stats-bar"><div class="container"><div class="stat"><div class="num">2,400+</div><div class="label">Makale</div></div><div class="stat"><div class="num">85</div><div class="label">Saha İnceleme</div></div><div class="stat"><div class="num">150K</div><div class="label">Aylık Okuyucu</div></div><div class="stat"><div class="num">45</div><div class="label">Uzman Yazar</div></div></div></div>
<footer><p>&copy; 2026 GreenFairway Golf Blog. Tüm hakları saklıdır. | <a href="#">Gizlilik</a> | <a href="#">İletişim</a></p></footer>
</body>
</html>`,
  },

  // ============================================
  // 2. FITNESS / SPOR BLOG
  // ============================================
  {
    name: "Fitness & Spor Yaşam",
    html: `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FitZone - Fitness, Beslenme & Sağlıklı Yaşam</title>
<meta name="description" content="Antrenman programları, beslenme rehberleri ve sağlıklı yaşam önerileri. Uzman eğitmenlerden fitness ipuçları.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0}
header{background:#111;border-bottom:1px solid #222}
nav{max-width:1100px;margin:0 auto;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:26px;font-weight:800;color:#fff}
.logo span{color:#ff4444}
nav ul{list-style:none;display:flex;gap:24px}
nav a{color:#999;text-decoration:none;font-size:13px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600}
nav a:hover{color:#ff4444}
.hero{background:linear-gradient(135deg,#1a0000 0%,#330000 50%,#0a0a0a 100%);padding:80px 20px;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-50%;right:-20%;width:600px;height:600px;background:radial-gradient(circle,rgba(255,68,68,0.1) 0%,transparent 70%);border-radius:50%}
.hero h1{font-size:48px;font-weight:900;margin-bottom:16px;background:linear-gradient(135deg,#fff,#ff6b6b);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:17px;color:#888;max-width:550px;margin:0 auto 32px;line-height:1.7}
.btn{display:inline-block;background:linear-gradient(135deg,#ff4444,#cc0000);color:#fff;padding:14px 36px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:1px}
.container{max-width:1100px;margin:0 auto;padding:60px 20px}
.section-title{text-align:center;margin-bottom:40px}
.section-title h2{font-size:32px;font-weight:800;color:#fff;margin-bottom:8px}
.section-title p{color:#666;font-size:15px}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
.card{background:#151515;border:1px solid #222;border-radius:16px;overflow:hidden;transition:border-color .3s}
.card:hover{border-color:#ff4444}
.card-visual{height:180px;display:flex;align-items:center;justify-content:center;font-size:56px}
.card-body{padding:24px}
.badge{display:inline-block;background:rgba(255,68,68,0.15);color:#ff6b6b;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
.card h3{font-size:18px;margin-bottom:10px;font-weight:700;color:#fff}
.card p{color:#777;font-size:14px;line-height:1.7}
.programs{background:#111;padding:60px 20px;margin:40px 0}
.program-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;max-width:1100px;margin:0 auto}
.program{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:28px;text-align:center}
.program-icon{font-size:40px;margin-bottom:12px}
.program h4{color:#fff;margin-bottom:6px;font-size:16px}
.program p{color:#666;font-size:13px}
.testimonial{max-width:700px;margin:60px auto;text-align:center;padding:40px;background:#151515;border-radius:16px;border:1px solid #222}
.testimonial p{font-size:18px;font-style:italic;color:#ccc;line-height:1.8;margin-bottom:16px}
.testimonial .author{color:#ff4444;font-weight:700;font-size:14px}
footer{background:#080808;border-top:1px solid #1a1a1a;padding:30px 20px;text-align:center;color:#444;font-size:13px}
@media(max-width:768px){.hero h1{font-size:30px}nav ul{display:none}}
</style>
</head>
<body>
<header><nav><div class="logo">FIT<span>ZONE</span></div><ul><li><a href="#">Antrenman</a></li><li><a href="#">Beslenme</a></li><li><a href="#">Programlar</a></li><li><a href="#">Blog</a></li></ul></nav></header>
<div class="hero"><h1>Güçlü Ol.<br>Sağlıklı Kal.</h1><p>Kişisel antrenman programları, uzman beslenme rehberleri ve motivasyon içerikleriyle fitness hedeflerine ulaş.</p><a href="#" class="btn">Ücretsiz Program Al</a></div>
<div class="container">
<div class="section-title"><h2>Son Yazılar</h2><p>Uzman eğitmenlerimizden güncel içerikler</p></div>
<div class="grid3">
<div class="card"><div class="card-visual" style="background:linear-gradient(135deg,#1a1a2e,#16213e)">&#128170;</div><div class="card-body"><span class="badge">Antrenman</span><h3>Evde Yapabileceğin 30 Dakikalık HIIT Programı</h3><p>Ekipmansız, etkili ve hızlı. Yağ yakımını hızlandıran yüksek yoğunluklu interval antrenman rehberi.</p></div></div>
<div class="card"><div class="card-visual" style="background:linear-gradient(135deg,#1a2e1a,#213e21)">&#129367;</div><div class="card-body"><span class="badge">Beslenme</span><h3>Kas Yapımında Protein Rehberi: Ne Kadar, Ne Zaman?</h3><p>Günlük protein ihtiyacı, en iyi kaynaklar ve öğün zamanlama stratejileri hakkında bilimsel rehber.</p></div></div>
<div class="card"><div class="card-visual" style="background:linear-gradient(135deg,#2e1a2e,#3e2140)">&#129495;</div><div class="card-body"><span class="badge">Motivasyon</span><h3>Antrenman Motivasyonunu Kaybetmemenin 7 Sırrı</h3><p>Spor psikologlarının önerdiği tekniklerle sürdürülebilir fitness alışkanlığı oluşturma rehberi.</p></div></div>
</div>
</div>
<div class="programs"><div class="section-title"><h2>Programlarımız</h2><p>Seviyene uygun antrenman planları</p></div>
<div class="program-grid">
<div class="program"><div class="program-icon">&#127939;</div><h4>Başlangıç</h4><p>Spora yeni başlayanlar için 8 haftalık temel program</p></div>
<div class="program"><div class="program-icon">&#127947;</div><h4>Kas Yapımı</h4><p>Hipertrofi odaklı 12 haftalık gelişmiş program</p></div>
<div class="program"><div class="program-icon">&#9889;</div><h4>Yağ Yakımı</h4><p>Kardiyo + kuvvet kombine 10 haftalık shred programı</p></div>
<div class="program"><div class="program-icon">&#129506;</div><h4>Esneklik</h4><p>Yoga & mobilite ile hareket kaliteni artır</p></div>
</div></div>
<footer><p>&copy; 2026 FitZone. Tüm hakları saklıdır. Sağlıklı yaşam rehberiniz.</p></footer>
</body>
</html>`,
  },

  // ============================================
  // 3. TAKSİ / ULAŞIM HİZMETİ
  // ============================================
  {
    name: "Taksi & Transfer Hizmeti",
    html: `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TaksiGo - Güvenli ve Konforlu Ulaşım</title>
<meta name="description" content="7/24 taksi ve VIP transfer hizmeti. Havalimanı transferi, şehirlerarası yolculuk ve kurumsal ulaşım çözümleri.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#333}
header{background:#fff;box-shadow:0 2px 20px rgba(0,0,0,0.08);position:sticky;top:0;z-index:100}
nav{max-width:1100px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:26px;font-weight:800;color:#1a1a1a}
.logo span{color:#ffc107}
nav ul{list-style:none;display:flex;gap:28px}
nav a{color:#555;text-decoration:none;font-size:14px;font-weight:500}
nav a:hover{color:#ffc107}
.hero{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:80px 20px;position:relative;overflow:hidden}
.hero-content{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}
.hero h1{font-size:44px;font-weight:800;color:#fff;line-height:1.2;margin-bottom:16px}
.hero h1 span{color:#ffc107}
.hero p{font-size:17px;color:#8899aa;line-height:1.7;margin-bottom:30px}
.hero-form{background:#fff;border-radius:16px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.hero-form h3{font-size:20px;margin-bottom:20px;color:#1a1a1a}
.form-group{margin-bottom:16px}
.form-group label{display:block;font-size:13px;color:#777;margin-bottom:6px;font-weight:600}
.form-group input,.form-group select{width:100%;padding:12px 16px;border:2px solid #eee;border-radius:10px;font-size:15px;outline:none;transition:border-color .3s}
.form-group input:focus{border-color:#ffc107}
.btn-yellow{width:100%;background:linear-gradient(135deg,#ffc107,#ff9800);color:#1a1a1a;padding:14px;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:1px}
.features{max-width:1100px;margin:0 auto;padding:60px 20px}
.features-title{text-align:center;margin-bottom:40px}
.features-title h2{font-size:30px;font-weight:800;margin-bottom:8px}
.features-title p{color:#888;font-size:15px}
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}
.feat{text-align:center;padding:32px 20px;border-radius:16px;background:#fafafa;border:1px solid #f0f0f0}
.feat-icon{font-size:40px;margin-bottom:12px}
.feat h4{font-size:17px;margin-bottom:8px;color:#1a1a1a}
.feat p{font-size:13px;color:#888;line-height:1.6}
.prices{background:#1a1a2e;padding:60px 20px}
.price-grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.price-card{background:#222;border-radius:16px;padding:32px;text-align:center;border:1px solid #333}
.price-card.popular{border-color:#ffc107;position:relative}
.price-card h4{color:#fff;font-size:18px;margin-bottom:6px}
.price-card .price{font-size:36px;font-weight:800;color:#ffc107;margin:16px 0}
.price-card .price small{font-size:14px;color:#888}
.price-card ul{list-style:none;text-align:left;margin:20px 0}
.price-card li{padding:8px 0;color:#aaa;font-size:14px;border-bottom:1px solid #2a2a2a}
.price-card li::before{content:'\\2713';color:#ffc107;margin-right:8px}
footer{background:#111;padding:30px 20px;text-align:center;color:#555;font-size:13px}
@media(max-width:768px){.hero-content{grid-template-columns:1fr}.hero h1{font-size:28px}nav ul{display:none}}
</style>
</head>
<body>
<header><nav><div class="logo">Taksi<span>Go</span></div><ul><li><a href="#">Hizmetler</a></li><li><a href="#">Fiyatlar</a></li><li><a href="#">Kurumsal</a></li><li><a href="#">İletişim</a></li></ul></nav></header>
<div class="hero"><div class="hero-content">
<div><h1>Her Yere <span>Güvenle</span> Ulaşın</h1><p>7/24 profesyonel taksi ve VIP transfer hizmeti. Havalimanı, şehirlerarası ve kurumsal ulaşım çözümleri.</p></div>
<div class="hero-form"><h3>Hızlı Fiyat Al</h3><div class="form-group"><label>Nereden</label><input type="text" placeholder="Biniş noktası"></div><div class="form-group"><label>Nereye</label><input type="text" placeholder="Varış noktası"></div><div class="form-group"><label>Araç Tipi</label><select><option>Standart Taksi</option><option>VIP Sedan</option><option>Minivan (7 kişi)</option></select></div><button class="btn-yellow">Fiyat Hesapla</button></div>
</div></div>
<div class="features"><div class="features-title"><h2>Neden TaksiGo?</h2><p>Binlerce müşterinin güvendiği ulaşım platformu</p></div>
<div class="feat-grid">
<div class="feat"><div class="feat-icon">&#128663;</div><h4>Geniş Araç Filosu</h4><p>Sedan, SUV, minivan ve lüks araçlardan oluşan geniş filomuz</p></div>
<div class="feat"><div class="feat-icon">&#128336;</div><h4>7/24 Hizmet</h4><p>Gece gündüz her an ulaşımınız için hazırız</p></div>
<div class="feat"><div class="feat-icon">&#128179;</div><h4>Sabit Fiyat</h4><p>Trafik ne olursa olsun anlaştığınız fiyat değişmez</p></div>
<div class="feat"><div class="feat-icon">&#11088;</div><h4>Profesyonel Sürücüler</h4><p>Deneyimli, güler yüzlü ve güvenlik sertifikalı şoförler</p></div>
</div></div>
<div class="prices"><div class="features-title"><h2 style="color:#fff">Popüler Rotalar</h2><p>Sabit fiyatlı transfer hizmetleri</p></div>
<div class="price-grid">
<div class="price-card"><h4>Havalimanı Transfer</h4><div class="price">₺350<small>/tek yön</small></div><ul><li>Karşılama hizmeti</li><li>Bagaj yardımı</li><li>15 dk ücretsiz bekleme</li></ul></div>
<div class="price-card popular"><h4>Şehir İçi VIP</h4><div class="price">₺200<small>/saat</small></div><ul><li>Lüks sedan araç</li><li>Profesyonel şoför</li><li>Su ve ikram</li></ul></div>
<div class="price-card"><h4>Şehirlerarası</h4><div class="price">₺1,500<small>/gidiş</small></div><ul><li>Door-to-door hizmet</li><li>Mola imkanı</li><li>İptal güvencesi</li></ul></div>
</div></div>
<footer><p>&copy; 2026 TaksiGo Ulaşım Hizmetleri A.Ş. Tüm hakları saklıdır.</p></footer>
</body>
</html>`,
  },

  // ============================================
  // 4. YEMEK / RESTORAN BLOG
  // ============================================
  {
    name: "Yemek & Mutfak Rehberi",
    html: `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lezzet Durağı - Tarifler, Restoranlar & Mutfak Kültürü</title>
<meta name="description" content="En lezzetli tarifler, restoran önerileri ve mutfak kültürü yazıları. Türk ve dünya mutfağından seçme içerikler.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Georgia',serif;background:#faf8f5;color:#3a2e26}
header{background:#fff;border-bottom:1px solid #eee}
nav{max-width:1100px;margin:0 auto;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:28px;font-weight:bold;color:#c0392b}
.logo span{color:#3a2e26}
nav ul{list-style:none;display:flex;gap:24px}
nav a{color:#777;text-decoration:none;font-size:14px;font-weight:500}
.hero{background:linear-gradient(135deg,#c0392b 0%,#e74c3c 50%,#d35400 100%);padding:70px 20px;text-align:center;color:#fff}
.hero h1{font-size:42px;margin-bottom:12px;font-style:italic}
.hero p{font-size:17px;opacity:.85;max-width:500px;margin:0 auto}
.container{max-width:1100px;margin:0 auto;padding:50px 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:28px}
.recipe{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 15px rgba(0,0,0,0.05)}
.recipe-img{height:200px;display:flex;align-items:center;justify-content:center;font-size:64px}
.recipe-body{padding:22px}
.recipe-cat{font-size:11px;color:#c0392b;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:8px}
.recipe h3{font-size:20px;margin-bottom:8px;line-height:1.4}
.recipe p{color:#888;font-size:14px;line-height:1.7}
.recipe-info{display:flex;gap:16px;margin-top:14px;font-size:12px;color:#aaa}
.recipe-info span{display:flex;align-items:center;gap:4px}
.categories{background:#3a2e26;padding:50px 20px}
.cat-grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px}
.cat-item{text-align:center;padding:28px 16px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#fff;transition:background .3s;cursor:pointer}
.cat-item:hover{background:rgba(255,255,255,0.12)}
.cat-item .icon{font-size:32px;margin-bottom:8px}
.cat-item span{font-size:13px}
footer{background:#2c2017;padding:30px;text-align:center;color:#776;font-size:13px}
@media(max-width:768px){.hero h1{font-size:28px}nav ul{display:none}}
</style>
</head>
<body>
<header><nav><div class="logo">Lezzet<span>Durağı</span></div><ul><li><a href="#">Tarifler</a></li><li><a href="#">Restoranlar</a></li><li><a href="#">Şefler</a></li><li><a href="#">Kültür</a></li></ul></nav></header>
<div class="hero"><h1>Damak Tadına Yolculuk</h1><p>Geleneksel Türk mutfağından dünya lezzetlerine, tarifler ve hikayeler</p></div>
<div class="container">
<div class="grid">
<div class="recipe"><div class="recipe-img" style="background:linear-gradient(135deg,#d35400,#e67e22)">&#127858;</div><div class="recipe-body"><div class="recipe-cat">Ana Yemek</div><h3>Gerçek İskender Kebabın Sırrı</h3><p>Bursa'nın efsanevi lezzeti İskender kebabı evde yapmak için adım adım rehber. Tereyağı sosu ve yoğurt uyumu.</p><div class="recipe-info"><span>&#9201; 45 dk</span><span>&#127860; 4 kişilik</span><span>&#11088; Orta</span></div></div></div>
<div class="recipe"><div class="recipe-img" style="background:linear-gradient(135deg,#27ae60,#2ecc71)">&#129367;</div><div class="recipe-body"><div class="recipe-cat">Sağlıklı</div><h3>Quinoa & Avokado Buddha Bowl</h3><p>Hafif, besleyici ve görsel olarak muhteşem. Vejetaryen dostu süper besin kasesi tarifi.</p><div class="recipe-info"><span>&#9201; 20 dk</span><span>&#127860; 2 kişilik</span><span>&#11088; Kolay</span></div></div></div>
<div class="recipe"><div class="recipe-img" style="background:linear-gradient(135deg,#8e44ad,#9b59b6)">&#127856;</div><div class="recipe-body"><div class="recipe-cat">Tatlı</div><h3>San Sebastian Cheesecake</h3><p>Dünyayı kasıp kavuran yanık cheesecake tarifi. 5 malzeme, sınırsız lezzet.</p><div class="recipe-info"><span>&#9201; 60 dk</span><span>&#127860; 8 kişilik</span><span>&#11088; Kolay</span></div></div></div>
</div>
</div>
<div class="categories"><div class="cat-grid">
<div class="cat-item"><div class="icon">&#127830;</div><span>Türk Mutfağı</span></div>
<div class="cat-item"><div class="icon">&#127843;</div><span>İtalyan</span></div>
<div class="cat-item"><div class="icon">&#127835;</div><span>Asya</span></div>
<div class="cat-item"><div class="icon">&#129386;</div><span>Vegan</span></div>
<div class="cat-item"><div class="icon">&#127874;</div><span>Tatlılar</span></div>
<div class="cat-item"><div class="icon">&#127862;</div><span>İçecekler</span></div>
</div></div>
<footer><p>&copy; 2026 Lezzet Durağı. Afiyet olsun!</p></footer>
</body>
</html>`,
  },

  // ============================================
  // 5. SEYAHAT / TURİZM
  // ============================================
  {
    name: "Seyahat & Gezi Rehberi",
    html: `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gezenti - Seyahat & Keşif Rehberi</title><meta name="description" content="Türkiye ve dünyadan gezi rehberleri, otel incelemeleri ve seyahat ipuçları."><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;color:#333}header{background:transparent;position:absolute;top:0;left:0;right:0;z-index:10}nav{max-width:1100px;margin:0 auto;padding:20px;display:flex;justify-content:space-between;align-items:center}nav .logo{font-size:28px;font-weight:800;color:#fff}.logo span{color:#00bcd4}nav ul{list-style:none;display:flex;gap:24px}nav a{color:rgba(255,255,255,.8);text-decoration:none;font-size:14px}.hero{height:70vh;min-height:450px;background:linear-gradient(135deg,#0d2137 0%,#1a3a5c 50%,#0d4a6b 100%);display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;position:relative;overflow:hidden}.hero::before{content:'';position:absolute;bottom:-5%;left:0;right:0;height:80px;background:#f5f5f5;border-radius:50% 50% 0 0}.hero h1{font-size:48px;color:#fff;margin-bottom:14px;font-weight:800}.hero p{color:rgba(255,255,255,.7);font-size:18px;max-width:550px;margin:0 auto 28px}.search-box{max-width:600px;margin:0 auto;display:flex;background:#fff;border-radius:50px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.3)}.search-box input{flex:1;border:none;padding:16px 24px;font-size:15px;outline:none}.search-box button{background:#00bcd4;color:#fff;border:none;padding:16px 32px;font-weight:700;font-size:14px;cursor:pointer}.container{max-width:1100px;margin:0 auto;padding:50px 20px}.section-head{text-align:center;margin-bottom:36px}.section-head h2{font-size:30px;font-weight:800;margin-bottom:6px}.section-head p{color:#888;font-size:15px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}.dest{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 15px rgba(0,0,0,.06);transition:transform .3s}.dest:hover{transform:translateY(-6px)}.dest-img{height:200px;display:flex;align-items:flex-end;padding:20px;color:#fff;font-size:14px}.dest-body{padding:20px}.dest h3{font-size:18px;margin-bottom:6px}.dest p{color:#888;font-size:14px;line-height:1.6}.dest-meta{display:flex;justify-content:space-between;margin-top:12px;font-size:12px;color:#aaa}footer{background:#0d2137;color:#5a7a9a;padding:30px;text-align:center;font-size:13px;margin-top:40px}@media(max-width:768px){.hero h1{font-size:28px}nav ul{display:none}.search-box{flex-direction:column;border-radius:16px}}</style></head><body>
<header><nav><div class="logo">Gez<span>enti</span></div><ul><li><a href="#">Destinasyonlar</a></li><li><a href="#">Oteller</a></li><li><a href="#">Rehberler</a></li><li><a href="#">Blog</a></li></ul></nav></header>
<div class="hero"><div><h1>Dünyayı Keşfet</h1><p>Eşsiz destinasyonlar, yerel deneyimler ve pratik seyahat rehberleri</p><div class="search-box"><input type="text" placeholder="Nereyi keşfetmek istersin?"><button>Ara</button></div></div></div>
<div class="container"><div class="section-head"><h2>Popüler Destinasyonlar</h2><p>En çok okunan gezi rehberlerimiz</p></div>
<div class="grid">
<div class="dest"><div class="dest-img" style="background:linear-gradient(to top,rgba(0,0,0,.6),transparent),linear-gradient(135deg,#1a237e,#283593)"><span>&#127471;&#127481; Türkiye</span></div><div class="dest-body"><h3>Kapadokya: Peri Bacalarında 3 Gün</h3><p>Balon turu, yeraltı şehirleri ve butik otel önerileriyle Kapadokya rehberi.</p><div class="dest-meta"><span>5 gün önce</span><span>15 dk okuma</span></div></div></div>
<div class="dest"><div class="dest-img" style="background:linear-gradient(to top,rgba(0,0,0,.6),transparent),linear-gradient(135deg,#004d40,#00695c)"><span>&#127470;&#127481; İtalya</span></div><div class="dest-body"><h3>Roma'da Bir Hafta: Antik Lezzetler</h3><p>Colosseum'dan Trastevere sokaklarına, Roma'nın en otantik deneyimleri.</p><div class="dest-meta"><span>1 hafta önce</span><span>12 dk okuma</span></div></div></div>
<div class="dest"><div class="dest-img" style="background:linear-gradient(to top,rgba(0,0,0,.6),transparent),linear-gradient(135deg,#bf360c,#e65100)"><span>&#127471;&#127477; Japonya</span></div><div class="dest-body"><h3>Tokyo & Kyoto: Gelenek ve Gelecek</h3><p>Tapınaklar, neon ışıklar ve ramen. Japonya'ya ilk kez gidenler için rehber.</p><div class="dest-meta"><span>2 hafta önce</span><span>20 dk okuma</span></div></div></div>
</div></div>
<footer><p>&copy; 2026 Gezenti Seyahat Rehberi. Keşfetmeye devam edin.</p></footer>
</body></html>`,
  },

  // ============================================
  // 6. TEKNOLOJİ BLOG
  // ============================================
  {
    name: "Teknoloji & Dijital Dünya",
    html: `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TeknoBase - Teknoloji Haberleri & İncelemeler</title><meta name="description" content="Güncel teknoloji haberleri, ürün incelemeleri, yazılım rehberleri ve yapay zeka gelişmeleri."><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0f13;color:#e0e0e0}header{background:#16161d;border-bottom:1px solid #2a2a35}nav{max-width:1100px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;align-items:center}.logo{font-size:24px;font-weight:800;color:#fff}.logo span{color:#6c5ce7}nav ul{list-style:none;display:flex;gap:22px}nav a{color:#888;text-decoration:none;font-size:13px;text-transform:uppercase;letter-spacing:1px}.hero{max-width:1100px;margin:40px auto;padding:0 20px}.featured{background:linear-gradient(135deg,#1a1a2e,#2d1b69);border-radius:20px;padding:48px;display:grid;grid-template-columns:1.5fr 1fr;gap:30px;align-items:center}.featured-badge{display:inline-block;background:#6c5ce7;color:#fff;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}.featured h1{font-size:34px;font-weight:800;color:#fff;line-height:1.3;margin-bottom:12px}.featured p{color:#aaa;font-size:15px;line-height:1.7}.featured-visual{height:240px;background:linear-gradient(135deg,#6c5ce7,#a29bfe);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:72px}.container{max-width:1100px;margin:0 auto;padding:40px 20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}.card{background:#16161d;border:1px solid #2a2a35;border-radius:14px;overflow:hidden;transition:border-color .3s}.card:hover{border-color:#6c5ce7}.card-top{height:160px;display:flex;align-items:center;justify-content:center;font-size:48px}.card-body{padding:20px}.tag{display:inline-block;font-size:10px;color:#6c5ce7;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:8px}.card h3{font-size:17px;color:#fff;margin-bottom:8px;line-height:1.4}.card p{color:#777;font-size:13px;line-height:1.6}.card-foot{padding:12px 20px;border-top:1px solid #2a2a35;display:flex;justify-content:space-between;font-size:12px;color:#555}footer{border-top:1px solid #1a1a25;padding:28px;text-align:center;color:#444;font-size:13px;margin-top:40px}@media(max-width:768px){.featured{grid-template-columns:1fr;padding:28px}.featured h1{font-size:24px}nav ul{display:none}}</style></head><body>
<header><nav><div class="logo">Tekno<span>Base</span></div><ul><li><a href="#">Haberler</a></li><li><a href="#">İnceleme</a></li><li><a href="#">Yapay Zeka</a></li><li><a href="#">Yazılım</a></li></ul></nav></header>
<div class="hero"><div class="featured"><div><span class="featured-badge">Manşet</span><h1>Apple Vision Pro 2: Artırılmış Gerçeklik Yeni Seviyede</h1><p>Apple'ın ikinci nesil karma gerçeklik başlığı daha hafif, daha güçlü ve daha uygun fiyatıyla geliyor. Detaylı inceleme.</p></div><div class="featured-visual">&#128374;</div></div></div>
<div class="container">
<div class="grid">
<div class="card"><div class="card-top" style="background:linear-gradient(135deg,#00b894,#00cec9)">&#129302;</div><div class="card-body"><span class="tag">Yapay Zeka</span><h3>ChatGPT-5 Ne Zaman Geliyor? Bilinen Her Şey</h3><p>OpenAI'nin yeni nesil dil modeli hakkında sızan bilgiler ve beklentiler.</p></div><div class="card-foot"><span>4 Mart 2026</span><span>6 dk</span></div></div>
<div class="card"><div class="card-top" style="background:linear-gradient(135deg,#e17055,#fdcb6e)">&#128241;</div><div class="card-body"><span class="tag">İnceleme</span><h3>Samsung Galaxy S26 Ultra İnceleme</h3><p>Yapay zeka destekli kamera, Snapdragon 8 Gen 5 ve titanium tasarım.</p></div><div class="card-foot"><span>2 Mart 2026</span><span>10 dk</span></div></div>
<div class="card"><div class="card-top" style="background:linear-gradient(135deg,#636e72,#2d3436)">&#128187;</div><div class="card-body"><span class="tag">Yazılım</span><h3>2026'da Öğrenmeniz Gereken 5 Programlama Dili</h3><p>Python, Rust, Go, TypeScript ve Zig. Kariyer odaklı dil seçim rehberi.</p></div><div class="card-foot"><span>28 Şubat 2026</span><span>8 dk</span></div></div>
</div></div>
<footer><p>&copy; 2026 TeknoBase. Dijital dünyanın nabzını tutun.</p></footer>
</body></html>`,
  },

  // ============================================
  // 7. SAĞLIK & WELLNESS
  // ============================================
  {
    name: "Sağlık & Wellness Rehberi",
    html: `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VitaLife - Sağlık, Wellness & İyi Yaşam</title><meta name="description" content="Sağlıklı yaşam rehberi. Beslenme, egzersiz, mental sağlık ve doğal yaşam önerileri."><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Georgia',serif;background:#f9faf8;color:#2d3a2d}header{background:#fff;box-shadow:0 1px 10px rgba(0,0,0,.04)}nav{max-width:1100px;margin:0 auto;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}.logo{font-size:26px;color:#2d6a4f;font-weight:700}.logo span{font-weight:400;color:#95d5b2}nav ul{list-style:none;display:flex;gap:24px}nav a{color:#777;text-decoration:none;font-size:14px}.hero{background:linear-gradient(135deg,#d8f3dc,#b7e4c7,#95d5b2);padding:70px 20px;text-align:center}.hero h1{font-size:40px;color:#1b4332;margin-bottom:12px;font-style:italic}.hero p{font-size:17px;color:#40916c;max-width:500px;margin:0 auto}.container{max-width:1100px;margin:0 auto;padding:50px 20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}.article{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04)}.article-img{height:180px;display:flex;align-items:center;justify-content:center;font-size:56px}.article-body{padding:22px}.article-cat{font-size:11px;color:#2d6a4f;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:8px}.article h3{font-size:19px;line-height:1.4;margin-bottom:8px;color:#1b4332}.article p{color:#777;font-size:14px;line-height:1.7}.tips{background:#1b4332;padding:50px 20px;margin:40px 0}.tips-grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}.tip{text-align:center;padding:24px;color:#d8f3dc}.tip-icon{font-size:36px;margin-bottom:10px}.tip h4{font-size:15px;margin-bottom:6px;color:#95d5b2}.tip p{font-size:12px;color:#52796f;line-height:1.6}footer{background:#1b4332;padding:28px;text-align:center;color:#52796f;font-size:13px}@media(max-width:768px){.hero h1{font-size:28px}nav ul{display:none}}</style></head><body>
<header><nav><div class="logo">Vita<span>Life</span></div><ul><li><a href="#">Beslenme</a></li><li><a href="#">Egzersiz</a></li><li><a href="#">Mental Sağlık</a></li><li><a href="#">Doğal Yaşam</a></li></ul></nav></header>
<div class="hero"><h1>Bedeninize ve Zihninize İyi Bakın</h1><p>Bilimsel temelli sağlık rehberleri, doğal yaşam önerileri ve wellness ipuçları</p></div>
<div class="container"><div class="grid">
<div class="article"><div class="article-img" style="background:linear-gradient(135deg,#a8dadc,#457b9d)">&#129504;</div><div class="article-body"><div class="article-cat">Mental Sağlık</div><h3>Stresle Başa Çıkmanın Bilimsel Yolları</h3><p>Nörobilim araştırmalarına dayanan pratik stres yönetimi teknikleri ve günlük rutinler.</p></div></div>
<div class="article"><div class="article-img" style="background:linear-gradient(135deg,#ffd166,#ef476f)">&#129382;</div><div class="article-body"><div class="article-cat">Beslenme</div><h3>Bağırsak Sağlığı: İkinci Beyninizi Tanıyın</h3><p>Mikrobiyom dengesinin genel sağlık üzerindeki etkisi ve probiyotik rehberi.</p></div></div>
<div class="article"><div class="article-img" style="background:linear-gradient(135deg,#bee1e6,#dfe7fd)">&#128716;</div><div class="article-body"><div class="article-cat">Uyku</div><h3>Kaliteli Uyku İçin 10 Bilimsel Öneri</h3><p>Sirkadiyen ritim, uyku hijyeni ve yatak odası düzeni hakkında uzman tavsiyeleri.</p></div></div>
</div></div>
<div class="tips"><div class="tips-grid">
<div class="tip"><div class="tip-icon">&#128167;</div><h4>Günde 2-3 Litre Su</h4><p>Hücre yenilenmesi ve toksin atılımı için yeterli su tüketimi şart</p></div>
<div class="tip"><div class="tip-icon">&#127774;</div><h4>Güneş Işığı</h4><p>D vitamini üretimi için günde 15-20 dk doğal güneş ışığı</p></div>
<div class="tip"><div class="tip-icon">&#129495;</div><h4>Hareket</h4><p>Günde minimum 30 dk orta yoğunlukta fiziksel aktivite</p></div>
<div class="tip"><div class="tip-icon">&#128564;</div><h4>7-9 Saat Uyku</h4><p>Beyin ve vücut onarımı için düzenli uyku düzeni</p></div>
</div></div>
<footer><p>&copy; 2026 VitaLife Wellness. Sağlıklı yaşamın adresi.</p></footer>
</body></html>`,
  },

  // ============================================
  // 8. EMLAK / GAYRİMENKUL
  // ============================================
  {
    name: "Emlak & Gayrimenkul Portalı",
    html: `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>YuvamPlus - Emlak & Gayrimenkul</title><meta name="description" content="Satılık ve kiralık daire, villa, arsa ilanları. Türkiye genelinde emlak arama ve yatırım rehberleri."><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f6f8;color:#333}header{background:#fff;box-shadow:0 2px 15px rgba(0,0,0,.06);position:sticky;top:0;z-index:100}nav{max-width:1100px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;align-items:center}.logo{font-size:26px;font-weight:800;color:#1e3a5f}.logo span{color:#2196f3}nav ul{list-style:none;display:flex;gap:24px}nav a{color:#666;text-decoration:none;font-size:14px}.hero{background:linear-gradient(135deg,#1e3a5f 0%,#2c5282 100%);padding:70px 20px;text-align:center;color:#fff}.hero h1{font-size:40px;font-weight:800;margin-bottom:12px}.hero p{font-size:16px;color:rgba(255,255,255,.7);margin-bottom:30px}.search-bar{max-width:800px;margin:0 auto;background:#fff;border-radius:12px;padding:8px;display:flex;flex-wrap:wrap;gap:8px;box-shadow:0 10px 40px rgba(0,0,0,.2)}.search-bar input,.search-bar select{flex:1;min-width:150px;border:1px solid #eee;border-radius:8px;padding:12px 16px;font-size:14px;outline:none}.search-bar button{background:#2196f3;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer}.container{max-width:1100px;margin:0 auto;padding:50px 20px}.sh{text-align:center;margin-bottom:36px}.sh h2{font-size:28px;font-weight:800;margin-bottom:6px}.sh p{color:#888;font-size:14px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}.listing{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.05);transition:transform .3s}.listing:hover{transform:translateY(-4px)}.listing-img{height:200px;position:relative;display:flex;align-items:center;justify-content:center;font-size:48px}.listing-price{position:absolute;bottom:12px;left:12px;background:rgba(0,0,0,.75);color:#fff;padding:6px 14px;border-radius:8px;font-weight:700;font-size:15px}.listing-body{padding:18px}.listing h3{font-size:17px;margin-bottom:6px}.listing .loc{color:#2196f3;font-size:13px;margin-bottom:8px}.listing .specs{display:flex;gap:16px;font-size:12px;color:#999;margin-top:10px}.listing .specs span{display:flex;align-items:center;gap:4px}.stats-row{background:#1e3a5f;padding:40px 20px;margin:40px 0}.stats-inner{max-width:1100px;margin:0 auto;display:flex;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:20px}.st{color:#fff}.st .n{font-size:32px;font-weight:800;color:#64b5f6}.st .l{font-size:12px;color:#90caf9;margin-top:4px;text-transform:uppercase;letter-spacing:1px}footer{background:#0f2137;padding:28px;text-align:center;color:#456;font-size:13px}@media(max-width:768px){.hero h1{font-size:28px}nav ul{display:none}.search-bar{flex-direction:column}}</style></head><body>
<header><nav><div class="logo">Yuvam<span>Plus</span></div><ul><li><a href="#">Satılık</a></li><li><a href="#">Kiralık</a></li><li><a href="#">Projeler</a></li><li><a href="#">Rehber</a></li></ul></nav></header>
<div class="hero"><h1>Hayalinizdeki Evi Bulun</h1><p>Türkiye genelinde binlerce satılık ve kiralık emlak ilanı</p><div class="search-bar"><input placeholder="Şehir, ilçe veya mahalle"><select><option>Satılık</option><option>Kiralık</option></select><select><option>Daire</option><option>Villa</option><option>Arsa</option></select><button>Ara</button></div></div>
<div class="container"><div class="sh"><h2>Öne Çıkan İlanlar</h2><p>Editör seçimi premium emlak ilanları</p></div>
<div class="grid">
<div class="listing"><div class="listing-img" style="background:linear-gradient(135deg,#2196f3,#1976d2)">&#127968;<div class="listing-price">₺3,250,000</div></div><div class="listing-body"><h3>Deniz Manzaralı 3+1 Daire</h3><div class="loc">&#128205; Kadıköy, İstanbul</div><p style="color:#888;font-size:13px">Yeni yapı, açık mutfak, 2 balkon, otopark ve sosyal tesis imkanı.</p><div class="specs"><span>&#128207; 145 m²</span><span>&#128719; 3+1</span><span>&#127970; 8. Kat</span></div></div></div>
<div class="listing"><div class="listing-img" style="background:linear-gradient(135deg,#4caf50,#388e3c)">&#127961;<div class="listing-price">₺8,900,000</div></div><div class="listing-body"><h3>Müstakil Havuzlu Villa</h3><div class="loc">&#128205; Bodrum, Muğla</div><p style="color:#888;font-size:13px">500 m² arsa, özel havuz, 4 yatak odası, denize 5 dk mesafe.</p><div class="specs"><span>&#128207; 280 m²</span><span>&#128719; 4+2</span><span>&#127795; Bahçe</span></div></div></div>
<div class="listing"><div class="listing-img" style="background:linear-gradient(135deg,#ff9800,#f57c00)">&#127959;<div class="listing-price">₺1,850,000</div></div><div class="listing-body"><h3>Yatırımlık 2+1 Residence</h3><div class="loc">&#128205; Kartal, İstanbul</div><p style="color:#888;font-size:13px">Metro hattına yakın, güvenlikli site, spor salonu ve havuz.</p><div class="specs"><span>&#128207; 95 m²</span><span>&#128719; 2+1</span><span>&#127970; 15. Kat</span></div></div></div>
</div></div>
<div class="stats-row"><div class="stats-inner"><div class="st"><div class="n">12,500+</div><div class="l">Aktif İlan</div></div><div class="st"><div class="n">81</div><div class="l">İl</div></div><div class="st"><div class="n">3,200+</div><div class="l">Ofis</div></div><div class="st"><div class="n">95K</div><div class="l">Mutlu Müşteri</div></div></div></div>
<footer><p>&copy; 2026 YuvamPlus Gayrimenkul. Tüm hakları saklıdır.</p></footer>
</body></html>`,
  },

  // ============================================
  // 9. EĞİTİM / ONLINE KURS
  // ============================================
  {
    name: "Online Eğitim & Kurs Platformu",
    html: `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BilgiYolu - Online Eğitim Platformu</title><meta name="description" content="Uzman eğitmenlerden online kurslar. Yazılım, tasarım, pazarlama ve kişisel gelişim eğitimleri."><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#333}header{background:#fff;border-bottom:1px solid #eee}nav{max-width:1100px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;align-items:center}.logo{font-size:24px;font-weight:800;color:#5b21b6}.logo span{color:#333}nav ul{list-style:none;display:flex;gap:24px}nav a{color:#777;text-decoration:none;font-size:14px}.hero{background:linear-gradient(135deg,#4c1d95,#7c3aed,#a78bfa);padding:80px 20px;text-align:center;color:#fff}.hero h1{font-size:42px;font-weight:800;margin-bottom:14px}.hero p{font-size:17px;color:rgba(255,255,255,.8);max-width:550px;margin:0 auto 28px}.hero-stats{display:flex;justify-content:center;gap:40px;flex-wrap:wrap;margin-top:30px}.hero-stats div{text-align:center}.hero-stats .num{font-size:28px;font-weight:800}.hero-stats .txt{font-size:12px;opacity:.7;margin-top:2px}.container{max-width:1100px;margin:0 auto;padding:50px 20px}.sh{text-align:center;margin-bottom:36px}.sh h2{font-size:28px;font-weight:800}.sh p{color:#888;font-size:14px;margin-top:6px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}.course{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.05);transition:transform .3s}.course:hover{transform:translateY(-4px)}.course-img{height:170px;display:flex;align-items:center;justify-content:center;font-size:48px;position:relative}.course-level{position:absolute;top:12px;left:12px;background:rgba(0,0,0,.6);color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}.course-body{padding:18px}.course-cat{font-size:11px;color:#7c3aed;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:6px}.course h3{font-size:17px;margin-bottom:6px}.course p{color:#888;font-size:13px;line-height:1.6}.course-meta{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid #f0f0f0;font-size:13px}.course-meta .price{font-weight:800;color:#5b21b6;font-size:18px}.course-meta .info{color:#aaa;font-size:12px}.cats{max-width:1100px;margin:40px auto;padding:0 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.cat-box{text-align:center;padding:20px;background:#fff;border-radius:12px;border:1px solid #f0f0f0;cursor:pointer;transition:border-color .3s}.cat-box:hover{border-color:#7c3aed}.cat-box .ci{font-size:28px;margin-bottom:6px}.cat-box span{font-size:13px;color:#555}footer{background:#1a0a3e;padding:28px;text-align:center;color:#5a4a7a;font-size:13px;margin-top:40px}@media(max-width:768px){.hero h1{font-size:28px}nav ul{display:none}}</style></head><body>
<header><nav><div class="logo">Bilgi<span>Yolu</span></div><ul><li><a href="#">Kurslar</a></li><li><a href="#">Eğitmenler</a></li><li><a href="#">Kategoriler</a></li><li><a href="#">Blog</a></li></ul></nav></header>
<div class="hero"><h1>Geleceğini İnşa Et</h1><p>Alanında uzman eğitmenlerden canlı ve kayıtlı online kurslarla kariyerinde fark yarat</p><div class="hero-stats"><div><div class="num">500+</div><div class="txt">Kurs</div></div><div><div class="num">120K</div><div class="txt">Öğrenci</div></div><div><div class="num">85</div><div class="txt">Eğitmen</div></div><div><div class="num">4.8</div><div class="txt">Puan</div></div></div></div>
<div class="container"><div class="sh"><h2>Popüler Kurslar</h2><p>En çok tercih edilen eğitimler</p></div>
<div class="grid">
<div class="course"><div class="course-img" style="background:linear-gradient(135deg,#667eea,#764ba2)">&#128187;<div class="course-level">Başlangıç</div></div><div class="course-body"><div class="course-cat">Yazılım</div><h3>Python ile Programlamaya Giriş</h3><p>Sıfırdan Python öğrenin. Veri yapıları, fonksiyonlar ve proje uygulamaları.</p><div class="course-meta"><span class="price">₺299</span><span class="info">42 saat • 156 ders</span></div></div></div>
<div class="course"><div class="course-img" style="background:linear-gradient(135deg,#f093fb,#f5576c)">&#127912;<div class="course-level">Orta</div></div><div class="course-body"><div class="course-cat">Tasarım</div><h3>Figma ile UI/UX Tasarım</h3><p>Modern arayüz tasarımı, prototipleme ve kullanıcı deneyimi prensipleri.</p><div class="course-meta"><span class="price">₺449</span><span class="info">36 saat • 128 ders</span></div></div></div>
<div class="course"><div class="course-img" style="background:linear-gradient(135deg,#4facfe,#00f2fe)">&#128200;<div class="course-level">İleri</div></div><div class="course-body"><div class="course-cat">Pazarlama</div><h3>Dijital Pazarlama Masterclass</h3><p>Google Ads, Meta Ads, SEO ve sosyal medya yönetimi A'dan Z'ye.</p><div class="course-meta"><span class="price">₺599</span><span class="info">58 saat • 210 ders</span></div></div></div>
</div></div>
<div class="cats">
<div class="cat-box"><div class="ci">&#128187;</div><span>Yazılım</span></div>
<div class="cat-box"><div class="ci">&#127912;</div><span>Tasarım</span></div>
<div class="cat-box"><div class="ci">&#128200;</div><span>Pazarlama</span></div>
<div class="cat-box"><div class="ci">&#127911;</div><span>Müzik</span></div>
<div class="cat-box"><div class="ci">&#128247;</div><span>Fotoğrafçılık</span></div>
<div class="cat-box"><div class="ci">&#128218;</div><span>İş Dünyası</span></div>
</div>
<footer><p>&copy; 2026 BilgiYolu Online Eğitim. Öğrenmenin yaşı yok.</p></footer>
</body></html>`,
  },

  // ============================================
  // 10. MODA & LIFESTYLE
  // ============================================
  {
    name: "Moda & Lifestyle Magazin",
    html: `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stilist - Moda, Güzellik & Yaşam</title><meta name="description" content="Moda trendleri, güzellik ipuçları, stil rehberleri ve yaşam tarzı önerileri."><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Georgia',serif;background:#fdf9f6;color:#2a2a2a}header{background:#fff;border-bottom:1px solid #f0ebe4}nav{max-width:1100px;margin:0 auto;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}.logo{font-size:32px;font-weight:400;letter-spacing:6px;text-transform:uppercase;color:#1a1a1a}nav ul{list-style:none;display:flex;gap:24px}nav a{color:#999;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:2px}.hero{display:grid;grid-template-columns:1.3fr 1fr;min-height:500px;max-width:1100px;margin:0 auto;padding:40px 20px;gap:30px;align-items:center}.hero-text .label{font-size:11px;color:#c0a882;text-transform:uppercase;letter-spacing:3px;margin-bottom:16px}.hero-text h1{font-size:42px;line-height:1.2;margin-bottom:16px;color:#1a1a1a;font-weight:400}.hero-text p{font-size:16px;color:#888;line-height:1.8;margin-bottom:24px}.hero-text a{display:inline-block;color:#1a1a1a;text-decoration:none;font-size:13px;text-transform:uppercase;letter-spacing:2px;border-bottom:2px solid #c0a882;padding-bottom:4px}.hero-visual{height:400px;background:linear-gradient(135deg,#f5e6d3,#e8d5c4);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:80px}.container{max-width:1100px;margin:0 auto;padding:50px 20px}.section-label{text-align:center;font-size:11px;color:#c0a882;text-transform:uppercase;letter-spacing:3px;margin-bottom:8px}.section-title{text-align:center;font-size:28px;margin-bottom:36px;font-weight:400}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}.post{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.03)}.post-img{height:220px;display:flex;align-items:center;justify-content:center;font-size:56px}.post-body{padding:22px}.post-cat{font-size:10px;color:#c0a882;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}.post h3{font-size:19px;font-weight:400;line-height:1.4;margin-bottom:8px}.post p{color:#999;font-size:14px;line-height:1.7}.post-date{margin-top:14px;font-size:12px;color:#ccc;font-style:italic}.newsletter{background:#1a1a1a;padding:50px 20px;text-align:center;margin:40px 0;color:#fff}.newsletter h3{font-size:24px;font-weight:400;margin-bottom:8px}.newsletter p{color:#666;font-size:14px;margin-bottom:20px}.nl-form{max-width:450px;margin:0 auto;display:flex;gap:8px}.nl-form input{flex:1;padding:14px 18px;border:1px solid #333;background:#111;color:#fff;border-radius:8px;font-size:14px;outline:none}.nl-form button{background:#c0a882;color:#1a1a1a;border:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;text-transform:uppercase;letter-spacing:1px}footer{border-top:1px solid #f0ebe4;padding:28px;text-align:center;color:#bbb;font-size:13px}@media(max-width:768px){.hero{grid-template-columns:1fr}.hero h1{font-size:28px}nav ul{display:none}.hero-visual{height:250px}}</style></head><body>
<header><nav><div class="logo">Stilist</div><ul><li><a href="#">Moda</a></li><li><a href="#">Güzellik</a></li><li><a href="#">Yaşam</a></li><li><a href="#">Trendler</a></li></ul></nav></header>
<div class="hero"><div class="hero-text"><div class="label">Editörün Seçimi</div><h1>İlkbahar 2026 Trendleri: Cesur Renkler</h1><p>Bu sezonun en dikkat çekici renk paletleri, kumaş tercihleri ve stil kombinleri ile gardırobunuzu yenileyin.</p><a href="#">Devamını Oku</a></div><div class="hero-visual">&#128087;</div></div>
<div class="container"><div class="section-label">Son Yazılar</div><div class="section-title">Moda & Yaşam Rehberi</div>
<div class="grid">
<div class="post"><div class="post-img" style="background:linear-gradient(135deg,#ffecd2,#fcb69f)">&#128132;</div><div class="post-body"><div class="post-cat">Güzellik</div><h3>Doğal Cilt Bakım Rutini: 5 Adım</h3><p>Temizleme, tonikleme, serum, nemlendirme ve güneş koruması ile sağlıklı cilt rehberi.</p><div class="post-date">3 Mart 2026</div></div></div>
<div class="post"><div class="post-img" style="background:linear-gradient(135deg,#a18cd1,#fbc2eb)">&#128090;</div><div class="post-body"><div class="post-cat">Moda</div><h3>Kapsül Gardırop: 30 Parça ile Sonsuz Kombin</h3><p>Minimalist gardırop felsefesi ile daha az parçayla daha şık görünmenin sırları.</p><div class="post-date">1 Mart 2026</div></div></div>
<div class="post"><div class="post-img" style="background:linear-gradient(135deg,#d4fc79,#96e6a1)">&#127808;</div><div class="post-body"><div class="post-cat">Yaşam</div><h3>Slow Living: Yavaş Yaşam Felsefesi</h3><p>Hızlı dünyada durup nefes almak. Bilinçli tüketim ve yaşam kalitesi üzerine.</p><div class="post-date">26 Şubat 2026</div></div></div>
</div></div>
<div class="newsletter"><h3>Haftalık Stil Bülteni</h3><p>Trend analizleri ve özel içerikler doğrudan e-postanıza gelsin</p><div class="nl-form"><input placeholder="E-posta adresiniz"><button>Abone Ol</button></div></div>
<footer><p>&copy; 2026 Stilist Magazin. Tarz hiç eskimez.</p></footer>
</body></html>`,
  },
];

// Insert pages
let inserted = 0;
for (const page of pages) {
  const exists = await client.query(
    "SELECT id FROM landing_pages WHERE name = $1",
    [page.name],
  );

  if (exists.rows.length > 0) {
    await client.query(
      "UPDATE landing_pages SET html_content = $1, updated_at = NOW() WHERE name = $2",
      [page.html, page.name],
    );
    console.log(`  Updated: ${page.name}`);
  } else {
    await client.query(
      "INSERT INTO landing_pages (name, html_content) VALUES ($1, $2)",
      [page.name, page.html],
    );
    console.log(`  Created: ${page.name}`);
    inserted++;
  }
}

console.log(`\nDone! ${inserted} new pages created, ${pages.length - inserted} updated.`);
await client.end();
