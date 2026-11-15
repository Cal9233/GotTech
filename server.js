if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const path = require('path');
const app = express();
const { getJobs, searchJobs, MAX_RESULTS } = require('./remotive');

// JUST FOR DEMO PURPOSES, PUT YOUR ACTUAL API CODE HERE
app.get('/api/demo', (request, response) => {
  response.json({
    message: 'Hello from server.js'
  });
});
// END DEMO

// GETS ALL JOBS (source: Remotive, software-dev category)
app.get('/api/jobs', async (request, response) => {
  try {
    const jobs = await getJobs();
    response.json(jobs.slice(0, MAX_RESULTS));
  } catch (error) {
    console.log(error.message);
    response.status(502).json({ error: 'Job listings are unavailable right now.' });
  }
});

// GETS JOB BY SEARCH TERM
app.get('/api/jobs/:search', async (request, response) => {
  const { search } = request.params;

  try {
    const jobs = await getJobs();
    response.json(searchJobs(jobs, search).slice(0, MAX_RESULTS));
  } catch (error) {
    console.log(error.message);
    response.status(502).json({ error: 'Job listings are unavailable right now.' });
  }
});

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'client/build')));
  // Handle React routing, return all requests to React app
  app.get('*', (request, response) => {
    response.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`API listening on port ${port}...`);
});
