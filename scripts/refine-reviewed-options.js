// Local editorial refinements: remove genuinely competing valid answers.
// Run after the API job finishes; changed questions require another blind review.
import fs from 'node:fs';
const path=new URL('../data/reviewed-technical-options.json',import.meta.url);
const state=JSON.parse(fs.readFileSync(path,'utf8'));
const changes={
  't2-A-M09':{
    1:['Traiter les dossiers par approbation du résumé exécutif, en donnant à cet accord la valeur d’un examen du fond.','L’approbation d’une synthèse ne prouve pas que le fond d’un dossier a été examiné et délibéré.'],
    2:['Accorder davantage de temps aux dossiers déjà consensuels, le consensus étant pris comme mesure de leur importance stratégique.','Le degré de consensus ne mesure ni l’urgence ni l’importance stratégique d’une décision.']},
  't2-B-M05':{2:['Assimiler la déclaration de taxe sur la facture à la preuve du droit définitif au produit comptabilisé.','La déclaration fiscale ne prouve ni la bonne exécution de la prestation ni le bien-fondé du revenu contesté.']},
  't2-B-M07':{0:['Séparer saisie et rapprochement bancaire, tout en confiant autorisation et exécution du virement au même agent.','Séparer des tâches comptables ne supprime pas ici le cumul de l’autorisation et de l’exécution du paiement.']},
  't2-B-M09':{
    0:['Le registre des intérêts, dont l’actualisation annuelle vaut traitement des conflits rencontrés pendant les séances.','La déclaration générale des intérêts ne remplace pas le traitement d’un conflit relatif à une décision donnée.'],
    2:['Une attestation du membre concerné, dont l’absence de gain réalisé vaut preuve d’absence de conflit.','Un conflit peut exister avant tout gain et même si aucun avantage n’a finalement été obtenu.'],
    3:['Un avis du commissaire aux comptes, assimilé à une autorisation de participer au vote du point concerné.','L’avis de l’auditeur ne vaut pas dispense des règles de déclaration et de déport applicables.']},
  't2-C-M04':{3:['Déduire la disponibilité technique des engins du nombre d’opérateurs expérimentés inscrits au planning de chaque vacation.','Les compétences des opérateurs et l’aptitude technique des engins sont deux contraintes distinctes de capacité.']},
  't2-C-M07':{
    0:['Assimiler le récépissé de paiement du fret à une autorisation nominative de retrait pour le chauffeur présent.','Le paiement du fret ne démontre pas à lui seul que ce chauffeur est habilité à retirer la marchandise.'],
    2:['Retenir la concordance entre plaque du véhicule et lettre de voiture comme preuve de l’habilitation du conducteur.','L’identification du véhicule ne prouve pas l’identité ni le mandat de la personne qui se présente.'],
    3:['Traiter la signature du registre de sortie comme preuve de concordance du lot avec l’ordre de livraison.','La signature atteste une remise déclarée ; elle ne remplace pas le rapprochement des références du lot.']},
  't2-C-M08':{
    1:['Additionner les tonnages de chaque mode pour mesurer le volume effectivement livré sur l’ensemble du trajet.','Une même tonne passant successivement par plusieurs modes serait comptée plusieurs fois.'],
    2:['Calculer le délai global comme la moyenne des durées des segments et des attentes aux interfaces.','Les durées successives du parcours s’additionnent ; leur moyenne ne mesure pas le délai de bout en bout.'],
    3:['Assimiler le respect des délais propres à chaque opérateur au respect de l’engagement de bout en bout.','Les attentes et ruptures aux interfaces peuvent dégrader le délai global malgré le respect des délais locaux.']},
  't2-D-M06':{
    0:['Le taux d’occupation maximal des quais, interprété comme une disponibilité optimale des capacités du terminal.','Une occupation très élevée peut signaler une saturation ; elle ne démontre pas une capacité disponible optimale.'],
    1:['La somme des débits nominaux des engins successifs, retenue comme capacité effective de la chaîne modernisée.','Dans une chaîne en série, le goulot contraint le débit ; additionner les capacités nominales le surestime.'],
    3:['La baisse de dotation aux amortissements, assimilée aux économies de trésorerie produites par la modernisation.','La dotation est une charge calculée ; sa baisse ne prouve pas une économie d’exploitation encaissable.']},
  't2-E-M03':{
    0:['Déduire de la notification d’attribution que les conditions de décaissement ont déjà été satisfaites par le bénéficiaire.','L’attribution d’un financement ne prouve pas que ses conditions préalables au versement sont réalisées.'],
    1:['Assimiler l’admissibilité du bénéficiaire à l’éligibilité de chaque dépense inscrite au plan d’emploi des fonds.','Un bénéficiaire admissible peut proposer des dépenses non éligibles au dispositif concerné.'],
    2:['Considérer le versement sur le compte principal comme une levée de l’affectation contractuelle des fonds reçus.','Le compte bancaire destinataire ne modifie pas les obligations attachées au financement affecté.']},
  't2-F-M01':{0:['Corriger les tonnages commerciaux au prorata du chiffre d’affaires pour les aligner sur le total portuaire.','Le chiffre d’affaires dépend aussi des prix et prestations ; il ne fournit pas une clé de rapprochement des tonnages.']},
  't3-A-M01':{2:['Le taux de dossiers ajournés, assimilé au taux de dossiers correctement instruits avant la séance du conseil.','Un ajournement ne prouve pas qu’un dossier était correctement préparé ; les deux indicateurs ne sont pas interchangeables.']},
  't3-A-M05':{1:['Additionner les pourcentages annuels d’avancement, même calculés sur des bases différentes, pour établir le progrès pluriannuel.','Des pourcentages reposant sur des bases différentes ne s’additionnent pas pour mesurer un avancement cumulé cohérent.']},
  't3-A-M09':{1:['Traiter l’avis favorable du représentant de l’actionnaire au CA comme une délibération de l’assemblée générale.','L’avis d’un représentant dans un organe ne constitue pas une décision régulière d’un autre organe.']},
  't3-B-M01':{0:['Présenter une nouvelle méthode comptable en annexe en considérant cette information comme un ajustement des montants des états.','Expliquer une méthode en annexe ne modifie pas les montants comptabilisés ; information et comptabilisation sont deux opérations distinctes.']},
  't3-C-M01':{
    0:['Attribuer l’évolution du taux de dommages au volume stocké dès que leurs variations suivent le même sens.','Une corrélation entre volume et dommages n’établit pas la cause des dommages ; les circonstances doivent être examinées.'],
    3:['Imputer la hausse des dommages à une hausse de franchise, celle-ci mesurant la fréquence des avaries.','La franchise répartit la charge financière d’un sinistre ; elle ne mesure pas la fréquence des avaries.']},
  't3-C-M05':{0:['Présenter le programme prévu pour la vacation précédente comme état de réalisation transmis à la relève.','Le planning décrit une intention ; il ne prouve pas l’état réel des opérations au changement d’équipe.']},
  't3-C-M07':{
    1:['Utiliser la masse brute du wagon comme mesure de la masse de marchandise effectivement chargée.','La masse brute inclut la tare du wagon ; elle ne correspond pas à la masse nette de marchandise.'],
    2:['Retenir le numéro du train comme identifiant du wagon pour rapprocher le lot de l’ordre de chargement.','Un train regroupe plusieurs wagons ; son numéro ne permet pas d’identifier le wagon auquel le lot est affecté.'],
    3:['Déduire de l’intégrité du scellé que le lot chargé correspond à la destination prévue au manifeste.','Un scellé intact renseigne sur l’intégrité de fermeture, pas sur la conformité du lot et de sa destination.']},
  't3-D-M01':{2:['Assimiler la durée de la fenêtre de travaux à la durée de validité de la restriction temporaire de vitesse.','Le créneau de travaux et la validité d’une restriction ne se confondent pas ; la levée exige une vérification appropriée.']},
  't3-D-M02':{0:['Assimiler le nombre de locomotives remises en atelier au nombre de locomotives disponibles pour les dessertes.','L’entrée ou la remise en atelier ne démontre pas l’aptitude au service après travaux et essais.']},
  't3-F-M02':{
    1:['Ramener le dépassement apparent à zéro en prenant la prévision révisée comme budget de référence du projet.','Changer la base efface l’écart affiché, mais n’explique ni le surcoût par rapport au budget initial ni ses options de traitement.'],
    2:['Compenser la hausse du projet par une baisse d’amortissement prévisionnel de même montant dans le budget.','Une baisse de charge calculée ne finance pas la hausse des dépenses du projet.'],
    3:['Assimiler les engagements non encore payés à des économies disponibles pour financer le dépassement annoncé.','Les engagements non décaissés restent des obligations à intégrer au coût à terminaison, pas des économies.']},
  'sncc1-C-M01':{3:['75 %','Ce taux correspondrait à 15 locomotives aptes sur 20 ; les données indiquent 12 sur 20, soit 60 %.']},
  'sncc1-A-M05':{1:['Le rapport entre distance parcourue et temps de circulation du wagon.','Ce rapport mesure une vitesse moyenne ; la rotation est un cycle complet entre deux disponibilités pour chargement.']},
  'sncc1-A-M07':{3:['Pour calculer le poids réel du train en additionnant les charges maximales admissibles par essieu.','Les limites admissibles ne sont pas les charges réelles ; leur somme ne donne pas le poids constaté du train.']},
  'sncc1-B-M03':{0:['Une exclusivité assimilant l’accès réservé au corridor à un engagement ferme de volumes du partenaire.','Une exclusivité d’accès ne constitue pas, par elle-même, un engagement de trafic quantifié et sanctionnable.']},
  'sncc1-C-M05':{2:['Comparer amortissement annuel et loyers pour mesurer les décaissements annuels de chaque solution.','L’amortissement est une charge calculée ; le traiter comme un décaissement fausse la comparaison achat-location.']},
  'sncc1-C-M06':{2:['Expliquer la marge en retranchant les charges fixes des recettes, les coûts variables relevant du tonnage.','Les coûts variables doivent aussi être déduits pour expliquer la marge ; la hausse de tonnage ne les neutralise pas.']},
  'sncc1-C-M08':{
    2:['Considérer les heures de conduite comme preuve des pièces effectivement consommées sur chaque locomotive.','Les heures d’utilisation peuvent aider à répartir certains coûts, mais ne prouvent pas la consommation d’une pièce identifiée.'],
    3:['Prendre la part de tonnage tracté comme preuve d’exécution des interventions d’entretien sur chaque machine.','Le tonnage est un indicateur d’activité, pas une preuve de réalisation ni d’imputation d’une intervention de maintenance.']},
  'sncc1-D-M04':{3:['Assimiler le visa du conseil sur une facture à la preuve physique des travaux facturés.','Une approbation ne prouve pas la réalisation des travaux ; le conseil doit obtenir des éléments probants via le dispositif de contrôle.']},
  'sncc1-E-M02':{0:['Le taux de résolutions signées, interprété comme taux d’exécution effective des décisions fret du conseil.','La formalisation d’une décision ne démontre pas son exécution ; un suivi doit mesurer les réalisations et écarts.']},
  'sncc2-B-M02':{3:['Le risque de défaut devient secondaire, une garantie de volumes effaçant l’exposition financière au client.','Un engagement de volumes ne supprime pas le risque de défaillance ou d’impayé du client dont dépend le projet.']},
  'sncc2-B-M04':{
    0:['L’indexation du prix, considérée comme transférant au partenaire les obligations futures d’entretien de l’infrastructure.','L’ajustement d’un prix ne répartit pas les responsabilités d’entretien ; celles-ci doivent être définies dans le contrat.'],
    1:['La réception provisoire, considérée comme libérant les parties de leurs engagements de maintenance après les travaux.','La réception n’efface pas les obligations contractuelles qui subsistent, notamment celles relatives à l’entretien.'],
    3:['La garantie de trafic, considérée comme couvrant les responsabilités d’entretien et de renouvellement de la voie.','Une clause de trafic organise des volumes ou recettes ; elle ne définit pas à elle seule qui entretient et finance la voie.']},
  'sncc2-B-M05':{3:['Privilégier la réussite aux modules généraux, tenue pour preuve d’aptitude aux postes ferroviaires critiques.','Des acquis généraux ne démontrent pas la maîtrise des compétences spécifiques nécessaires à un poste critique.']},
  'sncc2-B-M09':{3:['Considérer la couverture radio du corridor comme preuve de fiabilité des identifiants de wagons collectés.','La disponibilité du réseau de communication ne valide pas la qualité des référentiels et des événements enregistrés.']},
  'sncc3-C-M08':{2:['Retenir les heures de ralenti comme mesure de production transportée pour normaliser l’énergie consommée.','Le ralenti consomme de l’énergie mais ne mesure pas le service transporté ; il ne remplace pas un dénominateur de production comparable.']},
  'sncc3-C-M04':{3:['Le risque de non-livraison disparaît lorsque le paiement intégral déclenche le transfert de propriété des wagons.','Un titre de propriété ne garantit pas la livraison physique et n’élimine pas l’exposition au fournisseur payé d’avance.']},
  'sncc3-E-M03':{
    2:['Pour donner aux réserves d’un administrateur la valeur d’un veto sur l’exécution de la décision adoptée.','L’inscription d’une réserve assure la traçabilité ; elle ne crée pas un droit de veto individuel.'],
    3:['Pour traiter un désaccord consigné comme l’annulation de la participation de son auteur à la délibération.','Une opinion minoritaire n’équivaut pas à une absence ou à un déport ; le procès-verbal doit distinguer ces situations.']},
  'rva1-A-M04':{1:['Les stations météorologiques dont les prévisions assurent la séparation opérationnelle des aéronefs en approche.','Les prévisions renseignent les usagers ; elles ne réalisent pas la séparation des aéronefs assurée par les services compétents.']},
  'rva1-A-M05':{
    1:['Une réduction des distances déclarées, le balisage étant assimilé à la longueur physique de la piste.','Le balisage et la géométrie de piste sont distincts ; les restrictions doivent être appréciées selon les conditions d’exploitation.'],
    2:['Une modification des minima propres aux aéronefs par l’exploitant pour compenser l’indisponibilité des feux.','L’exploitant ne compense pas un système lumineux indisponible en modifiant lui-même les minima des aéronefs.'],
    3:['Une substitution par l’éclairage de l’aire de trafic, réputé équivalent au balisage de piste.','L’éclairage général d’une aire de trafic ne remplit pas les fonctions d’un balisage de piste conforme.']},
  'rva1-B-M08':{
    1:['Retenir l’accord de financement comme preuve que les résultats du pilote justifient son extension.','L’accord financier ne démontre pas l’atteinte des objectifs opérationnels du pilote.'],
    3:['Utiliser le taux d’installation des équipements comme mesure de l’amélioration effective du service testé.','L’installation mesure un déploiement de moyens, pas l’effet du pilote sur le service.']},
  'rva2-B-M01':{1:['Déduire le niveau de criticité de l’âge comptable, les équipements récents étant considérés non critiques.','La criticité dépend des conséquences d’une défaillance ; un équipement récent peut être indispensable à la sécurité ou à la continuité.']},
  'rva2-B-M06':{
    2:['Mesurer les bagages mal acheminés par le nombre de passagers contrôlés au poste inspection-filtrage.','Le contrôle des passagers ne mesure pas la qualité d’acheminement des bagages.'],
    3:['Déduire le taux de tri correct de la consommation électrique moyenne du système de convoyage.','La consommation d’énergie ne prouve pas qu’un bagage est orienté vers la destination correcte.']},
  'rva2-C-M04':{3:['Traiter l’unicité de l’IBAN fournisseur comme preuve que la même facture ne peut être payée deux fois.','Un même fournisseur doté d’un IBAN unique peut recevoir deux règlements de la même facture.']},
  'rva2-D-M01':{
    2:['Prendre le nombre de signalements de faune comme mesure directe du nombre de collisions effectivement survenues.','Un signalement de présence faunique et une collision sont deux événements différents.'],
    3:['Assimiler la validation documentaire du plan faune à la preuve de réduction effective des collisions observées.','La conformité d’un plan ne démontre pas ses résultats sur le terrain ; l’efficacité doit être mesurée.']},
  'rva2-D-M06':{
    0:['Compter les heures supplémentaires comme nouvelles habilitations pour augmenter l’effectif techniquement qualifié disponible.','Allonger le temps de travail ne crée ni qualification ni habilitation supplémentaires.'],
    3:['Prendre une attestation générale de formation pour une habilitation couvrant tous les équipements de navigation.','Une formation générale ne prouve pas l’aptitude spécifique requise sur chaque système concerné.']},
  'rva2-D-M07':{
    0:['Déterminer la fin de support à partir de la valeur nette comptable restante des équipements.','L’amortissement et le support technique suivent des critères distincts ; une valeur comptable n’établit pas la disponibilité du support.'],
    2:['Considérer la détention des licences comme garantie d’accès aux correctifs après arrêt du support fournisseur.','Le droit d’usage ne garantit pas la poursuite des mises à jour et du support.'],
    3:['Prendre la compatibilité fonctionnelle actuelle comme preuve de disponibilité future des pièces et des compétences.','Le bon fonctionnement présent ne démontre pas que les moyens de maintien en service resteront disponibles.']},
  'rva2-E-M03':{
    0:['Tenir l’inscription d’une réserve au procès-verbal pour une suspension de l’exécution de la décision adoptée.','La réserve consignée ne constitue pas par elle-même une décision de suspension.'],
    1:['Donner au silence des autres administrateurs sur la réserve la valeur d’une approbation unanime de celle-ci.','L’absence de réaction ne se substitue pas à une délibération ou à un vote régulier.'],
    3:['Reclasser le vote minoritaire comme abstention dès lors que son motif est reproduit au procès-verbal.','Motiver un vote ne change pas sa nature ; opposition, abstention et déport doivent rester distincts.']},
  'rva3-B-M08':{
    0:['Déduire l’applicabilité de la norme du pays de publication plutôt que de son champ et du cadre applicable.','L’origine d’un document ne suffit pas à déterminer son applicabilité aux activités de la RVA.'],
    3:['Assimiler la conformité à une édition antérieure à la conformité aux exigences de la nouvelle édition.','Des exigences modifiées doivent être analysées ; la conformité antérieure ne prouve pas celle à la nouvelle version.']},
  'rva3-C-M06':{2:['Considérer la concordance avec le devis comme preuve de réalisation de la prestation facturée.','Le devis précise des engagements et un prix ; il ne prouve pas que la prestation a été exécutée.']},
  'rva3-C-M08':{2:['Assimiler un taux d’emprunt inférieur à la marge comptable à une capacité suffisante de remboursement.','Une marge comptable ne prouve pas que les liquidités seront disponibles aux échéances de la dette.']},
  'rva3-D-M02':{
    0:['Valider la bascule d’après les tests unitaires, ceux-ci démontrant aussi le bon fonctionnement des interfaces.','Un test unitaire ne remplace pas les tests d’intégration et de bascule dans un environnement représentatif.'],
    1:['Tenir une autorisation réglementaire pour une preuve d’exécution concluante des tests de reprise du système.','L’autorisation et la preuve technique d’une reprise testée sont deux éléments distincts.'],
    3:['Considérer une sauvegarde des données comme garantie de repli, sans distinguer sauvegarde et restauration testée.','Une sauvegarde existante ne démontre pas que la restauration et le repli fonctionneront dans les délais requis.']},
  'rva3-D-M05':{
    1:['Prendre la puissance nominale constructeur comme preuve de tenue de l’alimentation sur la charge réelle installée.','Une valeur nominale ne remplace pas un essai sous charge tenant compte du système effectivement secouru.'],
    3:['Utiliser le rendement mesuré en régime stable comme preuve du bon fonctionnement lors de la bascule de secours.','Le rendement en fonctionnement établi ne démontre pas la réussite du transfert ni la continuité pendant la bascule.']},
  'rva3-F-M01':{0:['Quelle panne indépendante a provoqué l’arrêt simultané des deux systèmes, l’indépendance étant déduite de leur nombre ?','Deux systèmes peuvent partager une dépendance ; leur nombre ne démontre pas l’indépendance de leurs modes de défaillance.']},
  'rva4-B-M02':{3:['Convertir une baisse de redevances en hausse de trafic de même pourcentage pour dimensionner la plateforme.','L’élasticité de la demande n’est pas nécessairement égale à un ; une baisse de tarif ne détermine pas mécaniquement le trafic.']},
  'rva5-D-M03':{
    1:['Prendre l’absence d’observation de l’AAC comme preuve d’exhaustivité du registre interne des pannes.','L’absence d’observation du superviseur ne prouve pas que tous les événements ont été déclarés.'],
    2:['Déduire le nombre de pannes des achats de pièces, en considérant une pièce achetée comme une panne survenue.','Les achats incluent stocks et prévention ; ils ne correspondent pas un pour un aux pannes effectivement constatées.']},
  'rva5-D-M04':{0:['L’agrément du prestataire vaut-il preuve que ses prestations ont atteint les niveaux de service contractuels pendant la période ?','Un agrément ne démontre pas l’exécution effective du contrat ni le respect des niveaux de service observés.']},
};
const polish={
  't2-A-M09':{0:['Prendre la date de dépôt des dossiers comme mesure de leur urgence et de leur importance pour le conseil.','L’ordre de dépôt ne mesure pas la criticité ni les échéances réelles d’une décision.']},
  't2-B-M02':{3:['Traiter un faible ratio dette nette sur capitaux propres comme preuve de capacité à honorer les prochaines échéances.','Un faible levier ne démontre pas la liquidité disponible aux dates de remboursement ; échéancier, coût et flux restent nécessaires.']},
  't2-B-M07':{1:['Séparer engagement et réception, mais tenir la signature du demandeur pour une approbation indépendante du paiement.','L’auteur de la demande n’apporte pas une approbation indépendante de sa propre opération.']},
  't2-C-M01':{2:['Donner au document de transport la valeur d’un constat de l’état physique du conteneur lors de sa réception.','Le document accompagne le transport ; il ne remplace pas le constat matériel à la réception et les réserves pertinentes.']},
  't2-C-M06':{
    0:['Assimiler l’attente des équipes à une surestarie du navire et appliquer le même décompte au client.','L’immobilisation des équipes et les surestaries du navire relèvent de faits et d’engagements distincts ; leur imputation doit être justifiée.'],
    2:['Qualifier le décalage d’ETA de force majeure contractuelle sur la base du nouvel horaire transmis par l’armateur.','Le changement d’horaire ne prouve pas les conditions contractuelles d’une force majeure.']},
  't2-D-M01':{1:['Déduire l’absence de défaut du respect de la vitesse autorisée pendant les circulations précédentes.','Le respect d’une vitesse prescrite ne prouve pas le bon état des appareils de voie ; une inspection recherche les défauts.']},
  't2-D-M02':{
    0:['Traiter le débit de pointe saisonnière comme débit permanent pour chiffrer les avantages annuels du renouvellement.','Une pointe saisonnière ne représente pas l’activité pendant toute l’année ; cette assimilation surestime les bénéfices.'],
    2:['Retenir le plus faible investissement initial comme option la moins coûteuse sur la durée complète d’exploitation.','Le CAPEX initial ne comprend pas maintenance, indisponibilités, restrictions et autres coûts du cycle de vie.']},
  't2-F-M03':{1:['Assimiler une hausse du tarif en monnaie locale à une couverture effective du change sur les pièces importées.','Modifier un tarif ne garantit ni encaissements ni compensation de l’exposition au change et de son calendrier.']},
  't3-B-M04':{0:['Tenir le verrouillage de période pour preuve de justification des écritures manuelles saisies avant clôture.','Un verrou empêche certaines modifications, mais ne démontre pas la validité des écritures déjà enregistrées.']},
  't3-C-M01':{1:['Imputer les avaries au fournisseur dès que l’emballage est altéré, cet état établissant l’origine du dommage.','L’emballage peut être endommagé à plusieurs étapes ; son état ne suffit pas à attribuer la cause au fournisseur.']},
  't3-C-M04':{1:['Dimensionner le stock de sécurité sur la capacité d’entreposage, tenue pour consommation pendant le délai d’approvisionnement.','La place disponible ne mesure pas le besoin pendant le délai ; consommation, délai et incertitude doivent être appréciés.']},
  't3-C-M06':{1:['Remplacer les durées individuelles par leur moyenne mensuelle, puis utiliser cette moyenne pour calculer les percentiles.','Une moyenne agrégée ne permet pas de reconstituer la distribution des durées ni ses percentiles.']},
  't3-D-M04':{1:['Assimiler l’exclusivité d’accès accordée au partenaire à un engagement de performance contractuelle sur le service.','Une exclusivité organise un droit d’accès ; elle ne constitue pas un engagement mesurable de résultat du partenaire.']},
  'sncc1-C-M06':{1:['Attribuer la hausse de tonnage à une hausse identique de marge, les volumes étant assimilés aux prix nets.','Les prix, le mix et les coûts peuvent changer ; volume et marge ne progressent pas nécessairement ensemble.']},
  'sncc1-F-M02':{1:['Quel montant de pénalités retenir comme équivalent d’un plan de rattrapage des retards de livraison ?','Une pénalité financière ne constitue pas un plan opérationnel de rattrapage du délai.']},
  'sncc2-D-M02':{1:['Mesurer le taux de livraison contractuelle par la consommation de rails sur les chantiers ouverts pendant le mois.','La consommation d’un stock sur chantier et la livraison du fournisseur ne représentent pas le même flux.']},
  'sncc3-A-M08':{2:['Elle étend l’aptitude des conducteurs à tout matériel compatible, les règles techniques tenant lieu d’habilitation.','La compatibilité du matériel et les compétences ou habilitations des conducteurs sont deux exigences distinctes.']},
  'sncc3-F-M03':{3:['Considérer l’ancien volume comme prévision acquise dès le rétablissement des tarifs antérieurs.','La demande et la concurrence peuvent avoir changé ; le retour à un ancien prix ne garantit pas le retour au volume passé.']},
  'rva1-A-M05':{
    1:['Une suppression des minima de visibilité diurne, les références visuelles naturelles étant tenues pour un substitut réglementaire.','Une panne de balisage ne supprime pas les minima applicables ; les conditions autorisées doivent être établies.'],
    3:['Un maintien des mêmes minima d’approche grâce à l’aide radio, dont l’intégrité vaut celle du balisage.','Le fonctionnement d’une aide radio ne démontre pas celui des aides visuelles ; leurs effets sur les conditions d’approche sont distincts.']},
  'rva1-B-M01':{0:['Retenir la fréquence des demandes commerciales comme mesure de criticité de sécurité des équipements à renouveler.','La popularité commerciale ne mesure pas les conséquences d’une défaillance sur la sécurité et la continuité.']},
  'rva1-C-M05':{3:['Retenir le budget d’investissement comme coût complet, les charges d’exploitation étant considérées couvertes par l’amortissement.','L’amortissement ne paie ni ne représente l’ensemble des coûts d’exploitation et de maintenance.']},
  'rva1-D-M07':{
    1:['Le taux de procédures signées, utilisé comme taux de détection effective des tentatives d’intrusion.','La validation documentaire ne mesure pas le nombre de tentatives effectivement détectées.'],
    3:['Le nombre de patrouilles, retenu comme mesure du taux de détection des intrusions sur le site.','Le volume de patrouilles mesure un moyen ; le taux de détection demande des résultats observés et une assiette adaptée.']},
  'rva2-B-M06':{
    2:['Le taux de tri correct calculé sur les bagages encore présents, les bagages acheminés étant retirés de l’assiette.','Cette assiette exclut les bagages déjà traités et biaise la mesure de qualité du tri.'],
    3:['La disponibilité du convoyage mesurée par le temps de trajet entre injection du bagage et chargement.','Le temps de transit mesure une durée de parcours, pas la proportion de temps pendant laquelle le convoyage est disponible.']},
  'rva2-B-M07':{1:['Assimiler la mise à jour du statut dans la base patrimoniale à un constat physique d’état de l’équipement.','Une saisie informatique ne démontre pas à elle seule l’état matériel ; la fiabilité du statut dépend de preuves et vérifications.']},
  'rva2-D-M01':{
    2:['Utiliser les collisions par mouvement comme mesure de gravité moyenne des collisions sur la plateforme.','Les collisions par mouvement mesurent une fréquence rapportée à l’exposition, pas la gravité de leurs conséquences.'],
    3:['Normaliser les collisions par les heures de permanence administrative, retenues comme équivalent de l’activité aéronautique exposée.','La permanence administrative ne représente pas l’exposition des mouvements d’aéronefs au risque faunique.']},
  'rva2-D-M04':{0:['Utiliser la durée moyenne entre pannes pour mesurer la durée moyenne des interruptions de service.','Le MTBF mesure l’intervalle entre défaillances ; il ne remplace pas une mesure de durée de rétablissement ou d’interruption.']},
  'rva2-D-M06':{
    0:['Reconduire les habilitations échues sur la base de l’ancienneté, tenue pour maintien démontré des compétences.','L’ancienneté ne prouve pas à elle seule le maintien de compétences et habilitations requises.'],
    3:['Étendre une habilitation à tout équipement de même fonction, les variantes techniques étant considérées interchangeables.','Une fonction identique ne démontre pas la maîtrise de variantes et procédures techniques différentes.']},
  'rva3-B-M08':{2:['Déduire l’applicabilité nationale de la norme de son adoption par le fournisseur du système utilisé par la RVA.','L’adoption par un fournisseur ne détermine pas à elle seule le champ national et contractuel applicable à la RVA.']},
  'rva3-F-M01':{2:['Quel renouvellement de pièces retiendra-t-on comme preuve d’indépendance des alimentations des deux systèmes ?','Changer des pièces ne démontre pas que l’architecture d’alimentation ne comporte plus de dépendance commune.']},
  'rva4-A-M08':{3:['Parce que les montants décaissés constituent une preuve de réception technique conforme des prestations financées.','La consommation financière ne démontre ni l’achèvement ni la conformité technique des livrables.']},
  'rva4-B-M06':{2:['Calculer les amortissements d’après le nombre d’interventions, tenu pour mesure de la durée d’utilité de l’actif.','Le nombre d’interventions ne détermine pas à lui seul la durée d’utilité ni la méthode d’amortissement.']},
  'rva4-C-M06':{1:['L’économie apparente sur le prix unitaire, tenue pour économie nette malgré les coûts de maintenance induits.','L’économie nette doit intégrer les coûts induits ; une baisse de prix d’achat n’est pas nécessairement une économie globale.']},
  'rva4-C-M07':{3:['Déduire un coût final égal au double du budget, le ratio dépenses sur avancement étant une identité comptable.','Les avances et le calendrier des coûts peuvent décorréler paiements et avancement ; leur ratio ne constitue pas une identité de coût final.']},
  'rva4-E-M01':{3:['Donner à une instruction de la tutelle la valeur d’une délibération régulière du conseil sur le projet concerné.','Une demande ou instruction de tutelle ne se confond pas avec la délibération de l’organe compétent selon le cadre applicable.']},
  'rva4-E-M02':{2:['Le risque de valorisation est considéré couvert lorsque le prix proposé correspond à la valeur nette comptable de l’actif.','La valeur comptable ne prouve pas la valeur de marché ; sa concordance avec le prix ne remplace pas l’évaluation appropriée.']},
  'rva4-F-M01':{1:['Traiter le retour des recettes prévues comme preuve du rétablissement de la résistance du site aux inondations.','Le rétablissement financier ne démontre pas la résilience physique et opérationnelle face au risque d’inondation.']},
  'rva5-B-M07':{2:['Retenir le nombre d’attestations de présence comme taux de maîtrise des compétences critiques du programme.','La présence à une formation ne démontre pas l’acquisition et le maintien des compétences recherchées.']},
  'rva5-C-M06':{2:['Elle transforme la moyenne entre pannes en prévision certaine du moment de la prochaine défaillance.','Une moyenne statistique n’est pas une date de panne certaine ; la dispersion et les conditions d’exploitation comptent.']},
  'rva5-D-M03':{
    0:['Interpréter l’attestation sans réserve du directeur général comme preuve d’absence de sous-déclaration des événements techniques.','Une déclaration de la direction ne remplace pas le rapprochement de sources permettant d’éprouver l’exhaustivité.'],
    1:['Retenir le nombre de dossiers d’incidents comme nombre de pannes, chaque événement étant réputé produire un dossier unique.','Les règles de regroupement et d’ouverture des dossiers peuvent différer du nombre de pannes réellement survenues.'],
    2:['Rapporter les pièces remplacées à la durée moyenne de maintenance pour reconstituer le nombre de pannes non déclarées.','Ce rapport ne compte pas les pannes : une panne peut mobiliser plusieurs pièces et les remplacements peuvent être préventifs.']},
};
const finalCorrections={
  't2-B-M02':{0:['Lire le ratio d’endettement comme taux de couverture des prochaines échéances par les encaissements d’exploitation.','Un ratio d’endettement décrit une structure financière ; il ne se confond pas avec la couverture du service de la dette par les flux.']},
  't2-D-M02':{3:['Réduire le coût à terminaison du montant des travaux différés, en traitant le report comme une économie définitive.','Différer une dépense ne l’annule pas ; le coût futur et les effets sur service et risque restent à intégrer.']},
  't2-F-M03':{0:['Traiter le taux budgétaire voté par le conseil comme taux garanti de règlement des fournisseurs en devises.','Un taux interne de planification n’est pas un taux de marché garanti ni une couverture de change exécutée.']},
  'sncc1-C-M06':{3:['Retenir l’EBITDA comme trésorerie encaissée, puis attribuer toute baisse de marge à un défaut de recouvrement.','L’EBITDA n’est pas un encaissement ; prix, mix, charges et besoin en fonds de roulement doivent être distingués.']},
  'sncc3-B-M02':{1:['Retenir le taux de croissance du parc comme taux de croissance de la productivité du matériel ferroviaire.','Augmenter le nombre d’actifs ne démontre pas une amélioration de la production par unité de moyens engagés.']},
  'rva1-A-M04':{0:['Les radiophares VOR/DME assurant la détection et l’identification radar des aéronefs en route.','Les VOR/DME fournissent des références de navigation ; ils ne réalisent pas les fonctions de surveillance radar.']},
  'rva2-B-M01':{2:['Déduire la criticité d’une intervention de sa dotation budgétaire, les crédits votés mesurant le risque technique.','Une autorisation budgétaire ne mesure pas les conséquences techniques et opérationnelles d’une défaillance.']},
  'rva2-D-M04':{1:['Mesurer la fréquence des interruptions par le temps moyen de réparation, un MTTR faible traduisant peu de pannes.','Le MTTR mesure une durée moyenne de réparation, pas la fréquence des pannes ; des pannes fréquentes peuvent être brèves.']},
  'rva3-F-M01':{3:['Quel calendrier de maintenance séparée retiendra-t-on comme preuve d’absence de dépendance commune entre les deux chaînes ?','Des dates de maintenance séparées ne prouvent pas l’indépendance des alimentations, réseaux, locaux et autres dépendances communes.']},
  'rva5-D-M04':{
    0:['Quel agrément du prestataire tiendra lieu de preuve du respect des niveaux de service pendant la période ?','Un agrément ne remplace pas les mesures de performance et preuves d’exécution du contrat.'],
    1:['Quel niveau de pénalités garantira la remise à niveau technique et justifiera la prolongation du contrat ?','Une pénalité est un mécanisme contractuel ; elle ne garantit ni la correction technique ni la pertinence d’une prolongation.'],
    2:['Quelle baisse de prix garantira la disparition des incidents techniques à l’origine de l’insatisfaction ?','Une concession tarifaire ne corrige pas les causes techniques des incidents ; les options de remédiation doivent être analysées.']},
};
Object.assign(finalCorrections,{
  'sncc1-F-M01':{2:['Assimiler l’immobilisation des trains à une perte définitive de capacité pour redimensionner l’offre annuelle.','Une indisponibilité temporaire ne démontre pas une perte structurelle ; le diagnostic et les conditions de sécurité précèdent l’arbitrage.']},
  'sncc2-D-M04':{2:['Suivre la durée des restrictions comme durée des travaux accomplis, leur présence attestant le traitement du défaut.','Une restriction matérialise une limite d’exploitation ; sa présence ne prouve pas l’exécution des travaux ni la correction du défaut.']},
  'sncc2-F-M01':{3:['Dimensionner la reprise sur le débit antérieur à l’inondation, les sillons théoriques étant tenus pour immédiatement exploitables.','La capacité théorique antérieure ne démontre pas la capacité sûre après dommage ; l’état réel doit être établi.']},
  'sncc3-F-M01':{2:['Tenir la régularité du trafic passé pour validation de la stabilité actuelle du talus et programmer la reprise commerciale.','Le fonctionnement antérieur ne réfute pas une nouvelle alerte de stabilité ; les mesures et vérifications doivent porter sur l’état actuel.']},
  'sncc3-A-M02':{0:['Elle fixe la charge admissible par essieu du train tracté, sa puissance déterminant les limites de l’ensemble du convoi.','La puissance d’une locomotive ne détermine pas les limites de charge par essieu de l’infrastructure et des véhicules.']},
  'rva2-F-M01':{2:['Quelle capacité déduire du nombre d’agents présents, les arrêts du convoyeur étant traités comme temps de manutention ?','Le nombre d’agents ne suffit pas à établir la capacité du convoyage ; confondre arrêt technique et manutention masque le goulot.']},
  'rva2-F-M02':{3:['Déduire de la validité cryptographique des badges la validité des droits d’accès de leurs anciens titulaires.','L’authenticité d’un badge et l’autorisation actuelle de son titulaire sont deux contrôles distincts.']},
  'rva2-F-M04':{3:['Recalculer les indicateurs sur les événements aux pièces complètes et tenir ce sous-ensemble pour population exhaustive.','Les événements insuffisamment documentés ne disparaissent pas du périmètre ; les exclure biaise l’analyse et masque un défaut de traçabilité.']},
  'rva3-A-M01':{0:['La capacité de circulation au sol se calcule en additionnant les débits nominaux de piste et de taxiway.','Les éléments successifs d’une chaîne ne s’additionnent pas comme des capacités parallèles ; leurs interfaces et goulots doivent être examinés.']},
  'rva4-A-M05':{0:['Une autonomie de secours calculée par le produit du stock de carburant et de la consommation horaire du groupe.','Une autonomie en heures se calcule par stock utilisable divisé par consommation horaire, avec les conditions de charge pertinentes.']},
  'rva4-B-M06':{3:['Prolonger la durée d’utilité de l’actif du nombre d’années consignées dans l’historique des interventions.','La longueur d’un historique ne détermine pas une prolongation de durée d’utilité ; l’état, le risque et les perspectives doivent être évalués.']},
  'rva4-D-M02':{3:['Comparer le remplacement au prix d’achat historique, tenu pour coût évitable de la solution existante.','Le prix déjà payé est un coût passé ; l’arbitrage porte sur coûts futurs, garanties et continuité des options.']},
  'rva4-E-M02':{3:['Le risque de sous-évaluation est écarté lorsque la plus-value comptable prévue sur la cession est positive.','Un prix supérieur à la valeur comptable peut rester inférieur à la valeur de marché ; plus-value et juste valorisation sont distinctes.']},
  'rva5-A-M08':{2:['L’adhésion au même référentiel OACI dispense de rapprocher les formats de données et les interfaces opérationnelles des acteurs.','Un référentiel commun ne prouve pas l’interopérabilité technique effective des systèmes et procédures.']},
  'rva5-B-M09':{1:['Le scénario reportant les échéances de dette du retard des encaissements clients, ce report étant tenu pour acquis.','Un retard de paiement des clients ne modifie pas les échéances contractuelles de la dette ; le stress doit conserver les obligations réellement exigibles.']},
});
if(['polish-only','final-only'].includes(process.argv[2]))for(const id of Object.keys(changes))delete changes[id];
for(const [id,patch] of Object.entries(polish))changes[id]={...changes[id],...patch};
if(process.argv[2]==='final-only')for(const id of Object.keys(changes))delete changes[id];
if(process.argv[2]!=='polish-only')for(const [id,patch] of Object.entries(finalCorrections))changes[id]={...changes[id],...patch};
for(const [id,patch] of Object.entries(changes)){
  if(process.argv[2]==='numeric-only')continue;
  const q=state.questions[id];if(!q||q.editorialRevision!==3)throw new Error(`Révision finale absente : ${id}`);
  for(const [index,[text,reason]] of Object.entries(patch)){
    if(Number(index)===q.answer)throw new Error(`La clé serait modifiée : ${id}`);
    q.choices[index]=text;q.choiceExplanations[index]=reason;
    q.misconceptions[index]=reason;
  }
  q.localRevision='Affinage local : confusion de preuve, de périmètre, de mesure ou de compétence.';
  delete q.blindReview;delete q.localApproval;
}
if(['polish-only','final-only'].includes(process.argv[2])){
  fs.writeFileSync(path,JSON.stringify(state,null,2)+'\n');
  console.log(`${Object.keys(changes).length} QCM affinés pour supprimer les indices de formulation, à relire.`);
  process.exit(0);
}
const advance=state.questions['t2-F-M02'];
advance.explanation='Dans ce cas hypothétique, la demande d’acompte appelle une vérification du besoin, du contrat, des garanties, de la trésorerie et des délégations applicables. Le caractère fictif du scénario ne constitue pas en lui-même une preuve de fraude.';
// Uniform numerical labels: no embedded explanation or competing denominator
// in a choice, and the same unit on all four options of each calculation.
const units={
  'sncc1-C-M01':'%','sncc1-C-M02':'million',
  'sncc2-C-M01':'cycles/jour','sncc2-C-M02':'tonnes-km','sncc2-C-M08':'par train-km',
  'sncc3-C-M01':'%','sncc3-C-M02':'par tonne-km','sncc3-C-M07':'%',
  'rva1-C-M01':'%','rva1-C-M02':'%','rva1-C-M08':'%',
  'rva2-C-M01':'passagers/heure','rva2-C-M02':'million','rva2-C-M05':'ans',
  'rva3-C-M01':'%','rva3-C-M02':'par passager','rva3-C-M07':'%',
  'rva4-C-M01':'par passager','rva4-C-M02':'million','rva4-C-M05':'million',
  'rva5-C-M01':'million','rva5-C-M02':'million','rva5-C-M05':'heures',
};
for(const [id,unit] of Object.entries(units)){
  const q=state.questions[id];
  q.choices=q.choices.map(text=>{
    const clean=text.replace(/[\u00a0\u202f]/g,' ').replace(/[−–]/g,'-'),match=clean.match(/-?\d[\d ]*(?:[.,]\d+)?/);
    if(!match)throw new Error(`Nombre absent : ${id}`);
    let n=Number(match[0].replaceAll(' ','').replace(',','.'));
    if(/moins|négatif|déficit/i.test(clean)&&n>0)n=-n;
    if(/^\s*millions?\b/i.test(clean.slice(match.index+match[0].length)))n*=1e6;
    if(unit==='million')n/=1e6;
    const label=unit==='million'?(Math.abs(n)>=2?'millions':'million'):unit==='ans'&&Math.abs(n)<2?'an':unit==='heures'&&Math.abs(n)<2?'heure':unit;
    return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:6}).format(n)+' '+label;
  });
  q.localRevision='Présentation numérique harmonisée, valeurs et unités conservées.';
  delete q.blindReview;delete q.localApproval;
}
const arithmeticRefinements={
  'sncc2-C-M01':{3:['11,43 cycles/jour','Ce résultat utilise 80 ÷ 7, comme si un cycle de huit jours occupait sept jours ; le régime stable utilise 80 ÷ 8.']},
  'sncc2-C-M02':{1:['1 500 tonnes-km','300 000 ÷ 200 = 1 500 ; cette division inverse la définition, qui exige tonnes × kilomètres.']},
  'sncc2-C-M08':{3:['3 par train-km','Ce résultat utilise 2 millions de trains-km au dénominateur au lieu des 3 millions indiqués.']},
  'sncc3-C-M02':{2:['0,5 par tonne-km','Ce résultat utilise 12 millions de tonnes-km, issu de 18−6 ; soustraire un coût monétaire d’un volume ne définit pas une assiette.']},
  'rva1-C-M01':{3:['99,72 %','Ce taux correspond à 718 ÷ 720, soit deux heures indisponibles ; le cas donne 714 heures disponibles.']},
  'rva1-C-M02':{3:['14,29 %','Ce taux utilise 3 ÷ (12+9) ; la somme des recettes et des charges ne constitue pas l’assiette d’une marge sur recettes.']},
  'rva1-C-M08':{1:['18,18 %','Ce résultat rapporte 0,4 à la moyenne 2,2 ; la hausse demandée utilise le coût initial de 2 millions.']},
  'rva2-C-M02':{
    1:['1,25 million','Ce résultat soustrait 0,75 million à 2 millions, confondant un taux de 75 % avec un montant.'],
    2:['1,75 million','Ce résultat retranche 0,25 million au lieu de 25 % de 2 millions, soit 0,5 million.']},
  'rva3-C-M01':{
    2:['2 %','Deux millions constituent l’écart absolu ; il faut le rapporter au budget initial de dix millions pour obtenir 20 %.'],
    3:['9,09 %','Ce résultat rapporte l’écart de 2 millions à la somme 12+10, au lieu de le rapporter au budget initial de 10 millions.']},
  'rva4-C-M01':{3:['0,166667 par passager','Ce résultat inverse les termes : 1,2 ÷ 7,2 donne des passagers par unité monétaire, pas un coût par passager.']},
  'rva5-C-M05':{3:['2,5 heures','Ce résultat utilise 8 pannes au dénominateur au lieu des 10 pannes données : 20 ÷ 8 = 2,5.']},
};
for(const [id,patch] of Object.entries(arithmeticRefinements))for(const [index,[text,reason]] of Object.entries(patch)){
  const q=state.questions[id];if(Number(index)===q.answer)throw new Error(`Clé numérique modifiée : ${id}`);
  q.choices[index]=text;q.choiceExplanations[index]=reason;q.misconceptions[index]=reason;
}
fs.writeFileSync(path,JSON.stringify(state,null,2)+'\n');
console.log(`${process.argv[2]==='numeric-only'?0:Object.keys(changes).length} QCM affinés localement et 23 calculs harmonisés, à relire.`);
