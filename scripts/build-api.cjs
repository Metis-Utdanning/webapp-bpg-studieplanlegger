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

// Extract a named section from markdown
function extractSection(markdown, sectionName) {
  const lines = markdown.split('\n');
  let inSection = false;
  const sectionLines = [];

  for (const line of lines) {
    if (line.startsWith(`## ${sectionName}`)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('## ')) {
      break;
    }
    if (inSection) {
      // Include non-empty lines and preserve structure
      if (line.trim() && !line.startsWith('<!--')) {
        sectionLines.push(line);
      }
    }
  }

  const content = sectionLines.join('\n').trim();
  return content || null;
}

// Extract kjerneelementer as structured array
function extractKjerneelementer(markdown) {
  const lines = markdown.split('\n');
  let inKjerneelementer = false;
  let currentElement = null;
  const elementer = [];

  for (const line of lines) {
    if (line.startsWith('## Kjerneelementer')) {
      inKjerneelementer = true;
      continue;
    }
    if (inKjerneelementer && line.startsWith('## ') && !line.startsWith('### ')) {
      break;
    }
    if (inKjerneelementer && line.startsWith('### ')) {
      if (currentElement) elementer.push(currentElement);
      currentElement = { title: line.replace('### ', '').trim(), content: '' };
    } else if (inKjerneelementer && currentElement && line.trim() && !line.startsWith('<!--')) {
      currentElement.content += (currentElement.content ? '\n' : '') + line.trim();
    }
  }
  if (currentElement) elementer.push(currentElement);

  return elementer.length > 0 ? elementer : null;
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
      shortTitle: frontmatter.shortTitle || null,  // Kort visningsnavn for modal
      fagkode: frontmatter.fagkode,
      lareplan: frontmatter.lareplan,
      type: frontmatter.type || defaultType,
      program: frontmatter.program || null,
      obligatorisk: frontmatter.obligatorisk || false,
      erstatbar: frontmatter.erstatbar || false,
      trinn: frontmatter.trinn || null,
      bilde: frontmatter.bilde || null,  // Bildesti for modal
      vimeo: frontmatter.vimeo || null,  // Vimeo video ID
      beskrivelse: markdown.trim(),
      beskrivelseHTML: marked(markdown.trim()),
      omFaget: extractOmFaget(markdown),
      hvordanArbeiderMan: extractSection(markdown, 'Hvordan arbeider man i faget'),
      fagetsRelevans: extractSection(markdown, 'Fagets relevans'),
      kjerneelementer: extractKjerneelementer(markdown),
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

  // Create id->title lookup
  const idToTitle = new Map();
  allFag.forEach(fag => {
    if (fag.id && fag.title) {
      idToTitle.set(fag.id, fag.title);
    }
  });

  // Build læreplan mapping for related subjects (same læreplan = same subject series)
  const lareplanMapping = new Map();
  allFag.forEach(fag => {
    if (fag.lareplan) {
      if (!lareplanMapping.has(fag.lareplan)) {
        lareplanMapping.set(fag.lareplan, []);
      }
      lareplanMapping.get(fag.lareplan).push(fag.title);
    }
  });

  // Load fagomrader from regler.yml for additional "related" groupings
  const reglerPath = path.join(CURRICULUM_DIR, 'regler.yml');
  const regler = loadYAML(reglerPath);
  const fagomradeMapping = new Map(); // fag-id -> [related titles]

  if (regler && regler.fagomrader) {
    Object.values(regler.fagomrader).forEach(fagomrade => {
      if (fagomrade.fag && Array.isArray(fagomrade.fag)) {
        // For each fag in this fagområde, map to all OTHER fag titles in same område
        fagomrade.fag.forEach(fagId => {
          const relatedTitles = fagomrade.fag
            .filter(otherId => otherId !== fagId)
            .map(otherId => idToTitle.get(otherId))
            .filter(Boolean); // Remove undefined

          if (relatedTitles.length > 0) {
            fagomradeMapping.set(fagId, relatedTitles);
          }
        });
      }
    });
  }

  // Add related subjects (combine læreplan + fagområde sources)
  allFag.forEach(fag => {
    const relatedSet = new Set();

    // Source 1: Same læreplan code (e.g., Fysikk 1 + Fysikk 2)
    if (fag.lareplan && lareplanMapping.has(fag.lareplan)) {
      lareplanMapping.get(fag.lareplan)
        .filter(title => title !== fag.title)
        .forEach(title => relatedSet.add(title));
    }

    // Source 2: Same fagområde from regler.yml (e.g., Sosiologi + Politikk + Sosialkunnskap)
    if (fag.id && fagomradeMapping.has(fag.id)) {
      fagomradeMapping.get(fag.id)
        .forEach(title => relatedSet.add(title));
    }

    fag.related = Array.from(relatedSet);
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

/**
 * Enrich a blokkskjema with curriculum data
 * @param {Object} blokkskjema - Raw blokkskjema data
 * @param {Map} curriculumMap - Map of fag id to curriculum data
 * @param {Map} kategoriMap - Map of fag id to kategori
 * @returns {Object} Enriched blokkskjema
 */
function enrichBlokkskjema(blokkskjema, curriculumMap, kategoriMap) {
  const enriched = JSON.parse(JSON.stringify(blokkskjema));

  if (enriched.blokker) {
    Object.keys(enriched.blokker).forEach(blokkKey => {
      const blokk = enriched.blokker[blokkKey];
      if (blokk.fag && Array.isArray(blokk.fag)) {
        blokk.fag = blokk.fag.map(fag => {
          const curriculum = curriculumMap.get(fag.id);
          return {
            ...fag,
            kategori: kategoriMap.get(fag.id) || null,
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

  return enriched;
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

  // Get blokkskjema versions from school config
  const blokkskjemaConfig = schoolConfig.blokkskjema || {};
  const availableVersions = blokkskjemaConfig.versions || { v2: 'blokkskjema_v2.yml' };
  let activeVersion = blokkskjemaConfig.activeVersion || 'v2';

  // Validate that activeVersion exists in availableVersions
  if (!availableVersions[activeVersion]) {
    const availableKeys = Object.keys(availableVersions);
    console.log(`  ⚠️  activeVersion "${activeVersion}" not found in versions. Available: ${availableKeys.join(', ')}`);

    if (availableKeys.length > 0) {
      activeVersion = availableKeys[0];
      console.log(`  ⚠️  Falling back to: ${activeVersion}`);
    } else {
      console.log(`  ⚠️  No blokkskjema versions defined for ${schoolId}, skipping...`);
      return;
    }
  }

  console.log(`  📋 Active blokkskjema version: ${activeVersion}`);
  console.log(`  📋 Available versions: ${Object.keys(availableVersions).join(', ')}`);

  // Load all available blokkskjema versions
  const blokkskjemaVersions = {};
  let primaryBlokkskjema = null;

  for (const [versionId, filename] of Object.entries(availableVersions)) {
    const blokkskjemaPath = path.join(schoolDataDir, filename);
    const blokkskjema = loadYAML(blokkskjemaPath);

    if (blokkskjema) {
      blokkskjemaVersions[versionId] = blokkskjema;
      console.log(`  ✅ Loaded ${filename} as ${versionId}`);

      // Use active version as primary (for valgregler, timevalidering, etc.)
      if (versionId === activeVersion) {
        primaryBlokkskjema = blokkskjema;
      }
    } else {
      console.log(`  ⚠️  Could not load ${filename} for version ${versionId}`);
    }
  }

  // Ensure we have at least one blokkskjema
  if (Object.keys(blokkskjemaVersions).length === 0) {
    console.log(`  ⚠️  No blokkskjema files found for ${schoolId}, skipping...`);
    return;
  }

  // If active version wasn't found, use first available
  if (!primaryBlokkskjema) {
    const firstVersion = Object.keys(blokkskjemaVersions)[0];
    primaryBlokkskjema = blokkskjemaVersions[firstVersion];
    console.log(`  ⚠️  Active version ${activeVersion} not found, using ${firstVersion}`);
  }

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

  // Enrich all blokkskjema versions with curriculum data
  const enrichedVersions = {};
  for (const [versionId, blokkskjema] of Object.entries(blokkskjemaVersions)) {
    enrichedVersions[versionId] = enrichBlokkskjema(blokkskjema, curriculumMap, kategoriMap);
  }

  // Get enriched primary blokkskjema for valgregler etc.
  const enrichedPrimary = enrichedVersions[activeVersion] || enrichedVersions[Object.keys(enrichedVersions)[0]];

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

    // Blokkskjema structure with enriched fag data (multi-version support)
    blokkskjema: {
      activeVersion: activeVersion,
      versions: Object.fromEntries(
        Object.entries(enrichedVersions).map(([versionId, enriched]) => [
          versionId,
          {
            versjon: enriched.versjon,
            struktur: enriched.struktur,
            blokker: enriched.blokker
          }
        ])
      )
    },

    // Fellesfag per trinn (from timefordeling.yml)
    fellesfag: timefordeling?.fellesfag || {},

    // Felles programfag per program (obligatoriske programfag, from timefordeling.yml)
    fellesProgramfag: timefordeling?.fellesProgramfag || {},

    // VG1 valg (matematikk og fremmedspråk som elever velger)
    vg1Valg: timefordeling?.vg1Valg || {},

    // Validation rules per program (from primary blokkskjema)
    valgregler: primaryBlokkskjema.valgregler || {},

    // Prerequisites and exclusions (from curriculum/regler.yml)
    regler: curriculumRegler || {},

    // Time validation per program and grade (from primary blokkskjema)
    timevalidering: primaryBlokkskjema.timevalidering || {},

    // Curriculum data (with full beskrivelse for fag details modal)
    curriculum: {
      valgfrieProgramfag: valgfrieProgramfag.map(f => ({
        id: f.id,
        title: f.title,
        shortTitle: f.shortTitle,  // Kort visningsnavn for modal
        fagkode: f.fagkode,
        lareplan: f.lareplan,
        bilde: f.bilde,  // Bildesti for modal
        vimeo: f.vimeo,  // Vimeo video ID
        omFaget: f.omFaget,
        beskrivelseHTML: f.beskrivelseHTML,  // Full markdown HTML for modal
        hvordanArbeiderMan: f.hvordanArbeiderMan,  // Ny seksjon for accordion
        fagetsRelevans: f.fagetsRelevans,  // Ny seksjon for accordion
        kjerneelementer: f.kjerneelementer,  // Strukturert array for accordion
        related: f.related
      })),
      obligatoriskeProgramfag: obligatoriskeProgramfag.map(f => ({
        id: f.id,
        title: f.title,
        shortTitle: f.shortTitle,  // Kort visningsnavn for modal
        fagkode: f.fagkode,
        lareplan: f.lareplan,
        program: f.program,
        bilde: f.bilde,  // Bildesti for modal
        vimeo: f.vimeo,  // Vimeo video ID
        omFaget: f.omFaget,
        beskrivelseHTML: f.beskrivelseHTML,  // Full markdown HTML for modal
        kjerneelementer: f.kjerneelementer  // Strukturert array for accordion
      })),
      fellesfag: fellesfag.map(f => ({
        id: f.id,
        title: f.title,
        shortTitle: f.shortTitle,  // Kort visningsnavn for modal
        fagkode: f.fagkode,
        lareplan: f.lareplan,
        trinn: f.trinn,
        bilde: f.bilde,  // Bildesti for modal
        vimeo: f.vimeo,  // Vimeo video ID
        omFaget: f.omFaget,
        beskrivelseHTML: f.beskrivelseHTML,  // Full markdown HTML for modal
        kjerneelementer: f.kjerneelementer  // Strukturert array for accordion
      }))
    }
  };

  // Write studieplanlegger.json
  fs.writeFileSync(
    path.join(schoolOutputDir, 'studieplanlegger.json'),
    JSON.stringify(studieplanleggerOutput, null, 2)
  );

  // Calculate stats
  const versionCount = Object.keys(enrichedVersions).length;
  const blokkCount = Object.keys(enrichedPrimary.blokker || {}).length;
  const fagCount = Object.values(enrichedPrimary.blokker || {})
    .reduce((sum, blokk) => sum + (blokk.fag?.length || 0), 0);
  const programCount = Object.keys(primaryBlokkskjema.valgregler || {}).length;

  console.log(`  ✅ Created studieplanlegger.json`);
  console.log(`     - ${versionCount} blokkskjema-versjon(er): ${Object.keys(enrichedVersions).join(', ')}`);
  console.log(`     - ${blokkCount} blokker (i aktiv versjon ${activeVersion})`);
  console.log(`     - ${fagCount} fag-oppføringer`);
  console.log(`     - ${programCount} programområder med valgregler`);
}

// Main build process
function build() {
  // Ensure output directory exists
  ensureDir(OUTPUT_DIR);

  // Load curriculum data
  const curriculumData = loadCurriculumData();

  // Find all schools with school-config.yml (which defines blokkskjema versions)
  const schools = fs.readdirSync(SCHOOLS_DIR).filter(f => {
    const schoolDir = path.join(SCHOOLS_DIR, f);
    return fs.statSync(schoolDir).isDirectory() &&
           fs.existsSync(path.join(schoolDir, 'school-config.yml'));
  });

  if (schools.length === 0) {
    console.log('\n⚠️  No schools with school-config.yml found!');
    return;
  }

  console.log(`\n📍 Found ${schools.length} school(s) with school-config.yml`);

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
