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

export interface AssignRoleDto {
  userId:   number;
  roleName: string;
}
