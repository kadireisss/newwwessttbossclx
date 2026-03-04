/**
 * BOSS Cloaker v3.2 - Passenger Entry Point
 * 
 * Bu dosya Phusion Passenger tarafından başlatılır.
 * .cjs uzantısı zorunlu: package.json "type":"module" olduğu için
 * .js dosyası ESM olarak yorumlanır ve Passenger hata verir.
 * 
 * Passenger otomatik olarak http.Server.listen() çağrısını yakalar
 * ve kendi soketine yönlendirir — PORT ayarına gerek yok.
 */

// dist/index.cjs zaten dotenv'i bundle ediyor, ama garanti olsun
try { require('dotenv').config(); } catch(e) { /* dotenv bundled */ }

// Ana uygulamayı yükle
require('./dist/index.cjs');
