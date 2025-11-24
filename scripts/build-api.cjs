#!/usr/bin/env node

/**
 * Build API v2 - Generates JSON API for Studieplanlegger
 *
 * This is a SEPARATE build script that does NOT touch v1 API.
 *
 * Output structure:
 * dist/api/v2/
 * └── schools/
 *     └── {school-id}/
 *         └── studieplanlegger.json   # Everything in one endpoint
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const yaml = require('js-yaml');
const { marked } = require('marked');

// Paths
const DATA_DIR = path.join(__dirname, '../data');
const CURRICULUM_DIR = path.join(DATA_DIR, 'curriculum');
const VALGFRIE_PROGRAMFAG_DIR = path.join(CURRICULUM_DIR, 'markdown/valgfrie-programfag');
const OBLIGATORISKE_PROGRAMFAG_DIR = path.join(CURRICULUM_DIR, 'markdown/obligatoriske-programfag');
const FELLESFAG_DIR = path.join(CURRICULUM_DIR, 'markdown/fellesfag');
const SCHOOLS_DIR = path.join(DATA_DIR, 'schools');
const OUTPUT_DIR = path.join(__dirname, '../dist/api/v2');

// GitHub Pages base URL
const GITHUB_USER = 'fredeids-metis';
const REPO_NAME = 'studieplanlegger';
const BASE_URL = `https://${GITHUB_USER}.github.io/${REPO_NAME}/api/v2`;

console.log('🚀 Building API v2 (Studieplanlegger)...\n');

// Create output directories
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Extract plain text from markdown section
function extractOmFaget(markdown) {
  const lines = markdown.split('\n');
  let inOmFaget = false;
  const omFagetLines = [];

  for (const line of lines) {
    if (line.startsWith('## Om faget')) {
      inOmFaget = true;
      continue;
    }
    if (inOmFaget && line.startsWith('##')) {
      break;
    }
    if (inOmFaget && line.trim()) {
      omFagetLines.push(line.trim());
    }
  }

  return omFagetLines.join(' ');
}

// Read markdown files from a directory
function loadMarkdownFiles(directory, defaultType = 'programfag') {
  if (!fs.existsSync(directory)) {
    console.log(`  ⚠️  Directory ${directory} does not exist, skipping...`);
    return [];
  }

  const files = fs.readdirSync(directory).filter(f => f.endsWith('.md'));

  return files.map(file => {
    const filePath = path.join(directory, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { data: frontmatter, content: markdown } = matter(content);

    return {
      id: frontmatter.id,
      title: frontmatter.title,
      fagkode: frontmatter.fagkode,
      lareplan: frontmatter.lareplan,
      type: frontmatter.type || defaultType,
      program: frontmatter.program || null,
      obligatorisk: frontmatter.obligatorisk || false,
      erstatbar: frontmatter.erstatbar || false,
      trinn: frontmatter.trinn || null,
      beskrivelse: markdown.trim(),
      beskrivelseHTML: marked(markdown.trim()),
      omFaget: extractOmFaget(markdown),
      generert: frontmatter.generert
    };
  });
}

// Load all curriculum data
function loadCurriculumData() {
  console.log('📚 Loading curriculum data...');

  const valgfrieProgramfag = loadMarkdownFiles(VALGFRIE_PROGRAMFAG_DIR, 'programfag');
  console.log(`  ✅ Loaded ${valgfrieProgramfag.length} valgfrie programfag`);

  const obligatoriskeProgramfag = loadMarkdownFiles(OBLIGATORISKE_PROGRAMFAG_DIR, 'obligatorisk-programfag');
  console.log(`  ✅ Loaded ${obligatoriskeProgramfag.length} obligatoriske programfag`);

  const fellesfag = loadMarkdownFiles(FELLESFAG_DIR, 'fellesfag');
  console.log(`  ✅ Loaded ${fellesfag.length} fellesfag`);

  // Combine all for lookups
  const allFag = [...valgfrieProgramfag, ...obligatoriskeProgramfag, ...fellesfag];

  // Build læreplan mapping for related subjects
  const lareplanMapping = new Map();
  allFag.forEach(fag => {
    if (fag.lareplan) {
      if (!lareplanMapping.has(fag.lareplan)) {
        lareplanMapping.set(fag.lareplan, []);
      }
      lareplanMapping.get(fag.lareplan).push(fag.title);
    }
  });

  // Add related subjects
  allFag.forEach(fag => {
    if (fag.lareplan && lareplanMapping.has(fag.lareplan)) {
      const related = lareplanMapping.get(fag.lareplan).filter(title => title !== fag.title);
      fag.related = related.length > 0 ? related : [];
    } else {
      fag.related = [];
    }
  });

  return { valgfrieProgramfag, obligatoriskeProgramfag, fellesfag, allFag };
}

// Load YAML config file
function loadYAML(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

// Build studieplanlegger.json for a school
function buildStudieplanleggerAPI(schoolId, curriculumData) {
  console.log(`\n🏫 Building Studieplanlegger API for: ${schoolId}...`);

  const { valgfrieProgramfag, obligatoriskeProgramfag, fellesfag, allFag } = curriculumData;

  const schoolDataDir = path.join(SCHOOLS_DIR, schoolId);
  const schoolOutputDir = path.join(OUTPUT_DIR, 'schools', schoolId);
  ensureDir(schoolOutputDir);

  // Load school config
  const schoolConfig = loadYAML(path.join(schoolDataDir, 'school-config.yml'));
  if (!schoolConfig) {
    console.log(`  ⚠️  No school-config.yml found for ${schoolId}, skipping...`);
    return;
  }

  // Load blokkskjema v2 directly (not from config version)
  const blokkskjemaV2Path = path.join(schoolDataDir, 'blokkskjema_v2.yml');
  const blokkskjema = loadYAML(blokkskjemaV2Path);

  if (!blokkskjema) {
    console.log(`  ⚠️  No blokkskjema_v2.yml found for ${schoolId}, skipping...`);
    return;
  }
  console.log(`  📋 Loaded blokkskjema_v2.yml`);

  // Load timefordeling (fellesfag and obligatoriske programfag) - separate file
  const timefordelingPath = path.join(schoolDataDir, 'timefordeling.yml');
  const timefordeling = loadYAML(timefordelingPath);
  if (timefordeling) {
    console.log(`  📋 Loaded timefordeling.yml`);
  }

  // Load tilbud for enrichment
  const tilbud = loadYAML(path.join(schoolDataDir, 'tilbud.yml'));

  // Load curriculum validation rules (regler.yml)
  const reglerPath = path.join(CURRICULUM_DIR, 'regler.yml');
  const curriculumRegler = loadYAML(reglerPath);
  if (!curriculumRegler) {
    console.error('❌ CRITICAL: Could not load regler.yml');
    process.exit(1);
  }
  console.log('  ✅ Loaded curriculum regler.yml');

  // Build kategori lookup map
  const kategoriMap = new Map();
  if (tilbud) {
    ['valgfrieProgramfag', 'programfag', 'obligatoriskeProgramfag', 'fellesfag'].forEach(key => {
      if (tilbud[key]) {
        tilbud[key].forEach(fag => {
          if (fag.kategori) {
            kategoriMap.set(fag.fagId, fag.kategori);
          }
        });
      }
    });
  }

  // Create curriculum lookup map
  const curriculumMap = new Map();
  allFag.forEach(fag => {
    curriculumMap.set(fag.id, fag);
  });

  // Enrich blokkskjema with curriculum data
  const enrichedBlokkskjema = JSON.parse(JSON.stringify(blokkskjema));

  if (enrichedBlokkskjema.blokker) {
    Object.keys(enrichedBlokkskjema.blokker).forEach(blokkKey => {
      const blokk = enrichedBlokkskjema.blokker[blokkKey];
      if (blokk.fag && Array.isArray(blokk.fag)) {
        blokk.fag = blokk.fag.map(fag => {
          const curriculum = curriculumMap.get(fag.id);
          return {
            ...fag,
            kategori: kategoriMap.get(fag.id) || null,
            // Add curriculum data if found
            ...(curriculum && {
              title: curriculum.title,
              fagkode: curriculum.fagkode,
              lareplan: curriculum.lareplan,
              omFaget: curriculum.omFaget
            })
          };
        });
      }
    });
  }

  // Build the complete studieplanlegger.json
  const studieplanleggerOutput = {
    metadata: {
      version: 'v2',
      generatedAt: new Date().toISOString(),
      school: schoolId,
      description: 'Complete data for Studieplanlegger widget'
    },

    // School configuration
    school: {
      id: schoolConfig.school.id,
      name: schoolConfig.school.name,
      shortName: schoolConfig.school.shortName,
      programs: schoolConfig.school.programs
    },

    // Blokkskjema structure with enriched fag data
    blokkskjema: {
      versjon: enrichedBlokkskjema.versjon,
      struktur: enrichedBlokkskjema.struktur,
      blokker: enrichedBlokkskjema.blokker
    },

    // Fellesfag per trinn (from timefordeling.yml)
    fellesfag: timefordeling?.fellesfag || {},

    // Felles programfag per program (obligatoriske programfag, from timefordeling.yml)
    fellesProgramfag: timefordeling?.fellesProgramfag || {},

    // VG1 valg (matematikk og fremmedspråk som elever velger)
    vg1Valg: timefordeling?.vg1Valg || {},

    // Validation rules per program
    valgregler: blokkskjema.valgregler || {},

    // Prerequisites and exclusions (from curriculum/regler.yml)
    regler: curriculumRegler || {},

    // Time validation per program and grade
    timevalidering: blokkskjema.timevalidering || {},

    // Curriculum data (with full beskrivelse for fag details modal)
    curriculum: {
      valgfrieProgramfag: valgfrieProgramfag.map(f => ({
        id: f.id,
        title: f.title,
        fagkode: f.fagkode,
        lareplan: f.lareplan,
        omFaget: f.omFaget,
        beskrivelseHTML: f.beskrivelseHTML,  // Full markdown HTML for modal
        related: f.related
      })),
      obligatoriskeProgramfag: obligatoriskeProgramfag.map(f => ({
        id: f.id,
        title: f.title,
        fagkode: f.fagkode,
        lareplan: f.lareplan,
        program: f.program,
        omFaget: f.omFaget,
        beskrivelseHTML: f.beskrivelseHTML  // Full markdown HTML for modal
      })),
      fellesfag: fellesfag.map(f => ({
        id: f.id,
        title: f.title,
        fagkode: f.fagkode,
        lareplan: f.lareplan,
        trinn: f.trinn,
        omFaget: f.omFaget,
        beskrivelseHTML: f.beskrivelseHTML  // Full markdown HTML for modal
      }))
    }
  };

  // Write studieplanlegger.json
  fs.writeFileSync(
    path.join(schoolOutputDir, 'studieplanlegger.json'),
    JSON.stringify(studieplanleggerOutput, null, 2)
  );

  // Calculate stats
  const blokkCount = Object.keys(enrichedBlokkskjema.blokker || {}).length;
  const fagCount = Object.values(enrichedBlokkskjema.blokker || {})
    .reduce((sum, blokk) => sum + (blokk.fag?.length || 0), 0);
  const programCount = Object.keys(blokkskjema.valgregler || {}).length;

  console.log(`  ✅ Created studieplanlegger.json`);
  console.log(`     - ${blokkCount} blokker`);
  console.log(`     - ${fagCount} fag-oppføringer`);
  console.log(`     - ${programCount} programområder med valgregler`);
}

// Main build process
function build() {
  // Ensure output directory exists
  ensureDir(OUTPUT_DIR);

  // Load curriculum data
  const curriculumData = loadCurriculumData();

  // Find all schools with blokkskjema_v2.yml
  const schools = fs.readdirSync(SCHOOLS_DIR).filter(f => {
    const schoolDir = path.join(SCHOOLS_DIR, f);
    return fs.statSync(schoolDir).isDirectory() &&
           fs.existsSync(path.join(schoolDir, 'blokkskjema_v2.yml'));
  });

  if (schools.length === 0) {
    console.log('\n⚠️  No schools with blokkskjema_v2.yml found!');
    return;
  }

  console.log(`\n📍 Found ${schools.length} school(s) with blokkskjema_v2.yml`);

  // Build API for each school
  schools.forEach(schoolId => {
    buildStudieplanleggerAPI(schoolId, curriculumData);
  });

  console.log('\n✨ Build complete!\n');
  console.log(`📍 API v2 available at: ${BASE_URL}/`);
  schools.forEach(schoolId => {
    console.log(`   - ${schoolId}: ${BASE_URL}/schools/${schoolId}/studieplanlegger.json`);
  });
  console.log('\n💡 For local testing, serve from: dist/api/v2/');
}

// Run build
try {
  build();
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
