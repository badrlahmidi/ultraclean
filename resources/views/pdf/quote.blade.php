<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<style>
@@page { size: A4 portrait; margin-top: 0; margin-right: 0; margin-bottom: 14mm; margin-left: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family:DejaVu Sans, sans-serif; font-size: 10.5px; color: #1e293b; line-height: 1.55; background: #fff; }
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
.badge-draft    { border-color: #94a3b8; color: #64748b; }
.badge-sent     { border-color: #3b82f6; color: #2563eb; }
.badge-accepted { border-color: #16a34a; color: #15803d; }
.badge-refused  { border-color: #ef4444; color: #b91c1c; }
.badge-expired  { border-color: #f59e0b; color: #b45309; }
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
.discount .t-value { color: #dc2626; }
.notes-box { background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 4px 4px 0; padding: 4mm 5mm; font-size: 9.5px; color: #78350f; line-height: 1.6; }
.validity-box { background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 0 4px 4px 0; padding: 4mm 5mm; font-size: 9.5px; color: #1e40af; line-height: 1.7; }
.validity-box strong { display: block; font-size: 12px; color: #1d4ed8; margin-top: 2px; }
.legal { margin-top: 5mm; font-size: 7.5px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 3mm; }
</style>
</head>
<body>
<table class="page-footer"><tr>
<td>{{ $quote->quote_number }} &mdash; Document confidentiel</td>
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
    <div class="doc-label">Devis</div>
    <div class="doc-number">{{ $quote->quote_number }}</div>
    <div><span class="doc-badge badge-{{ $quote->status }}">{{ \App\Models\Quote::STATUS_LABELS[$quote->status] }}</span></div>
  </div>
</div>
<div class="body-wrap">
<div class="info-row">
  <div class="info-block">
    <div class="block-title">Client</div>
    <div class="client-name">{{ $quote->billing_name ?: $quote->client->name }}</div>
    @if($quote->client->phone)<p>{{ $quote->client->phone }}</p>@endif
    @if($quote->client->email)<p>{{ $quote->client->email }}</p>@endif
    @if($quote->billing_address)<p>{{ $quote->billing_address }}</p>@endif
    @if($quote->billing_city || $quote->billing_zip)<p>{{ implode(' ', array_filter([$quote->billing_zip, $quote->billing_city])) }}</p>@endif
    @if($quote->billing_ice)<p>ICE : {{ $quote->billing_ice }}</p>@endif
  </div>
  <div class="info-block" style="margin-left:4%">
    <div class="block-title">Informations</div>
    <div class="meta-row"><span class="meta-key">Date d&apos;&eacute;mission</span><span class="meta-val">{{ $quote->created_at->format('d/m/Y') }}</span></div>
    @if($quote->valid_until)<div class="meta-row"><span class="meta-key">Valable jusqu&apos;au</span><span class="meta-val" style="{{ $quote->valid_until->isPast() ? 'color:#b91c1c' : 'color:#15803d' }}">{{ $quote->valid_until->format('d/m/Y') }}</span></div>@endif
    @if($quote->sent_at)<div class="meta-row"><span class="meta-key">Envoy&eacute; le</span><span class="meta-val">{{ $quote->sent_at->format('d/m/Y') }}</span></div>@endif
    @if($quote->accepted_at)<div class="meta-row"><span class="meta-key">Accept&eacute; le</span><span class="meta-val" style="color:#15803d">{{ $quote->accepted_at->format('d/m/Y') }}</span></div>@endif
    <div class="meta-row"><span class="meta-key">&Eacute;tabli par</span><span class="meta-val">{{ $quote->creator->name }}</span></div>
  </div>
</div>
<div class="section-title">Lignes du devis</div>
<table class="lines">
  <thead><tr>
    <th style="width:42%">Description</th>
    <th class="r" style="width:8%">Qt&eacute;</th>
    <th class="r" style="width:17%">P.U. HT</th>
    <th class="r" style="width:14%">Remise</th>
    <th class="r" style="width:19%">Total HT</th>
  </tr></thead>
  <tbody>
    @forelse($quote->lines as $line)
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
    <tr><td class="t-label">Sous-total HT</td><td class="t-value">{{ number_format($quote->subtotal_cents/100,2) }} MAD</td></tr>
    @if($quote->discount_cents>0)<tr class="discount"><td class="t-label">Remise globale</td><td class="t-value">&minus;{{ number_format($quote->discount_cents/100,2) }} MAD</td></tr>@endif
    @if($quote->tax_rate>0)<tr class="sep"><td class="t-label">TVA ({{ number_format($quote->tax_rate,0) }} %)</td><td class="t-value">{{ number_format($quote->tax_cents/100,2) }} MAD</td></tr>@endif
    <tr class="grand-total"><td class="t-label">Total TTC</td><td class="t-value">{{ number_format($quote->total_cents/100,2) }} MAD</td></tr>
  </table></div>
</div>
@if($quote->notes || $quote->valid_until)
<div style="display:table;width:100%;margin-top:5mm">
  @if($quote->notes)
  <div style="display:table-cell;width:{{ $quote->valid_until ? '58%' : '100%' }};vertical-align:top;padding-right:{{ $quote->valid_until ? '3%' : '0' }}">
    <div class="section-title">Notes</div>
    <div class="notes-box">{{ $quote->notes }}</div>
  </div>
  @endif
  @if($quote->valid_until)
  <div style="display:table-cell;width:{{ $quote->notes ? '39%' : '100%' }};vertical-align:top">
    <div class="section-title">Validit&eacute;</div>
    <div class="validity-box">
      Ce devis est valable jusqu&apos;au
      <strong>{{ $quote->valid_until->format('d/m/Y') }}</strong>
      @if($quote->valid_until->isPast())<span style="color:#b91c1c;font-size:8px;display:block;margin-top:2px">Devis expir&eacute;</span>@endif
    </div>
  </div>
  @endif
</div>
@endif
<div class="legal">Devis non contractuel avant acceptation sign&eacute;e &mdash; {{ $company['name'] }}@if($company['phone']) &middot; {{ $company['phone'] }}@endif @if($company['city']) &middot; {{ $company['city'] }}@endif &mdash; Valid&eacute; par signature ou confirmation &eacute;crite.</div>
</div>
</body>
</html>
