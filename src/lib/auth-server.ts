// src/lib/auth-server.ts
// Server-side Role-Based Access Control (RBAC) and authentication enforcement.
// Use ONLY in Server Components, Route Handlers (API routes), and Server Actions.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UserRole, Profile } from '@/types';

export interface AuthContext {
  userId: string;
  email: string;
  role: UserRole;
  profile: Profile;
}

/**
 * Retrieves the currently authenticated user and their profile.
 * Returns null if unauthenticated.
 */
export async function getAuthUser(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Fallback to role from user metadata if profile row is not yet indexed
      const metaRole = (user.user_metadata?.role as UserRole) || 'patient';
      return {
        userId: user.id,
        email: user.email || '',
        role: metaRole,
        profile: {
          id: user.id,
          role: metaRole,
          full_name: (user.user_metadata?.full_name as string) || 'User',
          phone: (user.user_metadata?.phone as string) || null,
          created_at: user.created_at || new Date().toISOString(),
        },
      };
    }

    return {
      userId: user.id,
      email: user.email || '',
      role: (profile as Profile).role,
      profile: profile as Profile,
    };
  } catch {
    return null;
  }
}

/**
 * Enforces authentication on API routes.
 * Returns AuthContext or a 401 Unauthorized NextResponse.
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized: Please log in to access this resource.' },
      { status: 401 }
    );
  }
  return auth;
}

/**
 * Enforces specific role(s) on API routes.
 * Returns AuthContext or a 401/403 NextResponse.
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[]
): Promise<AuthContext | NextResponse> {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(authResult.role)) {
    return NextResponse.json(
      {
        error: `Forbidden: This action requires role '${roles.join(' or ')}'. You are '${authResult.role}'.`,
      },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * Checks if a doctor has treated or has an appointment with a given patient.
 */
export async function isDoctorTreatingPatient(
  doctorId: string,
  patientId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('patient_id', patientId)
      .limit(1);

    return !!(data && data.length > 0);
  } catch {
    return false;
  }
}
