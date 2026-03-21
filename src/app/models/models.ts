// ── Token response from POST /connect/token ───────────────────────────────
export interface TokenResponse {
  access_token:   string;
  refresh_token?: string;
  id_token?:      string;
  token_type:     string;
  expires_in:     number;
}

// ── Decoded JWT payload (id_token) ────────────────────────────────────────
export interface TokenPayload {
  sub:          string;
  name?:        string;   // may be absent in some token configurations
  email:        string;
  given_name?:  string;
  family_name?: string;
  role:         string | string[];
  exp:          number;
}

// ── Normalised user object used throughout the app ────────────────────────
export interface AuthUser {
  id:           string;
  userName:     string;
  email:        string;
  roles:        string[];
  isSuperAdmin: boolean;
}

// ── DTOs matching RubacCore's Dtos/AuthDtos.cs ────────────────────────────

export interface UserDto {
  id:         number;
  userName:   string;
  email:      string;
  firstName?: string;
  lastName?:  string;
  isActive:   boolean;
  roles:      string[];
}

export interface RoleDto {
  id:           number;
  name:         string;
  description?: string;
  application?: string;
}

export interface RegisterDto {
  userName:   string;
  email:      string;
  password:   string;
  firstName?: string;
  lastName?:  string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?:  string;
  email?:     string;
}

export interface CreateRoleDto {
  name:         string;
  description?: string;
  application?: string;
}

export interface UpdateRoleDto {
  description?: string;
  application?: string;
}

export interface AssignRoleDto {
  userId:   number;
  roleName: string;
}

// ── Permissions ───────────────────────────────────────────────────────────
export interface PermissionDto {
  id:           number;
  name:         string;
  description?: string;
  application:  string;
}

export interface CreatePermissionDto {
  name:         string;
  description?: string;
  application:  string;
}

export interface AssignPermissionDto {
  permissionId: number;
}

// ── Paginated response matching RubacCore's PagedResult<T> ────────────────
export interface PagedResult<T> {
  items:      T[];
  totalCount: number;
  page:       number;
  pageSize:   number;
}

// ── Audit log ─────────────────────────────────────────────────────────────
export interface AuditLogDto {
  id:        number;
  occurredAt: string;
  actor:      string;
  entity:     string;
  action:     string;
  targetId?:  string;
  details?:   string;
}

// ── OAuth2 / OIDC clients ─────────────────────────────────────────────────
export interface ClientDto {
  clientId:     string;
  displayName?: string;
  clientType:   string;   // 'public' | 'confidential'
  permissions:  string[];
  redirectUris: string[];
}

export interface CreateClientDto {
  clientId:     string;
  displayName?: string;
  clientType:   string;
  clientSecret?: string;
  permissions:  string[];
  redirectUris: string[];
}

export interface UpdateClientDto {
  displayName?: string;
  clientSecret?: string;
  permissions:  string[];
  redirectUris: string[];
}

// ── Centre / administrative hierarchy ────────────────────────────────────
export type CodeSubdivisionCentre =
  | 'CAPITAL' | 'PROVINCE' | 'VILLE' | 'TERRITOIRE' | 'DISTRICT'
  | 'SECTEUR_CHEFFERIES' | 'GROUPEMENT' | 'COMMUNE' | 'VILLAGE';

export const SUBDIVISION_LABELS: Record<CodeSubdivisionCentre, string> = {
  CAPITAL:             'Capitale',
  PROVINCE:            'Province',
  VILLE:               'Ville',
  TERRITOIRE:          'Territoire',
  DISTRICT:            'District',
  SECTEUR_CHEFFERIES:  'Secteur / Chefferie',
  GROUPEMENT:          'Groupement',
  COMMUNE:             'Commune',
  VILLAGE:             'Village',
};

export const SUBDIVISION_OPTIONS: CodeSubdivisionCentre[] = [
  'CAPITAL', 'PROVINCE', 'VILLE', 'TERRITOIRE', 'DISTRICT',
  'SECTEUR_CHEFFERIES', 'GROUPEMENT', 'COMMUNE', 'VILLAGE',
];

export interface CentreDto {
  id:                       number;
  code?:                    string;
  name?:                    string;
  isActive:                 boolean;
  subdivisionAdministrative: CodeSubdivisionCentre;
  parentId?:                number;
  parentName?:              string;
}

export interface CentreTreeDto {
  id:                       number;
  code?:                    string;
  name?:                    string;
  isActive:                 boolean;
  subdivisionAdministrative: CodeSubdivisionCentre;
  parentId?:                number;
  children:                 CentreTreeDto[];
}

export interface CreateCentreDto {
  code?:                    string;
  name?:                    string;
  isActive:                 boolean;
  subdivisionAdministrative: CodeSubdivisionCentre;
  parentId?:                number | null;
}

export interface UpdateCentreDto {
  code?:                    string;
  name?:                    string;
  isActive:                 boolean;
  subdivisionAdministrative: CodeSubdivisionCentre;
  parentId?:                number | null;
}

export interface AssignUserCentreDto {
  userId:    number;
  centreId:  number;
  isPrimary: boolean;
}

export interface CentreUserDto {
  userId:    number;
  userName:  string;
  email?:    string;
  isPrimary: boolean;
}

export interface UserCentreAssignmentDto {
  centreId:                  number;
  code?:                     string;
  name?:                     string;
  subdivisionAdministrative: CodeSubdivisionCentre;
  isPrimary:                 boolean;
}

// ── User ↔ Application assignment ───────────────────────────────────────────

export interface UserApplicationDto {
  clientId:    string;
  displayName?: string;
}

// ── Real-time presence ────────────────────────────────────────────────────
export interface UserSession {
  connectionId: string;
  userId:       string;
  userName:     string;
  application:  string;
  connectedAt:  string;  // ISO string
  lastSeenAt:   string;  // ISO string
}

// ── Active Directory write DTOs (maps to RubacCore/Dtos/LdapDtos.cs) ─────

/** Result wrapper returned by every AD write endpoint. */
export interface LdapWriteResult {
  message: string;
}

/** Payload for POST /api/ad/users */
export interface CreateAdUserDto {
  samAccountName:           string;
  displayName:              string;
  givenName?:               string;
  surname?:                 string;
  email?:                   string;
  password?:                string;
  mustChangePasswordOnLogin: boolean;
  description?:             string;
}

/** Payload for PUT /api/ad/users/:sam — all fields optional (null = unchanged) */
export interface UpdateAdUserDto {
  displayName?:             string | null;
  givenName?:               string | null;
  surname?:                 string | null;
  email?:                   string | null;
  description?:             string | null;
  newPassword?:             string | null;
  mustChangePasswordOnLogin?: boolean;
}

/** Payload for POST /api/ad/users/:sam/suspend */
export interface SuspendAdUserDto {
  reason: string;
}

/** Payload for POST/DELETE /api/ad/users/:sam/groups */
export interface GroupMembershipDto {
  groupDn: string;
}

/**
 * Lightweight AD group representation returned by:
 *   - GET /api/ad/users/groups/search?q=  (autocomplete)
 *   - GET /api/ad/users/:sam/groups        (current memberships)
 *
 * `dn` is the authoritative key used when calling add/remove endpoints.
 */
export interface AdGroupDto {
  /** Full Distinguished Name — e.g. "CN=GRP_RH,OU=Groupes,DC=cnss,DC=cd" */
  dn:          string;
  /** CN attribute — human-readable name shown in the dropdown. */
  name:        string;
  description?: string;
  /** Direct member count (populated by search; 0 for memberOf queries). */
  memberCount?: number;
}
