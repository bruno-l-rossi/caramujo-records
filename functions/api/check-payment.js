/**
 * Cloudflare Pages Function: check-payment
 * GET /api/check-payment?id=PAYMENT_ID
 */

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('id');

  if (!paymentId || !/^\d{1,20}$/.test(paymentId)) {
    return Response.json({ error: 'Payment ID inválido.' }, { status: 400 });
  }

  const ACCESS_TOKEN = env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return Response.json({ error: 'Configuração incompleta.' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    if (res.status === 404) return Response.json({ error: 'Pagamento não encontrado.' }, { status: 404 });
    if (!res.ok) return Response.json({ error: 'Erro ao consultar Mercado Pago.' }, { status: 502 });

    const payment = await res.json();
    return Response.json(
      { status: payment.status, statusDetail: payment.status_detail },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[check-payment] Erro:', err.message);
    return Response.json({ error: 'Erro ao consultar pagamento.' }, { status: 500 });
  }
}
