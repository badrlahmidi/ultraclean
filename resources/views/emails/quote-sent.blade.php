@component('mail::message')
# Devis {{ $quote->quote_number }}

Bonjour **{{ $client?->name ?? 'Cher client' }}**,

Suite à votre demande, veuillez trouver ci-joint notre devis.

---

**Numéro :** {{ $quote->quote_number }}
**Montant total :** {{ $totalFormatted }}
@if($validUntil)
**Valable jusqu'au :** {{ $validUntil }}
@endif

---

Ce devis est valable pour la durée indiquée ci-dessus. Passé ce délai, un nouveau devis pourra être établi.

Pour confirmer ou pour toute question, contactez-nous par téléphone ou passez directement à la station.

Merci de votre confiance,
**L'équipe UltraClean** 🚗✨

@component('mail::subcopy')
Ce mail a été envoyé automatiquement. Merci de ne pas y répondre directement.
@endcomponent
@endcomponent
