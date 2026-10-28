import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Mik a "belső, titkos szobák"? (A te leírásod alapján)
  const isProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/devices');

  // 2. Belépőjegy (Cookie) ellenőrzése
  // A Supabase a bejelentkezés után elhelyez egy azonosítót a sütikben.
  const hasSession = request.cookies.getAll().some(cookie => cookie.name.includes('supabase'));

  // --- IDEIGLENES KISKAPU A FEJLESZTÉSHEZ ÉS TESZTELÉSHEZ ---
  // Mivel a Supabase adatbázist még nem kötöttük be, a belépőjegyed üres lenne.
  // Hogy most láthassuk a dizájnt, egyelőre mindenkit átengedünk a "VIP listán".
  // Ezt a 3 sort majd töröljük, amikor élesítjük a Supabase-t!
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }
  // ---------------------------------------------------------

  // 3. A Kidobóember logikája működésben
  if (isProtectedRoute && !hasSession) {
    // Megfogja a gallérod és visszairányít a /login oldalra
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (path === '/login' && hasSession) {
    // Ha már be vagy jelentkezve, felesleges a Login oldalon lenned,
    // a kidobó azonnal átirányít a vezérlőpultra.
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Ha minden rendben, rábólint és beenged
  return NextResponse.next();
}

// Itt mondjuk meg a kidobónak, hogy ne ellenőrizze feleslegesen a képeket és ikonokat
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};