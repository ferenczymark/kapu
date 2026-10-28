import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Ide illesztheted majd a Resend API kulcsodat, vagy az .env.local fájlba
const resend = new Resend(process.env.RESEND_API_KEY || 're_YXpmbJ8v_JPDaYsJHWfxAEbTktz74qi7Q');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceName, eventType, timestamp } = body;

    // E-mail küldése a megadott címre
    const data = await resend.emails.send({
      from: 'KapuRendszer <onboarding@resend.dev>', // Teszt fióknál ez az alapértelmezett küldő
      to: ['rol7yka@gmail.com'],
      subject: '⚠️ RIASZTÁS: Szabálytalan nyitás észlelve!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 12px;">
          <h1 style="color: #ef4444; margin-bottom: 10px;">⚠️ Biztonsági Riasztás</h1>
          <p>Szabálytalan eseményt észlelt a kapuvezérlő rendszer!</p>
          
          <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 5px 0;"><strong>Esemény:</strong> ${eventType || 'Szabálytalan nyitás'}</p>
            <p style="margin: 5px 0;"><strong>Eszköz:</strong> ${deviceName || 'Főbejárati Kapu'}</p>
            <p style="margin: 5px 0;"><strong>Időpont:</strong> ${timestamp || new Date().toLocaleString('hu-HU')}</p>
          </div>

          <p style="font-size: 12px; color: #94a3b8;">Ezt az üzenetet a Kapu Rendszer automatikusa küldte a(z) rol7yka@gmail.com címre.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('E-mail küldési hiba:', error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}