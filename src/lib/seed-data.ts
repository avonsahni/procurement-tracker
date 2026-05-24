import type { SupabaseClient } from '@supabase/supabase-js';

// Seed a couple of sample projects for the given user.
// Idempotent: only seeds if the user has zero projects.
export async function seedSampleData(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId);
  if ((count ?? 0) > 0) return { seeded: false, count };

  const sampleProjects = [
    {
      name: 'Skyline Residency',
      client: 'DLF Infrastructure',
      budget: 125_000_000,
      packages: [
        { name: 'Excavation & Piling Works', category: 'Civil', stage: 'Award', award: 11_000_000, vendor: 'L&T Construction' },
        { name: 'HVAC Chillers & VRF Systems', category: 'Mechanical', stage: 'Commercial Negotiation', award: null, vendor: null },
        { name: 'Passenger Elevators (G+24)', category: 'Mechanical', stage: 'RFQ Float', award: null, vendor: null },
      ],
    },
    {
      name: 'Hyperion Data Center',
      client: 'Tata Communications',
      budget: 450_000_000,
      packages: [
        { name: 'Modular UPS Systems (1000kVA)', category: 'Electrical', stage: 'Technical Negotiation', award: null, vendor: null },
        { name: 'Centrifugal Chillers & Cooling Towers', category: 'Mechanical', stage: 'Spec Received', award: null, vendor: null },
      ],
    },
    {
      name: 'Metro Line Expansion',
      client: 'DMRC Corporation',
      budget: 980_000_000,
      packages: [
        { name: 'Viaduct Segment Casting & Erection', category: 'Civil', stage: 'Award', award: 78_000_000, vendor: 'Shapoorji Pallonji' },
      ],
    },
  ];

  const vendorNames = ['Siemens Infrastructure', 'L&T Construction', 'Shapoorji Pallonji', 'Schneider Electric', 'Honeywell Controls'];

  for (const sp of sampleProjects) {
    const { data: project } = await supabase
      .from('projects')
      .insert({ owner_id: userId, name: sp.name, client: sp.client, budget: sp.budget, status: 'Active' })
      .select()
      .single();
    if (!project) continue;

    for (const pkg of sp.packages) {
      const { data: pkgRow } = await supabase
        .from('packages')
        .insert({
          project_id: project.id,
          name: pkg.name,
          description: `Procurement scope for ${pkg.name.toLowerCase()}.`,
          category: pkg.category,
          origin: 'Domestic',
          currency: 'INR',
          current_stage: pkg.stage,
          award_value: pkg.award,
          awarded_vendor_id: pkg.vendor,
          award_date: pkg.award ? new Date().toISOString() : null,
          rfq_float_date: pkg.stage !== 'Spec Received' ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (!pkgRow) continue;

      // Add 3 vendors per package
      const vendors = vendorNames.slice(0, 3).map(name => ({
        package_id: pkgRow.id,
        name,
        quoted_amount: Math.round(sp.budget * 0.02 * (0.95 + Math.random() * 0.2)),
        revised_amount: Math.round(sp.budget * 0.02 * (0.88 + Math.random() * 0.15)),
      }));
      await supabase.from('vendors').insert(vendors);

      await supabase.from('audit_trail').insert({
        package_id: pkgRow.id,
        username: 'System',
        field: 'Package Created',
        old_value: '',
        new_value: pkg.name,
      });
    }
  }

  return { seeded: true, count: sampleProjects.length };
}
