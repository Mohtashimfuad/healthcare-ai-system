// src/app/api/doctors/route.ts
// Lists and searches certified doctors with specialties, hospital affiliations, and ratings.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const hospital = searchParams.get('hospital');
    const minRating = Number(searchParams.get('min_rating')) || 0;
    const search = searchParams.get('search');

    let query = supabase
      .from('doctor_profiles')
      .select(`
        profile_id,
        specialty,
        hospital,
        latitude,
        longitude,
        availability_slots,
        rating,
        profile:profiles!doctor_profiles_profile_id_fkey(
          id,
          full_name,
          phone
        )
      `)
      .gte('rating', minRating)
      .order('rating', { ascending: false });

    if (specialty) {
      query = query.ilike('specialty', `%${specialty}%`);
    }

    if (hospital) {
      query = query.ilike('hospital', `%${hospital}%`);
    }

    const { data: doctors, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let results = doctors || [];

    // Filter by name if search term is given
    if (search) {
      const s = search.toLowerCase();
      results = results.filter((doc) => {
        const name = (doc.profile as { full_name?: string } | null)?.full_name?.toLowerCase() || '';
        const spec = doc.specialty?.toLowerCase() || '';
        const hosp = doc.hospital?.toLowerCase() || '';
        return name.includes(s) || spec.includes(s) || hosp.includes(s);
      });
    }

    return NextResponse.json({
      count: results.length,
      doctors: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query doctors';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
