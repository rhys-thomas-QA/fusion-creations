import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const siteOrigin = 'https://fusion-creations.com';
const googleAdsId = 'AW-18013443650';

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function relative(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

function walk(dir, predicate = () => true) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath, predicate));
    if (entry.isFile() && predicate(fullPath)) files.push(fullPath);
  }
  return files;
}

function stripQueryAndHash(value) {
  return value.split('#')[0].split('?')[0];
}

function routeToCandidates(routePath) {
  const cleanPath = stripQueryAndHash(routePath);
  const withoutLeadingSlash = cleanPath.replace(/^\/+/, '');
  const base = path.join(publicDir, withoutLeadingSlash);
  const candidates = [base];

  if (cleanPath === '/' || cleanPath === '') {
    return [path.join(publicDir, 'index.html')];
  }

  if (cleanPath.endsWith('/')) candidates.push(path.join(base, 'index.html'));
  if (!path.extname(base)) {
    candidates.push(`${base}.html`);
    candidates.push(path.join(base, 'index.html'));
  }

  return candidates;
}

function existingRouteFile(routePath) {
  return routeToCandidates(routePath).find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch (error) {
      return false;
    }
  });
}

function localTarget(value, fromFile) {
  if (!value || value.includes('${')) return null;

  let url = value.trim();
  if (!url || url === '#') return null;

  if (url.startsWith(siteOrigin)) {
    const parsed = new URL(url);
    return {
      file: existingRouteFile(parsed.pathname),
      route: `${parsed.pathname}${parsed.hash}`,
      hash: parsed.hash,
      original: value,
    };
  }

  if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(url)) return null;

  if (url.startsWith('#')) {
    return {
      file: fromFile,
      route: url,
      hash: url,
      original: value,
    };
  }

  const [withoutHash, hash = ''] = url.split('#');
  const clean = withoutHash.split('?')[0];
  const absolute = clean.startsWith('/')
    ? path.join(publicDir, clean.replace(/^\/+/, ''))
    : path.resolve(path.dirname(fromFile), clean);

  const candidates = [absolute];
  if (clean.endsWith('/')) candidates.push(path.join(absolute, 'index.html'));
  if (!path.extname(absolute)) {
    candidates.push(`${absolute}.html`);
    candidates.push(path.join(absolute, 'index.html'));
  }

  return {
    file: candidates.find((candidate) => {
      try {
        return fs.statSync(candidate).isFile();
      } catch (error) {
        return false;
      }
    }),
    route: url,
    hash: hash ? `#${hash}` : '',
    original: value,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasAnchor(html, hash) {
  if (!hash) return true;
  const id = decodeURIComponent(hash.slice(1));
  if (!id) return true;
  const escaped = escapeRegExp(id);
  return new RegExp(`\\b(?:id|name)=["']${escaped}["']`, 'i').test(html);
}

function htmlWithoutScriptsAndStyles(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
}

function visibleText(html) {
  return htmlWithoutScriptsAndStyles(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&pound;/gi, 'GBP')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJsonLd(html) {
  const scripts = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) scripts.push(match[1].trim());
  return scripts;
}

function attrValues(html) {
  const values = [];
  const re = /\b(?:href|src|action|poster)=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html))) values.push(match[1]);
  return values;
}

function getHeadValue(html, pattern) {
  return pattern.exec(html)?.[1]?.trim() || '';
}

const htmlFiles = walk(publicDir, (file) => path.extname(file) === '.html');

function testHtmlBasics() {
  for (const file of htmlFiles) {
    const html = read(file);
    const rel = relative(file);

    if (!/^<!doctype html>/i.test(html.trim())) fail(`${rel}: missing <!DOCTYPE html>`);
    if (!/<html\b[^>]*lang=["']en["']/i.test(html)) fail(`${rel}: missing html lang="en"`);
    if (!/<meta\s+name=["']viewport["']/i.test(html)) fail(`${rel}: missing viewport meta tag`);
    if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${rel}: missing title`);
  }
}

function testLocalReferences() {
  for (const file of htmlFiles) {
    const html = read(file);
    const htmlForAttrs = html.replace(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, ' ');

    for (const value of attrValues(htmlForAttrs)) {
      const target = localTarget(value, file);
      if (!target) continue;

      if (!target.file) {
        fail(`${relative(file)}: broken local reference "${value}"`);
        continue;
      }

      if (target.hash && path.extname(target.file) === '.html') {
        const targetHtml = read(target.file);
        if (!hasAnchor(targetHtml, target.hash)) {
          fail(`${relative(file)}: link "${value}" points to a missing anchor`);
        }
      }
    }
  }
}

function testJsonLd() {
  for (const file of htmlFiles) {
    const html = read(file);
    const rel = relative(file);
    const scripts = extractJsonLd(html);

    for (const [index, json] of scripts.entries()) {
      try {
        const parsed = JSON.parse(json);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (!item['@context']) fail(`${rel}: JSON-LD block ${index + 1} is missing @context`);
          if (!item['@type']) fail(`${rel}: JSON-LD block ${index + 1} is missing @type`);
        }
      } catch (error) {
        fail(`${rel}: JSON-LD block ${index + 1} is invalid JSON (${error.message})`);
      }
    }
  }
}

function testSitemapAndRobots() {
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  const robotsPath = path.join(publicDir, 'robots.txt');
  const sitemap = read(sitemapPath);
  const robots = read(robotsPath);

  if (!robots.includes(`Sitemap: ${siteOrigin}/sitemap.xml`)) {
    fail('public/robots.txt: missing production sitemap URL');
  }
  if (!/User-agent:\s*\*/i.test(robots) || !/Allow:\s*\//i.test(robots)) {
    fail('public/robots.txt: missing default allow rule');
  }

  const blocks = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((match) => match[1]);
  const locs = [];
  for (const block of blocks) {
    const loc = getHeadValue(block, /<loc>([^<]+)<\/loc>/i);
    const lastmod = getHeadValue(block, /<lastmod>([^<]+)<\/lastmod>/i);
    const priority = Number(getHeadValue(block, /<priority>([^<]+)<\/priority>/i));
    locs.push(loc);

    if (!loc.startsWith(siteOrigin)) fail(`public/sitemap.xml: loc must use ${siteOrigin}: ${loc}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) fail(`public/sitemap.xml: ${loc} has invalid lastmod`);
    if (!Number.isFinite(priority) || priority < 0 || priority > 1) {
      fail(`public/sitemap.xml: ${loc} has invalid priority`);
    }

    const route = new URL(loc).pathname;
    if (!existingRouteFile(route)) fail(`public/sitemap.xml: ${loc} does not map to a public page`);
  }

  const duplicates = locs.filter((loc, index) => locs.indexOf(loc) !== index);
  for (const loc of new Set(duplicates)) fail(`public/sitemap.xml: duplicate loc ${loc}`);

  const requiredLocs = [
    `${siteOrigin}/`,
    `${siteOrigin}/blog/`,
    `${siteOrigin}/custom-id-card-holders/`,
    `${siteOrigin}/event-badge-holders/`,
    `${siteOrigin}/blog/clearscore-820-custom-badge-holders`,
    `${siteOrigin}/blog/amex-custom-badge-holders`,
    `${siteOrigin}/blog/event-badge-holder-checklist`,
  ];

  for (const loc of requiredLocs) {
    if (!locs.includes(loc)) fail(`public/sitemap.xml: missing ${loc}`);
  }
}

function testSeoForSitemapPages() {
  const sitemap = read(path.join(publicDir, 'sitemap.xml'));
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1]);

  for (const loc of locs) {
    const route = new URL(loc).pathname;
    const file = existingRouteFile(route);
    if (!file) continue;
    const html = read(file);
    const rel = relative(file);

    if (!/<meta\s+name=["']description["']\s+content=["'][^"']{50,}["']/i.test(html)) {
      fail(`${rel}: sitemap page needs a useful meta description`);
    }
    if (!html.includes(`<link rel="canonical" href="${loc}">`)) {
      fail(`${rel}: canonical should match sitemap loc ${loc}`);
    }
    if (!/<meta\s+property=["']og:title["']/i.test(html)) fail(`${rel}: missing og:title`);
    if (!/<meta\s+property=["']og:description["']/i.test(html)) fail(`${rel}: missing og:description`);
  }
}

function testTrackingAndConsent() {
  const trackedPages = htmlFiles.filter((file) => !relative(file).startsWith('public/downloads/'));

  for (const file of trackedPages) {
    const html = read(file);
    const rel = relative(file);

    if (!html.includes(`gtag/js?id=${googleAdsId}`)) fail(`${rel}: missing Google Ads tag ${googleAdsId}`);
    if (!html.includes(`gtag('config', '${googleAdsId}')`)) fail(`${rel}: missing Google Ads config call`);
    if (!html.includes("ad_storage: 'denied'") || !html.includes("analytics_storage: 'denied'")) {
      fail(`${rel}: missing denied consent defaults`);
    }
  }

  const thanks = read(path.join(publicDir, 'thanks.html'));
  if (!thanks.includes("gtag('event', 'generate_lead'")) {
    fail('public/thanks.html: missing generate_lead conversion event');
  }
  if (!thanks.includes("currency: 'GBP'") || !thanks.includes('value: 1')) {
    fail('public/thanks.html: conversion event should include GBP value');
  }

  const custom = read(path.join(publicDir, 'custom-id-card-holders', 'index.html'));
  const pageInsights = read(path.join(publicDir, 'js', 'page-insights.js'));
  if (!custom.includes('js/page-insights.js')) {
    fail('public/custom-id-card-holders/index.html: missing page insight tracking script');
  }
  for (const marker of [
    'data-track-view="pricing"',
    'data-track-view="proof"',
    'data-track-view="quote_form"',
    'data-track-cta="quote"',
  ]) {
    if (!custom.includes(marker)) fail(`public/custom-id-card-holders/index.html: missing ${marker}`);
  }
  for (const eventName of [
    'fc_quote_cta_clicked',
    'fc_quote_form_started',
    'fc_pricing_viewed',
    'fc_proof_viewed',
    'fc_quote_form_viewed',
  ]) {
    if (!pageInsights.includes(eventName)) fail(`public/js/page-insights.js: missing ${eventName}`);
  }
}

function testForms() {
  const formPages = htmlFiles.filter((file) => /<form\b[^>]*name=["'](?:contact|production-details)["']/i.test(read(file)));
  const requiredFields = [
    'page_url',
    'referrer',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
  ];

  for (const file of formPages) {
    const html = read(file);
    const rel = relative(file);

    if (!/data-netlify=["']true["']/i.test(html)) fail(`${rel}: lead form must keep data-netlify="true"`);
    if (!/netlify-honeypot=["']bot-field["']/i.test(html)) fail(`${rel}: lead form must keep the Netlify honeypot`);
    if (!html.includes('js/lead-form.js')) fail(`${rel}: lead form page must load js/lead-form.js`);

    for (const field of requiredFields) {
      if (!new RegExp(`name=["']${field}["']`, 'i').test(html)) {
        fail(`${rel}: missing hidden attribution field ${field}`);
      }
    }
  }

  const leadForm = read(path.join(publicDir, 'js', 'lead-form.js'));
  for (const field of requiredFields.filter((field) => field.startsWith('utm_') || field === 'gclid')) {
    if (!leadForm.includes(`'${field}'`)) fail(`public/js/lead-form.js: missing ${field} attribution handling`);
  }
  if (!leadForm.includes('fcEnhancedConversionEmail') || !leadForm.includes("gtag('set', 'user_data'")) {
    fail('public/js/lead-form.js: missing enhanced conversion hand-off');
  }
}

function testCriticalContentAndCtas() {
  const homepage = read(path.join(publicDir, 'index.html'));
  const custom = read(path.join(publicDir, 'custom-id-card-holders', 'index.html'));
  const eventBadges = read(path.join(publicDir, 'event-badge-holders', 'index.html'));
  const checklist = read(path.join(publicDir, 'blog', 'event-badge-holder-checklist.html'));
  const llms = read(path.join(publicDir, 'llms.txt'));

  const checks = [
    [custom, 'custom ID card holders page', 'Ask about a paid sample holder'],
    [custom, 'custom ID card holders page', '/downloads/custom-badge-holder-spec-sheet.pdf'],
    [custom, 'custom ID card holders page', '/blog/event-badge-holder-checklist'],
    [custom, 'custom ID card holders page', 'Logo-only holders'],
    [custom, 'custom ID card holders page', '&pound;5.50'],
    [custom, 'custom ID card holders page', '&pound;6'],
    [eventBadges, 'event badge holders page', 'Ask about a paid sample holder'],
    [eventBadges, 'event badge holders page', '/downloads/custom-badge-holder-spec-sheet.pdf'],
    [eventBadges, 'event badge holders page', '/blog/event-badge-holder-checklist'],
    [checklist, 'event checklist blog page', 'Quick version to send with an enquiry'],
    [checklist, 'event checklist blog page', '/custom-id-card-holders/#quote'],
    [homepage, 'homepage', '£5.50 per unit'],
    [llms, 'llms.txt', 'https://fusion-creations.com/blog/event-badge-holder-checklist'],
  ];

  for (const [content, label, expected] of checks) {
    if (!content.includes(expected)) fail(`${label}: missing "${expected}"`);
  }
}

function testCopyGuardrails() {
  const filesToScan = [
    ...htmlFiles,
    ...walk(path.join(rootDir, 'docs'), (file) => path.extname(file) === '.md'),
  ];
  const americanisms = /\b(customize|customized|customizing|personalized|personalization|color|colors)\b/i;

  for (const file of filesToScan) {
    const rel = relative(file);
    const content = read(file);
    const text = path.extname(file) === '.html' ? visibleText(content) : content;

    if (/[\u2013\u2014]/.test(content)) fail(`${rel}: contains an en dash or em dash`);
    if (content.includes('Â')) fail(`${rel}: contains mojibake character Â`);
    if (/\bdo not\b/i.test(text)) fail(`${rel}: use "don't" or rewrite instead of "do not"`);

    const match = text.match(americanisms);
    if (match) fail(`${rel}: visible copy uses "${match[0]}" instead of British English`);
  }
}

const tests = [
  ['HTML basics', testHtmlBasics],
  ['Local links and assets', testLocalReferences],
  ['JSON-LD', testJsonLd],
  ['Sitemap and robots', testSitemapAndRobots],
  ['SEO tags for indexed pages', testSeoForSitemapPages],
  ['Tracking and consent', testTrackingAndConsent],
  ['Lead forms', testForms],
  ['Critical content and CTAs', testCriticalContentAndCtas],
  ['Copy guardrails', testCopyGuardrails],
];

for (const [name, test] of tests) {
  const before = failures.length;
  test();
  const added = failures.length - before;
  console.log(`${added ? 'FAIL' : 'PASS'} ${name}${added ? ` (${added})` : ''}`);
}

if (failures.length) {
  console.error('\nSite tests failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\nAll site tests passed across ${htmlFiles.length} HTML files.`);
