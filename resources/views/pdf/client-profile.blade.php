<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a2e; line-height: 1.5; }

    .header { display: table; width: 100%; margin-bottom: 24px; border-bottom: 2px solid #0f4c81; padding-bottom: 16px; }
    .header-left  { display: table-cell; width: 60%; vertical-align: top; }
    .header-right { display: table-cell; width: 40%; vertical-align: top; text-align: right; }
    .logo-name { font-size: 20px; font-weight: 700; color: #0f4c81; letter-spacing: 1px; }
    .logo-sub  { font-size: 9px; color: #666; margin-top: 2px; }
    .doc-title  { font-size: 20px; font-weight: 700; color: #0f4c81; text-transform: uppercase; }
    .doc-date   { font-size: 10px; color: #666; margin-top: 4px; }

    .client-hero { background: #f0f6ff; border-left: 4px solid #0f4c81; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 20px; }
    .client-hero .name { font-size: 16px; font-weight: 700; color: #0f4c81; }
    .client-hero .meta { font-size: 10px; color: #555; margin-top: 4px; }
    .client-hero .meta span { margin-right: 16px; }

    .kpis { display: table; width: 100%; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .kpi  { display: table-cell; text-align: center; padding: 12px 8px; border-right: 1px solid #e2e8f0; }
    .kpi:last-child { border-right: none; }
    .kpi .val { font-size: 18px; font-weight: 700; color: #0f4c81; }
    .kpi .lbl { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

    h2.section { font-size: 11px; font-weight: 700; color: #0f4c81; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }

    table.data { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
    table.data thead tr { background: #0f4c81; color: #fff; }
    table.data thead th { padding: 7px 8px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; }
    table.data thead th.r { text-align: right; }
    table.data tbody tr:nth-child(even) { background: #f8fafc; }
    table.data tbody td { padding: 6px 8px; border-bottom: 1px solid #eef0f3; }
    table.data tbody td.r { text-align: right; }
    table.data tbody td.muted { color: #888; }

    .badge { display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 9px; font-weight: 700; }
    .badge-paid      { background: #dcfce7; color: #166534; }
    .badge-completed { background: #d1fae5; color: #065f46; }
    .badge-in_progress { background: #dbeafe; color: #1e40af; }
    .badge-pending   { background: #fef9c3; color: #92400e; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }

    .tier-standard { color: #4b5563; }
    .tier-silver   { color: #475569; }
    .tier-gold     { color: #b45309; }
    .tier-platinum { color: #6d28d9; }

    .footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #999; text-align: center; }
    .page-break { page-break-before: always; }
</style>
</head>
<body>

<div class="header">
    <div class="header-left">
        <div class="logo-name">UltraClean</div>
        <div class="logo-sub">Gestion de lavage automobile</div>
    </div>
    <div class="header-right">
        <div class="doc-title">Fiche Client</div>
        <div class="doc-date">Généré le {{ now()->format('d/m/Y') }}</div>
    </div>
</div>

{{-- Hero --}}
<div class="client-hero">
    <div class="name">{{ $client->name }}
        @if($client->is_company) <span style="font-size:10px;color:#555"> — Entreprise</span> @endif
    </div>
    <div class="meta">
        @if($client->phone) <span>📞 {{ $client->phone }}</span> @endif
        @if($client->email) <span>✉ {{ $client->email }}</span> @endif
        @if($client->vehicle_plate) <span>🚗 {{ $client->vehicle_plate }}</span> @endif
        @if($client->is_company && $client->ice) <span>ICE: {{ $client->ice }}</span> @endif
        <span class="tier-{{ $client->loyalty_tier ?? 'standard' }}">
            ★ Tier: {{ ucfirst($client->loyalty_tier ?? 'standard') }}
        </span>
    </div>
    @if($client->notes)
    <div style="font-size:10px;color:#666;margin-top:6px;font-style:italic;">{{ $client->notes }}</div>
    @endif
</div>

{{-- KPIs --}}
<div class="kpis">
    <div class="kpi">
        <div class="val">{{ $client->total_visits ?? 0 }}</div>
        <div class="lbl">Visites</div>
    </div>
    <div class="kpi">
        <div class="val">{{ number_format(($client->total_spent_cents ?? 0) / 100, 2) }} MAD</div>
        <div class="lbl">CA Total</div>
    </div>
    <div class="kpi">
        <div class="val">{{ $client->loyalty_points ?? 0 }}</div>
        <div class="lbl">Points</div>
    </div>
    <div class="kpi">
        <div class="val">{{ $client->last_visit_date ? \Carbon\Carbon::parse($client->last_visit_date)->format('d/m/Y') : '—' }}</div>
        <div class="lbl">Dernière visite</div>
    </div>
    <div class="kpi">
        <div class="val">{{ $tickets->count() }}</div>
        <div class="lbl">Tickets listés</div>
    </div>
</div>

{{-- Vehicles --}}
@if($vehicles->count())
<h2 class="section">Véhicules ({{ $vehicles->count() }})</h2>
<table class="data" style="margin-bottom:20px;">
    <thead>
        <tr>
            <th>Immatriculation</th>
            <th>Marque / Modèle</th>
            <th>Couleur</th>
            <th>Année</th>
            <th>Catégorie</th>
            <th>Principal</th>
        </tr>
    </thead>
    <tbody>
        @foreach($vehicles as $v)
        <tr>
            <td><strong>{{ $v->plate ?? '—' }}</strong></td>
            <td>{{ trim(($v->brand ?? '') . ' ' . ($v->model ?? '')) ?: '—' }}</td>
            <td>{{ $v->color ?? '—' }}</td>
            <td>{{ $v->year ?? '—' }}</td>
            <td>{{ $v->vehicleType?->label ?? '—' }}</td>
            <td>{{ $v->is_primary ? '✓' : '' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

{{-- Tickets --}}
<h2 class="section">Historique des tickets ({{ $tickets->count() }})</h2>
@if($tickets->count())
<table class="data">
    <thead>
        <tr>
            <th>N°</th>
            <th>Date</th>
            <th>Plaque</th>
            <th>Services</th>
            <th>Statut</th>
            <th class="r">Montant</th>
        </tr>
    </thead>
    <tbody>
        @foreach($tickets as $t)
        <tr>
            <td><strong>#{{ $t->ticket_number }}</strong></td>
            <td>{{ \Carbon\Carbon::parse($t->created_at)->format('d/m/Y') }}</td>
            <td class="muted">{{ $t->vehicle_plate ?? '—' }}</td>
            <td class="muted" style="max-width:160px;">
                {{ $t->services->pluck('service_name')->implode(', ') ?: '—' }}
            </td>
            <td><span class="badge badge-{{ $t->status }}">{{ $t->status }}</span></td>
            <td class="r"><strong>{{ number_format($t->total_cents / 100, 2) }} MAD</strong></td>
        </tr>
        @endforeach
    </tbody>
</table>
@else
<p style="font-size:10px;color:#aaa;margin-bottom:20px;">Aucun ticket.</p>
@endif

{{-- Loyalty transactions --}}
@if($transactions->count())
<h2 class="section">Transactions fidélité ({{ $transactions->count() }})</h2>
<table class="data">
    <thead>
        <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Description</th>
            <th class="r">Points</th>
        </tr>
    </thead>
    <tbody>
        @foreach($transactions as $tx)
        <tr>
            <td>{{ \Carbon\Carbon::parse($tx->created_at)->format('d/m/Y') }}</td>
            <td>{{ $tx->type }}</td>
            <td class="muted">{{ $tx->description ?? '—' }}</td>
            <td class="r" style="color:{{ $tx->points >= 0 ? '#166534' : '#991b1b' }};font-weight:700;">
                {{ $tx->points >= 0 ? '+' : '' }}{{ $tx->points }}
            </td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

<div class="footer">
    UltraClean — Document généré automatiquement le {{ now()->format('d/m/Y à H:i') }} — Confidentiel
</div>

</body>
</html>
