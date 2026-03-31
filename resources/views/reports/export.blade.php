<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapport UltraClean</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; padding: 30px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; }
  .logo { font-size: 22px; font-weight: 700; color: #3b82f6; letter-spacing: -0.5px; }
  .logo span { color: #0f172a; }
  .header-meta { text-align: right; color: #64748b; font-size: 10px; line-height: 1.6; }
  .header-meta strong { color: #1e293b; font-size: 12px; }

  /* Section title */
  .section-title { font-size: 12px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }

  /* KPI grid */
  .kpi-grid { display: flex; gap: 10px; margin-bottom: 4px; }
  .kpi-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; font-weight: 600; }
  .kpi-value { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 3px; }
  .kpi-sub { font-size: 9px; color: #94a3b8; margin-top: 2px; }

  .kpi-card.blue  { border-left: 3px solid #3b82f6; }
  .kpi-card.green { border-left: 3px solid #10b981; }
  .kpi-card.red   { border-left: 3px solid #ef4444; }
  .kpi-card.amber { border-left: 3px solid #f59e0b; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th { background: #f1f5f9; color: #475569; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; padding: 7px 10px; text-align: left; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #f8fafc; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  .text-green { color: #059669; }
  .text-red   { color: #dc2626; }

  /* Two-col layout */
  .two-col { display: flex; gap: 16px; }
  .col { flex: 1; }

  /* Status badge */
  .badge { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; }
  .badge-ok     { background: #f1f5f9; color: #475569; }
  .badge-pos    { background: #dbeafe; color: #1d4ed8; }
  .badge-neg    { background: #fee2e2; color: #b91c1c; }

  /* Footer */
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 9px; }
</style>
</head>
<body>

{{-- ── Header ── --}}
<div class="header">
  <div>
    <div class="logo">Ultra<span>Clean</span></div>
    <div style="color:#64748b; font-size:10px; margin-top:4px;">Centre de lavage automobile</div>
  </div>
  <div class="header-meta">
    <strong>Rapport d'activité</strong><br>
    Période : {{ $from }} → {{ $to }}<br>
    Généré le {{ $generated_at }}
  </div>
</div>

{{-- ── KPIs ── --}}
<div class="section-title">Résumé de la période</div>
<div class="kpi-grid">
  <div class="kpi-card blue">
    <div class="kpi-label">Tickets total</div>
    <div class="kpi-value">{{ $stats['total_tickets'] }}</div>
  </div>
  <div class="kpi-card green">
    <div class="kpi-label">Payés</div>
    <div class="kpi-value">{{ $stats['paid_tickets'] }}</div>
  </div>
  <div class="kpi-card red">
    <div class="kpi-label">Annulés</div>
    <div class="kpi-value">{{ $stats['cancelled_tickets'] }}</div>
  </div>
  <div class="kpi-card amber">
    <div class="kpi-label">En attente</div>
    <div class="kpi-value">{{ $stats['pending_tickets'] }}</div>
  </div>
  <div class="kpi-card green">
    <div class="kpi-label">Chiffre d'affaires</div>
    <div class="kpi-value">{{ number_format($stats['revenue'] / 100, 2, ',', ' ') }} MAD</div>
    <div class="kpi-sub">Moy. {{ number_format(($stats['avg_ticket'] ?? 0) / 100, 2, ',', ' ') }} MAD / ticket</div>
  </div>
  <div class="kpi-card blue">
    <div class="kpi-label">Taux encaissement</div>
    <div class="kpi-value">
      @if($stats['total_tickets'] > 0)
        {{ round(($stats['paid_tickets'] / $stats['total_tickets']) * 100) }}%
      @else —
      @endif
    </div>
  </div>
</div>

{{-- ── Two-col: services + paiements ── --}}
<div class="two-col" style="margin-top:16px;">

  {{-- Top services --}}
  <div class="col">
    <div class="section-title">Top services</div>
    @if(count($topServices) > 0)
    <table>
      <thead><tr><th>Service</th><th class="text-center">Fois</th><th class="text-right">CA (MAD)</th></tr></thead>
      <tbody>
        @foreach($topServices as $s)
        <tr>
          <td>{{ $s->name }}</td>
          <td class="text-center">{{ $s->count }}</td>
          <td class="text-right font-bold">{{ number_format($s->revenue / 100, 2, ',', ' ') }}</td>
        </tr>
        @endforeach
      </tbody>
    </table>
    @else
    <p style="color:#94a3b8; font-size:10px; padding:8px 0;">Aucune donnée</p>
    @endif
  </div>

  {{-- Modes de paiement --}}
  <div class="col">
    <div class="section-title">Modes de paiement</div>
    @php $methodLabels = ['cash'=>'Espèces','card'=>'Carte','mobile'=>'Mobile','mixed'=>'Mixte']; @endphp
    @if(count($paymentMethods) > 0)
    <table>
      <thead><tr><th>Mode</th><th class="text-center">Trans.</th><th class="text-right">Total (MAD)</th></tr></thead>
      <tbody>
        @foreach($paymentMethods as $m)
        <tr>
          <td>{{ $methodLabels[$m->method] ?? $m->method }}</td>
          <td class="text-center">{{ $m->count }}</td>
          <td class="text-right font-bold">{{ number_format($m->total / 100, 2, ',', ' ') }}</td>
        </tr>
        @endforeach
      </tbody>
    </table>
    @else
    <p style="color:#94a3b8; font-size:10px; padding:8px 0;">Aucune donnée</p>
    @endif
  </div>
</div>

{{-- ── Two-col: véhicules + statuts ── --}}
<div class="two-col" style="margin-top:4px;">

  {{-- Types de véhicules --}}
  <div class="col">
    <div class="section-title">Types de véhicules</div>
    @if(count($vehicleBreakdown) > 0)
    <table>
      <thead><tr><th>Type</th><th class="text-center">Tickets</th><th class="text-right">CA (MAD)</th></tr></thead>
      <tbody>
        @foreach($vehicleBreakdown as $v)
        <tr>
          <td>{{ $v->name }}</td>
          <td class="text-center">{{ $v->count }}</td>
          <td class="text-right font-bold">{{ number_format($v->revenue / 100, 2, ',', ' ') }}</td>
        </tr>
        @endforeach
      </tbody>
    </table>
    @else
    <p style="color:#94a3b8; font-size:10px; padding:8px 0;">Aucune donnée</p>
    @endif
  </div>

  {{-- Répartition statuts --}}
  <div class="col">
    <div class="section-title">Statuts des tickets</div>
    @php $statusLabels = ['pending'=>'En attente','in_progress'=>'En cours','completed'=>'Terminé','paid'=>'Payé','cancelled'=>'Annulé']; @endphp
    @if(count($statusBreakdown) > 0)
    <table>
      <thead><tr><th>Statut</th><th class="text-right">Nombre</th></tr></thead>
      <tbody>
        @foreach($statusBreakdown as $status => $count)
        <tr>
          <td>{{ $statusLabels[$status] ?? $status }}</td>
          <td class="text-right font-bold">{{ $count }}</td>
        </tr>
        @endforeach
      </tbody>
    </table>
    @else
    <p style="color:#94a3b8; font-size:10px; padding:8px 0;">Aucune donnée</p>
    @endif
  </div>
</div>

{{-- ── Shifts ── --}}
@if(count($shifts) > 0)
<div class="section-title">Shifts clôturés</div>
<table>
  <thead>
    <tr>
      <th>Caissier</th>
      <th>Ouverture</th>
      <th>Clôture</th>
      <th class="text-right">Caisse ouverture</th>
      <th class="text-right">Caisse clôture</th>
      <th class="text-right">Écart</th>
    </tr>
  </thead>
  <tbody>
    @foreach($shifts as $s)
    @php $diff = $s['difference_cents'] ?? 0; @endphp
    <tr>
      <td class="font-bold">{{ $s['user'] ?? '—' }}</td>
      <td>{{ \Carbon\Carbon::parse($s['opened_at'])->format('d/m/Y H:i') }}</td>
      <td>{{ $s['closed_at'] ? \Carbon\Carbon::parse($s['closed_at'])->format('d/m/Y H:i') : '—' }}</td>
      <td class="text-right">{{ number_format(($s['opening_cash_cents'] ?? 0) / 100, 2, ',', ' ') }}</td>
      <td class="text-right">{{ number_format(($s['closing_cash_cents'] ?? 0) / 100, 2, ',', ' ') }}</td>
      <td class="text-right">
        <span class="badge {{ $diff == 0 ? 'badge-ok' : ($diff > 0 ? 'badge-pos' : 'badge-neg') }}">
          @if($diff == 0) OK
          @elseif($diff > 0) +{{ number_format($diff / 100, 2, ',', ' ') }}
          @else {{ number_format($diff / 100, 2, ',', ' ') }}
          @endif
        </span>
      </td>
    </tr>
    @endforeach
  </tbody>
</table>
@endif

{{-- ── Tendance CA ── --}}
@if(count($revenueTrend) > 0)
<div class="section-title">Tendance CA par jour</div>
<table>
  <thead><tr><th>Date</th><th class="text-center">Tickets</th><th class="text-right">CA (MAD)</th></tr></thead>
  <tbody>
    @foreach($revenueTrend as $row)
    <tr>
      <td>{{ $row['date'] }}</td>
      <td class="text-center">{{ $row['tickets'] }}</td>
      <td class="text-right font-bold">{{ number_format($row['revenue'] / 100, 2, ',', ' ') }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
@endif

<div class="footer">
  UltraClean — Rapport généré automatiquement le {{ $generated_at }} &bull; Confidentiel
</div>

</body>
</html>
