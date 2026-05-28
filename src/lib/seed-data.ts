import type { SupabaseClient } from '@supabase/supabase-js';

// Ported from the original SQLite seed. 5 projects × 21 packages × 3 vendors per package.
// Idempotent: only seeds if the user has zero projects.

type Stage = 'Spec Received' | 'RFQ Float' | 'Technical Negotiation' | 'Commercial Negotiation' | 'Award';

const STAGES: Stage[] = ['Spec Received', 'RFQ Float', 'Technical Negotiation', 'Commercial Negotiation', 'Award'];

const SEED_PROJECTS = [
  { name: 'Skyline Residency', client: 'DLF Infrastructure', budget: 125_000_000, status: 'Active' as const },
  { name: 'Hyperion Data Center', client: 'Tata Communications', budget: 450_000_000, status: 'Active' as const },
  { name: 'Metro Line Expansion', client: 'DMRC Corporation', budget: 980_000_000, status: 'On Hold' as const },
  { name: 'Oceanic Oil Refinery', client: 'Reliance Industries', budget: 1_500_000_000, status: 'Active' as const },
  { name: 'Aviation Terminal 3', client: 'GMR Group Airport Dev', budget: 750_000_000, status: 'Completed' as const },
];

const PACKAGES_BY_PROJECT: Record<string, { name: string; category: string }[]> = {
  'Skyline Residency': [
    { name: 'Excavation & Piling Works', category: 'Civil' },
    { name: 'Foundation & Substructure Concrete', category: 'Civil' },
    { name: 'Superstructure Frame Structure', category: 'Civil' },
    { name: 'Masonry, Drywall & Plastering', category: 'Civil' },
    { name: 'Basement & Roof Waterproofing', category: 'Civil' },
    { name: 'Passenger Elevators (G+24)', category: 'Mechanical' },
    { name: 'Diesel Generator Sets (500kVA)', category: 'Electrical' },
    { name: 'HT/LT Distribution Transformers', category: 'Electrical' },
    { name: 'Main LT Panels & Busducts', category: 'Electrical' },
    { name: 'LED Lighting Fixtures & Wiring', category: 'Electrical' },
    { name: 'HVAC Chillers & VRF Systems', category: 'Mechanical' },
    { name: 'Basement Ventilation Fans', category: 'Mechanical' },
    { name: 'Plumbing Pipes & Pumps', category: 'Services' },
    { name: 'Sanitaryware & CP Fittings', category: 'Services' },
    { name: 'Fire Hydrant & Sprinkler Piping', category: 'Services' },
    { name: 'Addressable Fire Alarm System', category: 'Instrumentation' },
    { name: 'CCTV & Security Access Control', category: 'Instrumentation' },
    { name: 'Intercom & Optical Fiber Cabling', category: 'Electrical' },
    { name: 'External Paint & Textured Finishes', category: 'Civil' },
    { name: 'Wooden Flooring & Vitrified Tiles', category: 'Civil' },
    { name: 'Gypsum False Ceiling Works', category: 'Civil' },
  ],
  'Hyperion Data Center': [
    { name: 'Server Racks & Smart PDU Cabinets', category: 'Services' },
    { name: 'Hot/Cold Aisle Containment Pods', category: 'Services' },
    { name: 'Computer Room Air Conditioners (CRAC)', category: 'Mechanical' },
    { name: 'Centrifugal Chillers & Cooling Towers', category: 'Mechanical' },
    { name: 'Dry Utility Substation Transformers', category: 'Electrical' },
    { name: 'HT Switchgear & Vacuum Circuit Breakers', category: 'Electrical' },
    { name: 'Modular UPS Systems (1000kVA)', category: 'Electrical' },
    { name: 'Lithium-Ion Backup Battery Banks', category: 'Electrical' },
    { name: 'Sandwich Busduct Distribution System', category: 'Electrical' },
    { name: 'LT Distribution Boards & Sub-panels', category: 'Electrical' },
    { name: 'Fiber Optic Backbone Network', category: 'Instrumentation' },
    { name: 'Cat6A Structured Cabling', category: 'Electrical' },
    { name: 'DCIM Infrastructure Management Software', category: 'Instrumentation' },
    { name: 'Gas-Based Fire Suppression (FM200)', category: 'Services' },
    { name: 'VESDA Early Smoke Detection System', category: 'Instrumentation' },
    { name: 'Security Turnstiles & Biometrics', category: 'Services' },
    { name: 'IP CCTV Surveillance Grid', category: 'Instrumentation' },
    { name: 'Underground Diesel Fuel Tanks', category: 'Mechanical' },
    { name: 'Building Management System (BMS)', category: 'Instrumentation' },
    { name: 'Structural Steel Frame Extension', category: 'Civil' },
    { name: 'Anti-static Raised Floor Access System', category: 'Civil' },
  ],
  'Metro Line Expansion': [
    { name: 'Viaduct Segment Casting & Erection', category: 'Civil' },
    { name: 'Tunnel Boring Machine Spares', category: 'Mechanical' },
    { name: 'Rail Tracks & Flash Butt Welding', category: 'Civil' },
    { name: 'Overhead Catenary System (OCS)', category: 'Electrical' },
    { name: '25kV Traction Substations', category: 'Electrical' },
    { name: 'CBTC Signaling & Train Control', category: 'Instrumentation' },
    { name: 'Platform Screen Doors (PSD)', category: 'Mechanical' },
    { name: 'Optical Fiber Telecom Backbone', category: 'Instrumentation' },
    { name: 'Station PEB Roof Structure', category: 'Civil' },
    { name: 'Heavy Duty Escalators', category: 'Mechanical' },
    { name: 'Station Smart LED Lighting', category: 'Electrical' },
    { name: 'SCADA Infrastructure Controls', category: 'Instrumentation' },
    { name: 'Automatic Fare Collection Smart Gates', category: 'Instrumentation' },
    { name: 'Emergency DG Sets (1500kVA)', category: 'Electrical' },
    { name: 'Under-track LV Cabling & Conduits', category: 'Electrical' },
    { name: 'Track Drainage Piping & Sump Pumps', category: 'Services' },
    { name: 'Ventilation Shaft Fan Systems', category: 'Mechanical' },
    { name: 'Station Air Conditioning Systems', category: 'Mechanical' },
    { name: 'Underground Fire Water Tanks', category: 'Services' },
    { name: 'Public Address & Passenger Info Signs', category: 'Services' },
    { name: 'Station Finishing & Granite Cladding', category: 'Civil' },
  ],
  'Oceanic Oil Refinery': [
    { name: 'Crude Distillation Columns (CDU)', category: 'Mechanical' },
    { name: 'Shell & Tube Heat Exchangers', category: 'Mechanical' },
    { name: 'Crude Storage Tank Plate Fabrications', category: 'Civil' },
    { name: 'High-Pressure Piping & Fittings', category: 'Mechanical' },
    { name: 'Centrifugal Process Pumps & Motors', category: 'Mechanical' },
    { name: 'Reciprocating Gas Compressors', category: 'Mechanical' },
    { name: 'Pneumatic Control Valves (Fisher)', category: 'Instrumentation' },
    { name: 'DCS System Hardware & Control Room', category: 'Instrumentation' },
    { name: 'Field Temperature & Pressure Sensors', category: 'Instrumentation' },
    { name: 'Hazardous Area Safety Showers', category: 'Services' },
    { name: 'Flare Stack Assembly & Ignition', category: 'Mechanical' },
    { name: 'Structural Pipe Racks Fabrication', category: 'Civil' },
    { name: 'Refinery Catalyst Loading Hoppers', category: 'Mechanical' },
    { name: 'Nitrogen Gas Generation Unit', category: 'Mechanical' },
    { name: 'Effluent Water Treatment Plant', category: 'Services' },
    { name: 'LV Explosion-Proof Switchgears', category: 'Electrical' },
    { name: 'High-Discharge Fire Water Pumps', category: 'Services' },
    { name: 'Toxic Gas Detection Sensors', category: 'Instrumentation' },
    { name: 'Refinery Cable Trays & Steel Ladders', category: 'Electrical' },
    { name: 'Thermal Insulation & Metal Cladding', category: 'Mechanical' },
    { name: 'Flame-Proof Terminal Illumination', category: 'Electrical' },
  ],
  'Aviation Terminal 3': [
    { name: 'Baggage Handling System (BHS)', category: 'Mechanical' },
    { name: 'Passenger Boarding Bridges (PBB)', category: 'Mechanical' },
    { name: 'Advanced Visual Docking Guidance', category: 'Instrumentation' },
    { name: 'Airfield Ground Lighting System', category: 'Electrical' },
    { name: 'Terminal Departure Seating & Lounges', category: 'Services' },
    { name: 'Modular Check-in Counters & Scales', category: 'Services' },
    { name: 'Flight Information Display Systems (FIDS)', category: 'Instrumentation' },
    { name: 'Public Address & Voice Alarm Audio', category: 'Services' },
    { name: 'Escalators & Horizontal Travelators', category: 'Mechanical' },
    { name: 'Terminal AHUs & Duct Networks', category: 'Mechanical' },
    { name: 'Double-Curved Roof Membranes', category: 'Civil' },
    { name: 'Structural Steel Roof Trusses', category: 'Civil' },
    { name: 'Seamless Epoxy Terrazzo Flooring', category: 'Civil' },
    { name: 'Acoustic Wall Panels & Cladding', category: 'Civil' },
    { name: 'Main Airport Grid Substations', category: 'Electrical' },
    { name: 'IP CCTV Security & Video Analytics', category: 'Instrumentation' },
    { name: 'Biometric Border Control Smart Gates', category: 'Instrumentation' },
    { name: 'High-Speed Baggage X-Ray Scanners', category: 'Instrumentation' },
    { name: 'Walk-Through Metal Detector Portals', category: 'Instrumentation' },
    { name: 'Airport Perimeter Security Fencing', category: 'Civil' },
    { name: 'Concrete Aircraft Apron Pavement', category: 'Civil' },
  ],
};

const VENDOR_POOLS = [
  ['Siemens Infrastructure', 'L&T Construction', 'ABB Ltd.'],
  ['Sterling & Wilson', 'Honeywell Controls', 'Schneider Electric'],
  ['Godrej & Boyce', 'Blue Star Ltd.', 'Voltas Ltd.'],
  ['Reliance Infra', 'Tata Projects', 'Shapoorji Pallonji'],
  ['UTC Aerospace', 'Thales Group', 'Indra Systems'],
];

export async function seedSampleData(supabase: SupabaseClient, userId: string, orgId: string) {
  // Idempotent — skip if the org already has projects
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  if ((count ?? 0) > 0) return { seeded: false, count };

  const now = new Date().toISOString();

  // We do this in waves so we can collect IDs for downstream batch inserts
  const allPackages: Record<string, unknown>[] = [];
  const allVendors: Record<string, unknown>[] = [];
  const allAudits: Record<string, unknown>[] = [];
  const allRemarks: Record<string, unknown>[] = [];
  const allDocuments: Record<string, unknown>[] = [];

  for (const sp of SEED_PROJECTS) {
    // 1. Create the project (RLS requires owner_id = auth.uid())
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .insert({
        owner_id: userId,
        org_id: orgId,
        name: sp.name,
        client: sp.client,
        budget: sp.budget,
        status: sp.status,
      })
      .select('id')
      .single();
    if (projErr || !project) continue;

    const pkgList = PACKAGES_BY_PROJECT[sp.name] || [];
    const avgBudget = Math.floor((sp.budget * 0.8) / pkgList.length);

    for (let i = 0; i < pkgList.length; i++) {
      const pkgInfo = pkgList[i];
      let stage: Stage = STAGES[i % STAGES.length];
      if (sp.status === 'Completed') stage = 'Award';

      const basePrice = Math.floor(avgBudget * (0.85 + (i % 10) * 0.03));
      const vendorNames = VENDOR_POOLS[i % 5];

      let awardedVendorId: string | null = null;
      let awardValue: number | null = null;
      let awardDate: string | null = null;
      if (stage === 'Award') {
        awardedVendorId = vendorNames[i % vendorNames.length];
        awardValue = Math.floor(basePrice * 0.95);
        awardDate = now;
      }

      const rfqDate = stage !== 'Spec Received' ? now : null;

      // Insert each package and capture its id (one round-trip per package — RLS
      // requires the package to exist before vendors/audits can reference it)
      const { data: pkgRow, error: pkgErr } = await supabase
        .from('packages')
        .insert({
          project_id: project.id,
          name: pkgInfo.name,
          description: `Procurement scope for ${pkgInfo.name.toLowerCase()} for the ${sp.name} project.`,
          category: pkgInfo.category,
          origin: i % 4 === 0 ? 'Import' : 'Domestic',
          currency: 'INR',
          current_stage: stage,
          rfq_float_date: rfqDate,
          award_date: awardDate,
          award_value: awardValue,
          awarded_vendor_id: awardedVendorId,
        })
        .select('id')
        .single();
      if (pkgErr || !pkgRow) continue;

      // Three vendors per package
      for (let vi = 0; vi < vendorNames.length; vi++) {
        allVendors.push({
          package_id: pkgRow.id,
          name: vendorNames[vi],
          quoted_amount: Math.floor(basePrice * (1.05 + vi * 0.05)),
          revised_amount: Math.floor(basePrice * (0.95 + vi * 0.03)),
        });
      }

      // Audit entries
      allAudits.push({
        package_id: pkgRow.id,
        username: 'System',
        field: 'Package Created',
        old_value: '',
        new_value: pkgInfo.name,
      });
      if (stage !== 'Spec Received') {
        allAudits.push({
          package_id: pkgRow.id,
          username: 'System',
          field: 'currentStage',
          old_value: 'Spec Received',
          new_value: stage,
        });
      }
      if (awardedVendorId) {
        allAudits.push({
          package_id: pkgRow.id,
          username: 'System',
          field: 'awardedVendorId',
          old_value: '',
          new_value: awardedVendorId,
        });
      }

      // Remarks (only for some stages)
      if (stage === 'Award') {
        allRemarks.push({
          package_id: pkgRow.id,
          username: 'System',
          text: `Contract awarded to ${awardedVendorId} based on competitive pricing and technical compatibility.`,
        });
        allDocuments.push({
          package_id: pkgRow.id,
          name: 'commercial_bid_comparison_matrix.xlsx',
          size: '420 KB',
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          username: 'System',
        });
      } else if (stage === 'Technical Negotiation' || stage === 'Commercial Negotiation') {
        allRemarks.push({
          package_id: pkgRow.id,
          username: 'System',
          text: 'Price revision sheets received. Warranty discussions ongoing.',
        });
      }

      // Specs document on every other package
      if (i % 2 === 0) {
        const safeName = pkgInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        allDocuments.push({
          package_id: pkgRow.id,
          name: `${safeName}_specifications.pdf`,
          size: '2.4 MB',
          type: 'application/pdf',
          username: 'System',
        });
      }
    }
    allPackages.push({}); // just a counter for stats
  }

  // Bulk-insert the child rows in chunks of 100 to stay below Supabase's row limit
  const chunk = <T>(arr: T[], size: number) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

  for (const batch of chunk(allVendors, 100)) await supabase.from('vendors').insert(batch);
  for (const batch of chunk(allAudits, 100)) await supabase.from('audit_trail').insert(batch);
  for (const batch of chunk(allRemarks, 100)) await supabase.from('remarks').insert(batch);
  for (const batch of chunk(allDocuments, 100)) await supabase.from('documents').insert(batch);

  return {
    seeded: true,
    projects: SEED_PROJECTS.length,
    packages: allPackages.length,
    vendors: allVendors.length,
    audits: allAudits.length,
    remarks: allRemarks.length,
    documents: allDocuments.length,
  };
}
