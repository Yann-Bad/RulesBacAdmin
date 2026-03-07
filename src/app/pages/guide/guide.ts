import { Component, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

export type SectionId =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'audit'
  | 'clients'
  | 'profile';

export interface GuideSection {
  id:       SectionId;
  icon:     string;
  title:    string;
  summary:  string;
  steps:    { heading: string; body: string }[];
  tips:     string[];
}

const SECTIONS: GuideSection[] = [
  {
    id:      'dashboard',
    icon:    '📊',
    title:   'Tableau de bord',
    summary: 'Vue d\'ensemble des statistiques clés du système : utilisateurs, rôles et activité récente.',
    steps: [
      {
        heading: 'Lire les indicateurs',
        body: 'Quatre cartes affichent le nombre total d\'utilisateurs, d\'utilisateurs actifs, de rôles et d\'entrées d\'audit. Les chiffres se mettent à jour à chaque visite.',
      },
      {
        heading: 'Naviguer vers un module',
        body: 'La barre de navigation est organisée en trois groupes : « Tableau de bord » seul, puis le groupe Identité & accès (Utilisateurs, Rôles, Permissions, Clients OAuth2), et enfin le groupe Opérations (Centres, Présence, Audit). Cliquez sur le lien souhaité pour y accéder directement.',
      },
    ],
    tips: [
      'Vérifiez régulièrement le nombre d\'utilisateurs actifs pour détecter des créations de comptes inhabituelles.',
      'Un delta élevé entre "utilisateurs totaux" et "utilisateurs actifs" peut indiquer des comptes non validés.',
    ],
  },
  {
    id:      'users',
    icon:    '👥',
    title:   'Gestion des utilisateurs',
    summary: 'Créez, modifiez, activez/désactivez et supprimez des comptes utilisateurs. Assignez ou retirez des rôles.',
    steps: [
      {
        heading: 'Rechercher un utilisateur',
        body: 'Saisissez un nom ou une adresse e-mail dans la barre de recherche. La liste se filtre automatiquement après 300 ms de saisie (debounce).',
      },
      {
        heading: 'Trier la liste',
        body: 'Cliquez sur les en-têtes de colonnes "Utilisateur" ou "Email" pour trier. Un second clic inverse l\'ordre (ASC ↔ DESC).',
      },
      {
        heading: 'Créer un utilisateur',
        body: 'Cliquez sur "+ Nouvel utilisateur". Renseignez le nom d\'utilisateur, l\'e-mail, un mot de passe (≥ 8 caractères, 1 chiffre, 1 majuscule) et les champs optionnels prénom/nom.',
      },
      {
        heading: 'Modifier un profil',
        body: 'Cliquez sur l\'icône ✏ pour éditer le prénom, le nom et l\'e-mail d\'un utilisateur.',
      },
      {
        heading: 'Gérer les rôles',
        body: 'Cliquez sur l\'icône 🛡 pour ouvrir le panneau d\'assignation de rôles. Sélectionnez un rôle dans la liste déroulante et cliquez "Assigner". Cliquez "Retirer" à côté d\'un rôle existant pour le supprimer.',
      },
      {
        heading: 'Réinitialiser un mot de passe',
        body: 'Cliquez sur l\'icône 🔑 pour définir un nouveau mot de passe à la place de l\'utilisateur, sans connaître l\'ancien.',
      },
      {
        heading: 'Activer / Désactiver',
        body: 'Le bouton dans la colonne "Statut" bascule le compte entre actif et inactif. Un compte inactif ne peut plus se connecter.',
      },
      {
        heading: 'Supprimer définitivement',
        body: 'Cliquez sur l\'icône 🗑. Une fenêtre de confirmation s\'affiche — la suppression est irréversible et efface toutes les données associées.',
      },
      {
        heading: 'Voir le détail d\'un utilisateur',
        body: 'Cliquez sur le nom d\'utilisateur (lien souligné) pour accéder à la page de détail, qui regroupe toutes les actions en un seul endroit.',
      },
    ],
    tips: [
      'Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.',
      'Préférez la désactivation à la suppression pour conserver l\'historique d\'audit.',
      'Vous pouvez changer la taille de page (5 / 10 / 25 / 50) via le sélecteur en bas de liste.',
    ],
  },
  {
    id:      'roles',
    icon:    '🛡',
    title:   'Gestion des rôles',
    summary: 'Définissez les rôles disponibles dans le système, leur description, leur application cible et les permissions qu\'ils accordent.',
    steps: [
      {
        heading: 'Créer un rôle',
        body: 'Cliquez sur "+ Nouveau rôle". Renseignez le nom unique (ex : "Manager"), l\'application cible (obligatoire — ex : "Dashboard") et une description optionnelle. L\'application détermine dans quels tokens le rôle apparaît.',
      },
      {
        heading: 'Modifier un rôle',
        body: 'Cliquez sur l\'icône ✏. Seules la description et l\'application sont modifiables ; le nom est immuable car il sert de clé dans le système.',
      },
      {
        heading: 'Gérer les permissions d\'un rôle',
        body: 'Cliquez sur l\'icône 🔑 pour ouvrir le panneau de permissions du rôle. Les permissions déjà assignées apparaissent sous forme de puces — cliquez ✕ pour en retirer une. Sélectionnez une permission disponible dans la liste déroulante et cliquez « Assigner » pour l\'ajouter. Les permissions disponibles sont filtrées selon l\'application du rôle.',
      },
      {
        heading: 'Supprimer un rôle',
        body: 'Cliquez sur « Supprimer » puis confirmez. Attention : supprimer un rôle retire automatiquement toutes ses permissions et effacera le rôle de tous les utilisateurs qui le possèdent.',
      },
      {
        heading: 'Rechercher et trier',
        body: 'Utilisez la barre de recherche et le menu déroulant de tri. Le tri peut se faire sur le nom ou l\'application.',
      },
    ],
    tips: [
      'L\'application est obligatoire à la création : elle isole le rôle dans le bon contexte (ex : un rôle "Admin" de Dashboard n\'interfère pas avec RubacCore).',
      'Le rôle "SuperAdmin" est réservé à RubacCore : il donne accès à toute l\'interface d\'administration.',
      'Les permissions définissent réellement ce que le rôle peut faire — un rôle sans permission n\'autorise aucune action dans l\'API.',
      'Ne supprimez pas un rôle sans vous assurer qu\'aucun utilisateur actif n\'en dépend.',
    ],
  },
  {
    id:      'permissions',
    icon:    '🔑',
    title:   'Gestion des permissions',
    summary: 'Créez et supprimez les permissions fins que les rôles peuvent accorder. Les permissions sont émises comme claims dans les tokens JWT.',
    steps: [
      {
        heading: 'Comprendre le modèle RBAC à trois niveaux',
        body: 'Le système utilise trois couches : Scopes OAuth2 (quelle audience reçoit le token), Rôles (groupe de l\'utilisateur) et Permissions (droit fin de type « resource:action »). Un utilisateur obtient les permissions de tous ses rôles. Ces permissions apparaissent comme claims « permission » dans le token d\'accès et sont vérifiées côté API.',
      },
      {
        heading: 'Filtrer par application',
        body: 'En haut de la liste, les onglets « Toutes », « RubacCore » et « Dashboard » filtrent les permissions par application. Cliquez sur un onglet pour restreindre l\'affichage.',
      },
      {
        heading: 'Créer une permission',
        body: 'Cliquez sur « + Nouvelle permission ». Renseignez le nom (convention obligatoire : application:action, ex : « dashboard:export »), l\'application cible (obligatoire) et une description optionnelle.',
      },
      {
        heading: 'Assigner une permission à un rôle',
        body: 'La création d\'une permission ne l\'assigne pas automatiquement. Allez dans la page Rôles, ouvrez le panneau 🔑 du rôle souhaité, puis sélectionnez la nouvelle permission dans la liste déroulante et cliquez « Assigner ».',
      },
      {
        heading: 'Supprimer une permission',
        body: 'Cliquez sur « Supprimer » dans la ligne de la permission et confirmez. La permission est immédiatement retirée de tous les rôles auxquels elle était assignée et n\'apparaîtra plus dans les futurs tokens.',
      },
    ],
    tips: [
      'Convention de nommage : « application:action » en minuscules, avec tiret pour les actions composées (ex : rubac:manage-users).',
      'Permissions par défaut : dashboard:read · dashboard:write · dashboard:admin · rubac:manage-users · rubac:manage-roles.',
      'Les tokens en cours de validité ne sont pas révoqués immédiatement — la permission disparaît au prochain login ou refresh.',
      'Une même permission peut être assignée à plusieurs rôles (ex : dashboard:read sur Admin, Manager et Consultant).',
    ],
  },
  {
    id:      'audit',
    icon:    '📋',
    title:   'Journal d\'audit',
    summary: 'Consultez l\'historique complet des actions effectuées dans le système : créations, modifications, suppressions, changements de mots de passe et assignations de rôles.',
    steps: [
      {
        heading: 'Filtrer par entité',
        body: 'Sélectionnez "Utilisateur" ou "Rôle" dans le menu "Toutes les entités" pour n\'afficher que les événements d\'une catégorie.',
      },
      {
        heading: 'Filtrer par action',
        body: 'Le menu "Toutes les actions" permet de cibler une action précise : user.created, password.reset, role.assigned, etc.',
      },
      {
        heading: 'Recherche textuelle',
        body: 'La barre de recherche filtre sur l\'acteur (qui a effectué l\'action) et la cible (sur qui / quoi). La recherche s\'active automatiquement après 300 ms.',
      },
      {
        heading: 'Naviguer dans les pages',
        body: 'Utilisez les boutons de pagination en bas de tableau. Par défaut, 25 entrées sont affichées par page.',
      },
    ],
    tips: [
      'Les actions "system" indiquent une opération déclenchée au démarrage du serveur (seed initial, migrations).',
      'Le journal est en lecture seule — aucune entrée ne peut être modifiée ni supprimée.',
      'Combinez les filtres "entité + action" pour un audit ciblé, par exemple tous les password.reset d\'un utilisateur.',
    ],
  },
  {
    id:      'clients',
    icon:    '⬡',
    title:   'Clients OAuth2 / OIDC',
    summary: 'Enregistrez et gérez les applications clientes qui s\'authentifient via le serveur OpenIddict (RubacCore).',
    steps: [
      {
        heading: 'Créer un client',
        body:
          'Cliquez sur "+ Nouveau client". Renseignez :\n' +
          '• Client ID — identifiant unique de l\'application (ex : "dashboard-spa").\n' +
          '• Nom affiché — libellé lisible (optionnel).\n' +
          '• Type — "public" pour les SPA/mobiles (pas de secret), "confidential" pour les serveurs back-end.\n' +
          '• Client Secret — obligatoire pour les clients confidentiels.\n' +
          '• Redirect URIs — URL(s) de callback autorisées après authentification.',
      },
      {
        heading: 'Modifier un client',
        body: 'Cliquez sur ✏. Vous pouvez changer le nom affiché, définir un nouveau secret (laissez vide pour conserver l\'existant) et mettre à jour les redirect URIs.',
      },
      {
        heading: 'Gérer les permissions',
        body: 'Cliquez sur "N permission(s)" dans la colonne "Permissions" pour ouvrir l\'éditeur. Chaque ligne correspond à une permission OpenIddict. Utilisez le bouton "Appliquer les permissions de base" pour réinjecter le jeu standard.',
      },
      {
        heading: 'Supprimer un client',
        body: 'Cliquez sur 🗑 et confirmez. Le client ne pourra plus obtenir de tokens. Aucun utilisateur n\'est affecté.',
      },
    ],
    tips: [
      'Permissions de base pour un SPA avec ROPC : ept:token · gt:password · gt:refresh_token · scp:openid · scp:profile · scp:email · scp:roles · scp:offline_access.',
      'Pour un accès à une API spécifique, ajoutez la permission scp:<nom_du_scope> (ex : scp:dashboard, scp:rubac).',
      'Un client "public" ne doit jamais avoir de client_secret exposé dans le code source front-end.',
      'Les redirect URIs sont validées à la lettre — vérifiez la casse et la présence ou absence du slash final.',
    ],
  },
  {
    id:      'profile',
    icon:    '👤',
    title:   'Mon profil',
    summary: 'Consultez et modifiez vos informations personnelles et changez votre mot de passe.',
    steps: [
      {
        heading: 'Modifier le profil',
        body: 'Dans la section "Informations", mettez à jour votre prénom, nom ou adresse e-mail puis cliquez sur "Enregistrer".',
      },
      {
        heading: 'Changer le mot de passe',
        body: 'Dans la section "Mot de passe", saisissez votre mot de passe actuel puis le nouveau (confirmé). Le nouveau mot de passe doit respecter les mêmes règles : ≥ 8 caractères, 1 majuscule, 1 chiffre.',
      },
    ],
    tips: [
      'Après un changement d\'e-mail, reconnectez-vous avec la nouvelle adresse.',
      'En cas d\'oubli de mot de passe, demandez à un autre SuperAdmin de le réinitialiser depuis la page Utilisateurs.',
    ],
  },
];

@Component({
  selector: 'app-guide',
  standalone: true,
  templateUrl: './guide.html',
  styleUrl: './guide.css',
})
export class GuideComponent {
  private readonly route = inject(ActivatedRoute);

  readonly sections = SECTIONS;
  openId = signal<SectionId | null>(null);

  constructor() {
    // Support /guide#dashboard style anchor links
    const fragment = this.route.snapshot.fragment as SectionId | null;
    if (fragment && SECTIONS.some(s => s.id === fragment)) {
      this.openId.set(fragment);
    }
  }

  toggle(id: SectionId): void {
    this.openId.set(this.openId() === id ? null : id);
  }

  isOpen(id: SectionId): boolean {
    return this.openId() === id;
  }
}
