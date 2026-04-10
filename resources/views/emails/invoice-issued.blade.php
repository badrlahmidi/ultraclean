@component('mail::message')
# Facture {{ $invoice->invoice_number }}

Bonjour **{{ $client?->name ?? 'Cher client' }}**,

Veuillez trouver ci-joint votre facture émise par **UltraClean**.

---

**Numéro :** {{ $invoice->invoice_number }}
**Montant total :** {{ $totalFormatted }}
@if($dueDate)
**Date d'échéance :** {{ $dueDate }}
@endif

---

Vous pouvez régler cette facture directement sur place ou par virement bancaire.

Pour toute question, n'hésitez pas à nous contacter.

Merci de votre confiance,
**L'équipe UltraClean** 🚗✨

@component('mail::subcopy')
Ce mail a été envoyé automatiquement. Merci de ne pas y répondre directement.
@endcomponent
@endcomponent
