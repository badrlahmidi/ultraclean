<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<style>
@@page { size: A4 portrait; margin-top: 0; margin-right: 0; margin-bottom: 14mm; margin-left: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: DejaVu Sans, sans-serif; font-size: 10.5px; color: #1e293b; line-height: 1.55; background: #fff; }
.page-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 12mm; border-top: 1px solid #e2e8f0; display: table; width: 100%; padding: 0 20mm; }
.page-footer td { display: table-cell; vertical-align: middle; font-size: 8px; color: #64748b; width: 50%; }
.page-footer td:last-child { text-align: right; }
.header-band { background: #fff; width: 100%; padding: 8mm 20mm 6mm 20mm; display: table; border-bottom: 2px solid #3b82f6; }
.hb-left  { display: table-cell; width: 55%; vertical-align: middle; }
.hb-right { display: table-cell; width: 45%; vertical-align: middle; text-align: right; }
.logo-img { max-height: 40px; max-width: 160px; }
.company-name { font-size: 18px; font-weight: 700; color: #1e293b; }
.company-meta { font-size: 8.5px; color: #64748b; margin-top: 3px; line-height: 1.65; }
.doc-label { font-size: 9px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #3b82f6; margin-bottom: 4px; }
.doc-number { font-size: 22px; font-weight: 700; color: #1e293b; }
.doc-badge { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 20px; font-size: 8px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border: 1px solid; }
.badge-draft     { border-color: #94a3b8; color: #64748b; }
.badge-issued    { border-color: #3b82f6; color: #2563eb; }
.badge-paid      { border-color: #16a34a; color: #15803d; }
.badge-partial   { border-color: #f59e0b; color: #b45309; }
.badge-cancelled { border-color: #ef4444; color: #b91c1c; }
.body-wrap { padding: 6mm 20mm 4mm 20mm; }
.info-row { display: table; width: 100%; margin: 5mm 0 6mm 0; }
.info-block { display: table-cell; width: 48%; vertical-align: top; padding: 5mm; border: 1px solid #e2e8f0; border-top: 2px solid #3b82f6; border-radius: 0 0 4px 4px; }
.info-block+.info-block { margin-left: 4%; }
.block-title { font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #3b82f6; margin-bottom: 5px; }
.client-name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
.info-block p { font-size: 10px; color: #475569; margin-bottom: 1px; }
.meta-row { display: table; width: 100%; margin-bottom: 2px; }
.meta-key { display: table-cell; width: 46%; color: #64748b; font-size: 9.5px; }
.meta-val { display: table-cell; color: #1e293b; font-size: 9.5px; font-weight: 600; }
.section-title { font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 2mm; margin-bottom: 3mm; }
table.lines { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
table.lines thead tr { background: #f1f5f9; }
table.lines thead th { padding: 7px 9px; text-align: left; font-size: 8.5px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
table.lines thead th.r { text-align: right; }
table.lines tbody tr { border-bottom: 1px solid #f1f5f9; }
table.lines tbody tr:nth-child(even) { background: #f8fafc; }
table.lines tbody td { padding: 7px 9px; font-size: 10px; vertical-align: top; color: #334155; }
table.lines tbody td.r { text-align: right; white-space: nowrap; }
.sub { color: #94a3b8; font-size: 8.5px; }
.totals-wrap { display: table; width: 100%; margin-top: 1mm; }
.totals-spacer { display: table-cell; width: 54%; }
.totals-box { display: table-cell; width: 46%; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; }
.totals-box table { width: 100%; border-collapse: collapse; }
.totals-box td { padding: 5px 12px; font-size: 10px; }
.t-label { color: #64748b; }
.t-value { text-align: right; font-weight: 600; color: #1e293b; }
.sep td { border-top: 1px solid #e2e8f0; }
.grand-total { background: #eff6ff; border-top: 2px solid #3b82f6; }
.grand-total td { padding: 8px 12px; }
.grand-total .t-label { color: #2563eb; font-size: 8.5px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
.grand-total .t-value { color: #1d4ed8; font-size: 14px; font-weight: 700; }
.paid-row .t-label, .paid-row .t-value { color: #15803d; }
.remain-row { background: #fff1f2; }
.remain-row .t-label, .remain-row .t-value { color: #b91c1c; font-weight: 700; }
.discount .t-value { color: #dc2626; }
.notes-box { background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 4px 4px 0; padding: 4mm 5mm; font-size: 9.5px; color: #78350f; line-height: 1.6; }
.t-tbl { width: 100%; border-collapse: collapse; font-size: 9px; }
.t-tbl th { background: #f1f5f9; padding: 4px 8px; text-align: left; color: #475569; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
.t-tbl td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; color: #475569; }
.t-tbl td.r { text-align: right; }
.legal { margin-top: 5mm; font-size: 7.5px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 3mm; }
</style>
</head>
<body>
<table class="page-footer"><tr>
<td>{{ $invoice->invoice_number }}@if($invoice->quote) &middot; R&eacute;f. {{ $invoice->quote->quote_number }}@endif</td>
<td>{{ $company['name'] }} &middot; G&eacute;n&eacute;r&eacute; le {{ now()->format('d/m/Y') }}</td>
</tr></table>
<div class="header-band">
  <div class="hb-left">
    @if($company['logo'])<img src="{{ $company['logo'] }}" class="logo-img" alt="Logo">
    @else<div class="company-name">{{ $company['name'] }}</div>@endif
    <div class="company-meta">
      @if($company['address']){{ $company['address'] }}<br>@endif
      @if($company['city']){{ $company['city'] }}<br>@endif
      @if($company['phone']){{ $company['phone'] }}@endif
    </div>
  </div>
  <div class="hb-right">
    <div class="doc-label">Facture</div>
    <div class="doc-number">{{ $invoice->invoice_number }}</div>
    <div><span class="doc-badge badge-{{ $invoice->status }}">{{ \App\Models\Invoice::STATUS_LABELS[$invoice->status] }}</span></div>
  </div>
</div>
<div class="body-wrap">
<div class="info-row">
  <div class="info-block">
    <div class="block-title">Factur&eacute; &agrave;</div>
    <div class="client-name">{{ $invoice->billing_name ?: $invoice->client->name }}</div>
    @if($invoice->client->phone)<p>{{ $invoice->client->phone }}</p>@endif
    @if($invoice->client->email)<p>{{ $invoice->client->email }}</p>@endif
    @if($invoice->billing_address)<p>{{ $invoice->billing_address }}</p>@endif
    @if($invoice->billing_city || $invoice->billing_zip)<p>{{ implode(' ', array_filter([$invoice->billing_zip, $invoice->billing_city])) }}</p>@endif
    @if($invoice->billing_ice)<p>ICE : {{ $invoice->billing_ice }}</p>@endif
  </div>
  <div class="info-block" style="margin-left:4%">
    <div class="block-title">Informations</div>
    <div class="meta-row"><span class="meta-key">Date d&apos;&eacute;mission</span><span class="meta-val">{{ ($invoice->issued_at ?? $invoice->created_at)->format('d/m/Y') }}</span></div>
    @if($invoice->due_date)<div class="meta-row"><span class="meta-key">&Eacute;ch&eacute;ance</span><span class="meta-val">{{ $invoice->due_date->format('d/m/Y') }}</span></div>@endif
    @if($invoice->paid_at)<div class="meta-row"><span class="meta-key">Pay&eacute;e le</span><span class="meta-val" style="color:#16a34a">{{ $invoice->paid_at->format('d/m/Y') }}</span></div>@endif
    @if($invoice->payment_method)<div class="meta-row"><span class="meta-key">R&egrave;glement</span><span class="meta-val">{{ ucfirst($invoice->payment_method) }}</span></div>@endif
    @if($invoice->quote)<div class="meta-row"><span class="meta-key">Devis r&eacute;f.</span><span class="meta-val">{{ $invoice->quote->quote_number }}</span></div>@endif
    <div class="meta-row"><span class="meta-key">&Eacute;tablie par</span><span class="meta-val">{{ $invoice->creator->name }}</span></div>
  </div>
</div>
<div class="section-title">Lignes de facturation</div>
<table class="lines">
  <thead><tr>
    <th style="width:42%">Description</th>
    <th class="r" style="width:8%">Qt&eacute;</th>
    <th class="r" style="width:17%">P.U. HT</th>
    <th class="r" style="width:14%">Remise</th>
    <th class="r" style="width:19%">Total HT</th>
  </tr></thead>
  <tbody>
    @forelse($invoice->lines as $line)
    <tr>
      <td><strong>{{ $line->description }}</strong>@if($line->service)<div class="sub">{{ $line->service->name }}</div>@endif</td>
      <td class="r">{{ $line->quantity }}</td>
      <td class="r">{{ number_format($line->unit_price_cents/100,2) }} MAD</td>
      <td class="r">@if($line->discount_cents>0)<span style="color:#dc2626">&minus;{{ number_format($line->discount_cents/100,2) }}</span>@else<span style="color:#cbd5e1">&mdash;</span>@endif</td>
      <td class="r"><strong>{{ number_format($line->line_total_cents/100,2) }} MAD</strong></td>
    </tr>
    @empty
    <tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:14px;font-style:italic">Aucune ligne</td></tr>
    @endforelse
  </tbody>
</table>
<div class="totals-wrap">
  <div class="totals-spacer"></div>
  <div class="totals-box"><table>
    <tr><td class="t-label">Sous-total HT</td><td class="t-value">{{ number_format($invoice->subtotal_cents/100,2) }} MAD</td></tr>
    @if($invoice->discount_cents>0)<tr class="discount"><td class="t-label">Remise globale</td><td class="t-value">&minus;{{ number_format($invoice->discount_cents/100,2) }} MAD</td></tr>@endif
    @if($invoice->tax_rate>0)<tr class="sep"><td class="t-label">TVA ({{ number_format($invoice->tax_rate,0) }} %)</td><td class="t-value">{{ number_format($invoice->tax_cents/100,2) }} MAD</td></tr>@endif
    <tr class="grand-total"><td class="t-label">Total TTC</td><td class="t-value">{{ number_format($invoice->total_cents/100,2) }} MAD</td></tr>
    @if($invoice->amount_paid_cents>0)
    <tr class="paid-row sep"><td class="t-label">Montant r&eacute;gl&eacute;</td><td class="t-value">{{ number_format($invoice->amount_paid_cents/100,2) }} MAD</td></tr>
    @if($invoice->remainingCents()>0)<tr class="remain-row"><td class="t-label">Reste &agrave; payer</td><td class="t-value">{{ number_format($invoice->remainingCents()/100,2) }} MAD</td></tr>@endif
    @endif
  </table></div>
</div>
@if($invoice->notes)
<div style="margin-top:5mm"><div class="section-title">Notes</div><div class="notes-box">{{ $invoice->notes }}</div></div>
@endif
@if($invoice->tickets->isNotEmpty())
<div style="margin-top:5mm">
  <div class="section-title">Tickets associ&eacute;s</div>
  <table class="t-tbl">
    <tr><th>Ticket</th><th>Date</th><th>Plaque</th><th class="r">Montant</th></tr>
    @foreach($invoice->tickets as $t)
    <tr><td>{{ $t->ticket_number }}</td><td>{{ $t->created_at->format('d/m/Y') }}</td><td>{{ $t->vehicle_plate }}</td><td class="r">{{ number_format($t->total_price_cents/100,2) }} MAD</td></tr>
    @endforeach
  </table>
</div>
@endif
<div class="legal">Facture officielle &mdash; {{ $company['name'] }}@if($company['phone']) &middot; {{ $company['phone'] }}@endif @if($company['city']) &middot; {{ $company['city'] }}@endif &mdash; Tout r&egrave;glement est exigible &agrave; r&eacute;ception sauf accord &eacute;crit pr&eacute;alable.</div>
</div>
</body>
</html>
