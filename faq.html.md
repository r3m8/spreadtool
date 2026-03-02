# FAQ - Stock Spread Calculator

Questions fréquentes sur l'utilisation du calculateur de spread boursier.

## Questions générales

### Qu'est-ce qu'un spread boursier ?

Un spread boursier est la différence entre le prix payé pour une action et le prix réel du marché au moment de la transaction. Il permet d'évaluer si vous avez obtenu une bonne exécution ou payé plus cher que le cours du marché.

### Comment fonctionne ce calculateur ?

Saisissez les détails de votre transaction : ISIN, nombre de titres, montant total payé, frais, et la date/heure exacte de la transaction. Le calculateur récupère le prix historique sur Yahoo Finance et le compare à votre prix d'exécution.

### Qu'est-ce qu'un ISIN ?

L'ISIN (International Securities Identification Number) est un code alphanumérique unique de 12 caractères identifiant une valeur mobilière spécifique. Vous pouvez généralement le trouver sur votre relevé de courtage ou en recherchant l'action en ligne.

## Données et précision

### D'où viennent les données de marché ?

Le calculateur récupère les données historiques de prix depuis Yahoo Finance, qui fournit des données fiables pour la plupart des valeurs mobilières cotées dans le monde.

### Pourquoi faut-il préciser le fuseau horaire ?

Les cours boursiers évoluent tout au long de la journée de bourse. Préciser le fuseau horaire permet de récupérer le bon prix de marché pour l'heure exacte de votre transaction, en tenant compte des différents horaires d'ouverture des marchés dans le monde.

### Comment le spread est-il calculé ?

Le spread est calculé en utilisant la formule du prix typique (haut+bas+clôture)/3 pour des résultats plus précis. En raison des restrictions de l'API Yahoo Finance, nous ne pouvons récupérer que 8 jours de données à granularité 1 minute par requête, ce qui limite la précision historique au-delà de cette période.

## Trade Republic

### Comment récupérer vos spreads sur Trade Republic ?

Pour analyser vos spreads Trade Republic:

1. Exportez vos relevés de transaction depuis l'application
2. Identifiez les ISIN de vos valeurs
3. Saisissez chaque transaction dans le calculateur avec la date et l'heure exactes
4. Comparez les résultats avec les données de marché

### Pourquoi les prix diffèrent-ils du relevé Lang & Schwarz ?

Les écarts avec le relevé Lang & Schwarz peuvent s'expliquer par:

- La méthode de calcul du prix (prix typique vs prix d'exécution)
- Les délais de publication des données
- Les différences de sources de données

## Navigation

- [Calculateur de spread](/index.html.md)
- [Accueil](/index.html.md)
