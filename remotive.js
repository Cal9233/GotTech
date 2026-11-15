// Fetches software-development jobs from the Remotive API and keeps a copy in
// memory, so we stay well under Remotive's request limits (about 4 fetches a
// day; more than 2 per minute gets blocked). Terms: link each job back to its
// Remotive URL and credit Remotive as the source.
const axios = require('axios');

const REMOTIVE_URL = 'https://remotive.com/api/remote-jobs';
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_RESULTS = 50;

let cache = { jobs: null, fetchedAt: 0 };
let inFlight = null;

// Same field names the React client already reads from each job.
function mapJob(job) {
  return {
    id: job.id,
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location,
    type: job.job_type,
    description: job.description || '',
    url: job.url, // Remotive job page
    created_at: job.publication_date,
    source: 'Remotive'
  };
}

async function loadJobs() {
  const { data } = await axios.get(REMOTIVE_URL, {
    params: { category: 'software-dev' },
    timeout: 10000
  });
  return (data.jobs || []).map(mapJob);
}

async function getJobs() {
  const fresh = cache.jobs && Date.now() - cache.fetchedAt < CACHE_MS;
  if (fresh) return cache.jobs;

  // If several requests arrive at once, share one upstream call.
  if (!inFlight) {
    inFlight = loadJobs()
      .then((jobs) => {
        cache = { jobs, fetchedAt: Date.now() };
        return jobs;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  try {
    return await inFlight;
  } catch (error) {
    // Remotive unreachable: serve the last good copy if we have one.
    if (cache.jobs) return cache.jobs;
    throw error;
  }
}

// Every word in the search must appear in the title, company or description.
function searchJobs(jobs, term) {
  const words = String(term || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return jobs;
  return jobs.filter((job) => {
    const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

module.exports = { getJobs, searchJobs, mapJob, MAX_RESULTS };
