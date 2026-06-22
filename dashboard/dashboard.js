/**
 * AetherEngine Dashboard Engine
 * Implements high-end UX animations, mock data simulators, live API integrations,
 * and dynamic styling states under strict anti-slop guidelines.
 */

(function () {
  'use strict';

  // --- STATE SYSTEM & CONFIGURATION ---
  const state = {
    theme: 'theme-glass-bento',
    viewState: 'nominal', // nominal, loading, empty, error
    dataSource: 'simulated', // simulated, live
    apiBase: 'http://localhost:3002',
    jobs: [], // Unified job list
    filteredHistory: [],
    currentPage: 1,
    rowsPerPage: 5,
    simIntervalId: null,
    apiPollIntervalId: null
  };

  // --- MOCK SIMULATOR TEMPLATE DATA ---
  const mockTaskNames = [
    'sync-user-telemetry',
    'prune-expired-tokens',
    'compress-s3-logs',
    'generate-invoice-pdf',
    'reindex-elasticsearch',
    'dispatch-marketing-sms',
    'flush-redis-cache',
    'backup-firestore-db'
  ];

  const initialSimulatedJobs = [
    { id: 'job_4x9f2a', name: 'sync-user-telemetry', status: 'completed', run_at: getIsoStringOffset(-60), created_at: getIsoStringOffset(-120), executed_at: getIsoStringOffset(-58), duration: 142, payload: { batch_size: 250, dry_run: false } },
    { id: 'job_1z8v3c', name: 'prune-expired-tokens', status: 'completed', run_at: getIsoStringOffset(-180), created_at: getIsoStringOffset(-240), executed_at: getIsoStringOffset(-178), duration: 94, payload: { force: true } },
    { id: 'job_9k2m5l', name: 'compress-s3-logs', status: 'failed', run_at: getIsoStringOffset(-300), created_at: getIsoStringOffset(-360), executed_at: getIsoStringOffset(-298), duration: 2540, error: 'Connection timeout on bucket s3://archive-logs-2026', payload: { region: 'us-east-1' } },
    { id: 'job_7t4r6q', name: 'generate-invoice-pdf', status: 'completed', run_at: getIsoStringOffset(-420), created_at: getIsoStringOffset(-480), executed_at: getIsoStringOffset(-419), duration: 320, payload: { user_id: 'usr_9981' } },
    { id: 'job_3p5s7t', name: 'reindex-elasticsearch', status: 'completed', run_at: getIsoStringOffset(-600), created_at: getIsoStringOffset(-660), executed_at: getIsoStringOffset(-599), duration: 1845, payload: { index: 'logs_v2' } },
    { id: 'job_5q2w9e', name: 'dispatch-marketing-sms', status: 'failed', run_at: getIsoStringOffset(-720), created_at: getIsoStringOffset(-780), executed_at: getIsoStringOffset(-718), duration: 450, error: 'SMS Gateway response 401 Unauthorized', payload: { campaign_id: 'cmp_spring_sale' } }
  ];

  // --- INITIALIZATION ---
  document.addEventListener('DOMContentLoaded', () => {
    initClock();
    setupEventListeners();
    applyTheme(state.theme);
    setViewState(state.viewState);
    loadInitialData();
  });

  // --- CORE UI CONTROLLER FUNCTIONS ---

  function setupEventListeners() {
    // HUD Controllers
    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const theme = e.currentTarget.getAttribute('data-theme');
        applyTheme(theme);
      });
    });

    document.querySelectorAll('[data-state]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const viewState = e.currentTarget.getAttribute('data-state');
        setViewState(viewState);
      });
    });

    // Collapse HUD Button
    const hudCollapseBtn = document.getElementById('hudCollapseBtn');
    const hudController = document.getElementById('hudController');
    hudCollapseBtn.addEventListener('click', () => {
      hudController.classList.toggle('collapsed');
      const isCollapsed = hudController.classList.contains('collapsed');
      hudCollapseBtn.setAttribute('aria-label', isCollapsed ? 'Expand HUD' : 'Collapse HUD');
      hudCollapseBtn.innerHTML = isCollapsed 
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    });

    // Mouse glow coordinate effect for Glassmorphism
    document.addEventListener('mousemove', (e) => {
      if (state.theme !== 'theme-glass-bento') return;
      const cards = document.querySelectorAll('.kpi-card-shell, .section-card-shell');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });

    // Data Source Toggle
    const dataSourceToggle = document.getElementById('dataSourceToggle');
    dataSourceToggle.addEventListener('click', () => {
      const isLive = dataSourceToggle.getAttribute('aria-checked') === 'true';
      setDataSource(isLive ? 'simulated' : 'live');
    });

    // Drawer triggers
    document.getElementById('openCreateDrawerBtn').addEventListener('click', () => toggleDrawer(true));
    document.getElementById('closeCreateDrawerBtn').addEventListener('click', () => toggleDrawer(false));
    document.getElementById('cancelFormBtn').addEventListener('click', () => toggleDrawer(false));
    document.getElementById('drawerOverlay').addEventListener('click', () => toggleDrawer(false));

    // Form submission
    document.getElementById('createJobForm').addEventListener('submit', handleFormSubmit);

    // Empty state triggers
    document.getElementById('emptyStateCreateBtn').addEventListener('click', () => toggleDrawer(true));
    
    // Error state triggers
    document.getElementById('errorRetryBtn').addEventListener('click', () => {
      showToast('Handshake initiated with cloud engine...', 'info');
      loadInitialData();
    });
    document.getElementById('errorFallbackBtn').addEventListener('click', () => {
      setDataSource('simulated');
      setViewState('nominal');
    });

    // Run / manual triggers
    document.getElementById('runWorkerPollBtn').addEventListener('click', triggerSchedulerTick);

    // Table search and filters
    document.getElementById('tableSearchInput').addEventListener('input', () => {
      state.currentPage = 1;
      applyTableFilters();
    });
    document.getElementById('filterStatus').addEventListener('change', () => {
      state.currentPage = 1;
      applyTableFilters();
    });
    document.getElementById('filterType').addEventListener('change', () => {
      state.currentPage = 1;
      applyTableFilters();
    });
    document.getElementById('sortOrder').addEventListener('change', () => {
      applyTableFilters();
    });

    // Export CSV
    document.getElementById('exportCsvBtn').addEventListener('click', exportLogsToCsv);

    // Navigation handles (Tabs switching)
    document.querySelectorAll('[data-tab]').forEach(tabLink => {
      tabLink.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = e.currentTarget.getAttribute('data-tab');
        switchTab(tabName);
      });
    });

    // Pagination buttons
    document.getElementById('prevPageBtn').addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTable();
      }
    });
    document.getElementById('nextPageBtn').addEventListener('click', () => {
      const maxPages = Math.ceil(state.filteredHistory.length / state.rowsPerPage);
      if (state.currentPage < maxPages) {
        state.currentPage++;
        renderTable();
      }
    });

    // Spline parameter control actions
    document.querySelectorAll('.spline-ctrl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.spline-ctrl-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        const anim = e.currentTarget.getAttribute('data-animation');
        const speed = parseFloat(e.currentTarget.getAttribute('data-speed'));
        
        // 1. Modulate simulation tick speed
        if (anim === 'warp') {
          state.simulationTickRate = 600;
          showToast('Warp Speed Enabled: Dispatch engine cycle overclocked!', 'success');
          addActivityLog('System alert: <strong>Aether Core overclocking</strong> to 4.0x frequency.', 'error');
        } else if (anim === 'orbit') {
          state.simulationTickRate = 1000;
          showToast('Orbit Stabilized: Queue throughput optimized (1.0s ticks).', 'info');
          addActivityLog('System status: 3D Core telemetry orbital paths aligned.', 'success');
        } else {
          state.simulationTickRate = 1500;
          showToast('Returned to Pulse frequency.', 'info');
          addActivityLog('System status: 3D Core energy levels stabilized.', 'info');
        }
        
        // Restart simulator with the new interval speed
        if (state.dataSource === 'simulated') {
          startMockSimulator();
        }
        
        // 2. Set card animations class
        const visualizer = document.querySelector('.visualizer-section');
        if (visualizer) {
          visualizer.className = 'section-card visualizer-section';
          visualizer.classList.add(`anim-${anim}`);
        }
      });
    });
  }

  function applyTheme(themeName) {
    document.body.className = '';
    document.body.classList.add(themeName);
    state.theme = themeName;

    // Highlight active theme button in HUD
    document.querySelectorAll('[data-theme]').forEach(btn => {
      if (btn.getAttribute('data-theme') === themeName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Sync menu tabs (ensure active persists across styling layouts)
    const activeTab = document.querySelector('.nav-link.active')?.getAttribute('data-tab') || 'overview';
    switchTab(activeTab);

    // Dynamic date output adjustment for Swiss Minimalist mode
    if (themeName === 'theme-swiss-minimal') {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      document.getElementById('editorialDate').textContent = new Date().toLocaleDateString('en-US', options).toUpperCase();
    }
  }

  function setViewState(viewState) {
    state.viewState = viewState;

    // UI elements to toggle
    const grid = document.getElementById('dashboardGrid');
    const skeletons = document.getElementById('skeletonGrid');
    const emptyView = document.getElementById('emptyStateView');
    const errorView = document.getElementById('errorStateView');

    grid.style.display = 'none';
    skeletons.style.display = 'none';
    emptyView.style.display = 'none';
    errorView.style.display = 'none';

    // Highlight active state button in HUD
    document.querySelectorAll('[data-state]').forEach(btn => {
      if (btn.getAttribute('data-state') === viewState) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    switch (viewState) {
      case 'loading':
        skeletons.style.display = 'grid';
        break;
      case 'empty':
        emptyView.style.display = 'flex';
        break;
      case 'error':
        errorView.style.display = 'flex';
        break;
      case 'nominal':
        grid.style.display = 'grid';
        renderActiveQueue();
        applyTableFilters();
        updateKpis();
        break;
    }
  }

  function setDataSource(source) {
    state.dataSource = source;
    const toggle = document.getElementById('dataSourceToggle');
    const apiHint = document.getElementById('apiHint');
    const badge = document.getElementById('connectionBadge');
    const badgeText = document.getElementById('connectionBadgeText');

    if (source === 'live') {
      toggle.setAttribute('aria-checked', 'true');
      apiHint.style.display = 'block';
      badge.className = 'connection-badge status-connected';
      badgeText.textContent = 'Live API Loop';
      
      // Stop simulator
      clearInterval(state.simIntervalId);
      
      // Start API polling
      loadInitialData();
      state.apiPollIntervalId = setInterval(loadJobsFromApi, 3000);
      showToast('Live localhost server feed selected', 'info');
    } else {
      toggle.setAttribute('aria-checked', 'false');
      apiHint.style.display = 'none';
      badge.className = 'connection-badge status-connected';
      badgeText.textContent = 'Simulated Local';
      
      // Stop API polling
      clearInterval(state.apiPollIntervalId);
      
      // Start Simulator
      loadInitialData();
      startMockSimulator();
      showToast('Offline workflow simulator selected', 'info');
    }
  }

  function toggleDrawer(open) {
    const drawer = document.getElementById('slideDrawer');
    const overlay = document.getElementById('drawerOverlay');

    if (open) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      drawer.setAttribute('aria-hidden', 'false');
      overlay.setAttribute('aria-hidden', 'false');
      document.getElementById('taskName').focus();
    } else {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      drawer.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('aria-hidden', 'true');
      clearFormErrors();
    }
  }

  function switchTab(tabName) {
    // Hide all view contents
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    // Remove active styles from nav links in both headers and sidebars
    document.querySelectorAll('[data-tab]').forEach(el => {
      el.classList.remove('active');
    });

    // Activate selected content block
    const tabEl = document.getElementById('tabOverview'); // For simplicity in mock we stay on main tab but configure items
    if (tabEl) tabEl.classList.add('active');

    // Highlight links in nav assemblies
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(el => {
      el.classList.add('active');
    });

    // Filter view presentation based on simulated route
    const mainGridBlocks = document.querySelectorAll('#dashboardGrid > div, #dashboardGrid > section');
    const activeQueueSec = document.querySelector('.active-queue-section');
    const historySec = document.querySelector('.history-section');
    const activitySec = document.querySelector('.activity-section');
    const kpisSec = document.querySelector('.kpi-panel');

    // Reset nominal layouts
    mainGridBlocks.forEach(el => el.style.display = '');
    activeQueueSec.style.display = '';
    historySec.style.display = '';

    if (tabName === 'queues') {
      historySec.style.display = 'none';
      activitySec.style.display = 'none';
    } else if (tabName === 'history') {
      kpisSec.style.display = 'none';
      activeQueueSec.style.display = 'none';
      activitySec.style.display = 'none';
      
      // Make history full column width in grids
      const leftCol = document.getElementById('leftMainBlock');
      if (leftCol) {
        leftCol.classList.remove('bento-col-3-lg');
        leftCol.classList.add('bento-col-4');
      }
    } else {
      // Overview defaults
      const leftCol = document.getElementById('leftMainBlock');
      if (leftCol) {
        leftCol.classList.remove('bento-col-4');
        leftCol.classList.add('bento-col-3-lg');
      }
    }
  }

  // --- DATA TRANSFORMS & RETRIEVAL ---

  function loadInitialData() {
    if (state.dataSource === 'simulated') {
      state.jobs = [...initialSimulatedJobs];
      // Insert initial active tasks
      state.jobs.push(
        { id: 'job_active_1', name: 'backup-firestore-db', status: 'pending', run_at: getIsoStringOffset(0), created_at: getIsoStringOffset(-10), progress: 0, priority: 'high', type: 'backup', payload: { compression: 'gzip' } },
        { id: 'job_active_2', name: 'flush-redis-cache', status: 'pending', run_at: getIsoStringOffset(10), created_at: getIsoStringOffset(-5), progress: 0, priority: 'low', type: 'webhook', payload: { keys: ['*'] } }
      );
      addActivityLog('System initialized. Simulated logs loaded.', 'info');
      setViewState('nominal');
      startMockSimulator();
    } else {
      loadJobsFromApi();
    }
  }

  async function loadJobsFromApi() {
    try {
      const res = await fetch(`${state.apiBase}/jobs`);
      if (!res.ok) throw new Error('API server returned error code');
      const data = await res.json();
      
      // Map API items list to our standard models
      state.jobs = (data.jobs || []).map(apiJob => {
        // Fallback structures
        const status = apiJob.status || 'pending';
        const type = inferJobType(apiJob.name);
        return {
          id: apiJob.id || `job_${Math.random().toString(36).substr(2, 6)}`,
          name: apiJob.name || 'unnamed-task',
          status: status,
          run_at: apiJob.run_at || new Date().toISOString(),
          created_at: apiJob.created_at || new Date().toISOString(),
          executed_at: apiJob.executed_at || null,
          progress: status === 'running' ? 45 : (status === 'completed' ? 100 : 0),
          priority: apiJob.priority || 'medium',
          type: type,
          payload: apiJob.payload || {}
        };
      });

      const badge = document.getElementById('connectionBadge');
      const badgeText = document.getElementById('connectionBadgeText');
      badge.className = 'connection-badge status-connected';
      badgeText.textContent = 'Live API Loop';

      if (state.viewState === 'error' || state.viewState === 'loading') {
        setViewState('nominal');
      } else {
        renderActiveQueue();
        applyTableFilters();
        updateKpis();
      }
    } catch (err) {
      console.warn('API error connection failed: ', err.message);
      const badge = document.getElementById('connectionBadge');
      const badgeText = document.getElementById('connectionBadgeText');
      badge.className = 'connection-badge status-disconnected';
      badgeText.textContent = 'API Connection Error';
      
      if (state.dataSource === 'live') {
        document.getElementById('errorStateText').textContent = `Connection handshake to Go Scheduler daemon at ${state.apiBase} failed. Verify that your Go server is compiled and running locally on port 3002.`;
        setViewState('error');
      }
    }
  }

  // --- ACTIONS HANDLERS (Manual Scheduler commands) ---

  async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const nameInput = document.getElementById('taskName');
    const typeSelect = document.getElementById('taskType');
    const prioritySelect = document.getElementById('taskPriority');
    const delaySelect = document.getElementById('taskDelay');
    const payloadText = document.getElementById('taskPayload');

    let hasErrors = false;

    // Validate name (alphanumeric, dashes, no spaces)
    const nameVal = nameInput.value.trim();
    if (!nameVal || /\s/.test(nameVal) || !/^[a-zA-Z0-9-_]+$/.test(nameVal)) {
      document.getElementById('nameError').style.display = 'block';
      nameInput.classList.add('error');
      hasErrors = true;
    }

    // Validate JSON payload
    let payloadJson = {};
    try {
      payloadJson = JSON.parse(payloadText.value);
    } catch (err) {
      document.getElementById('jsonError').style.display = 'block';
      payloadText.classList.add('error');
      hasErrors = true;
    }

    if (hasErrors) return;

    const delaySeconds = parseInt(delaySelect.value);
    const runAtTime = new Date(Date.now() + delaySeconds * 1000).toISOString();

    if (state.dataSource === 'simulated') {
      const newJob = {
        id: `job_${Math.random().toString(36).substr(2, 6)}`,
        name: nameVal,
        status: 'pending',
        run_at: runAtTime,
        created_at: new Date().toISOString(),
        progress: 0,
        priority: prioritySelect.value,
        type: typeSelect.value,
        payload: payloadJson
      };

      state.jobs.push(newJob);
      addActivityLog(`Job scheduled: <strong>${newJob.name}</strong> on queue loop.`, 'info');
      showToast(`Task ${newJob.id} successfully queued!`, 'success');
      
      toggleDrawer(false);
      renderActiveQueue();
      updateKpis();
    } else {
      // POST API call
      try {
        const res = await fetch(`${state.apiBase}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameVal,
            run_at: runAtTime,
            payload: payloadJson
          })
        });

        if (!res.ok) throw new Error('API schedule request failed');
        const apiJob = await res.json();

        addActivityLog(`Job dispatched live: <strong>${apiJob.name || nameVal}</strong>.`, 'info');
        showToast('Task queued successfully via cloud API!', 'success');
        
        toggleDrawer(false);
        loadJobsFromApi();
      } catch (err) {
        showToast(`API Scheduling Error: ${err.message}`, 'error');
      }
    }
  }

  async function triggerSchedulerTick() {
    const btn = document.getElementById('runWorkerPollBtn');
    btn.disabled = true;
    
    if (state.dataSource === 'simulated') {
      showToast('Triggering simulated cron polling loop...', 'info');
      addActivityLog('Manual polling check: <strong>POST /run</strong> triggered.', 'info');
      
      // Find all pending tasks that should run
      const now = new Date();
      let triggeredCount = 0;
      state.jobs.forEach(job => {
        if (job.status === 'pending' && new Date(job.run_at) <= now) {
          job.status = 'running';
          job.progress = 5;
          triggeredCount++;
        }
      });

      setTimeout(() => {
        btn.disabled = false;
        if (triggeredCount > 0) {
          showToast(`Running ${triggeredCount} jobs on worker pool`, 'success');
        } else {
          showToast('Scheduler polling executed: no tasks ready.', 'info');
        }
        renderActiveQueue();
      }, 600);
    } else {
      showToast('Dispatching /run command to regional Go trigger...', 'info');
      try {
        const res = await fetch(`${state.apiBase}/run`, { method: 'POST' });
        if (!res.ok) throw new Error('POST /run command failed');
        const result = await res.json();
        
        showToast(`Scheduler ran successfully: processed ${result.jobs_ran || 0} jobs.`, 'success');
        addActivityLog(`API Poller processed: <strong>${result.jobs_ran || 0} jobs executed</strong>`, 'success');
        loadJobsFromApi();
      } catch (err) {
        showToast(`Trigger execution failed: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
      }
    }
  }

  async function retryJob(jobId) {
    const targetJob = state.jobs.find(j => j.id === jobId);
    if (!targetJob) return;

    if (state.dataSource === 'simulated') {
      // Re-trigger in simulation
      targetJob.status = 'pending';
      targetJob.run_at = new Date().toISOString();
      targetJob.progress = 0;
      targetJob.error = null;
      
      addActivityLog(`Retrying job: <strong>${targetJob.name}</strong>`, 'info');
      showToast(`Job ${targetJob.id} re-queued!`, 'success');
      renderActiveQueue();
      applyTableFilters();
      updateKpis();
    } else {
      showToast(`Rescheduling live job ${jobId}...`, 'info');
      // Re-queue live (Scheduler schema requires deleting and adding, or we simulate by calling schedule handler with same details)
      try {
        const res = await fetch(`${state.apiBase}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: targetJob.name,
            run_at: new Date().toISOString(),
            payload: targetJob.payload
          })
        });

        if (!res.ok) throw new Error('Failed to reschedule job via API');
        
        // Delete original failed if possible
        await fetch(`${state.apiBase}/jobs/${jobId}`, { method: 'DELETE' });

        showToast('Failed job re-queued successfully!', 'success');
        loadJobsFromApi();
      } catch (err) {
        showToast(`Retry error: ${err.message}`, 'error');
      }
    }
  }

  async function cancelJob(jobId) {
    const jobIdx = state.jobs.findIndex(j => j.id === jobId);
    if (jobIdx === -1) return;
    const targetJob = state.jobs[jobIdx];

    if (state.dataSource === 'simulated') {
      // Remove from stack or change status to failed with canceled flag
      state.jobs.splice(jobIdx, 1);
      addActivityLog(`Job canceled: <strong>${targetJob.name}</strong>`, 'error');
      showToast(`Cancelled queued task ${jobId}`, 'info');
      renderActiveQueue();
      updateKpis();
    } else {
      showToast(`Cancelling task ${jobId} via API...`, 'info');
      try {
        const res = await fetch(`${state.apiBase}/jobs/${jobId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('API delete call rejected');
        
        showToast('Queued job deleted successfully!', 'success');
        addActivityLog(`Job canceled via daemon API: <strong>${targetJob.name}</strong>`, 'error');
        loadJobsFromApi();
      } catch (err) {
        showToast(`Cancel error: ${err.message}`, 'error');
      }
    }
  }

  // --- RENDER ENGINES ---

  function renderActiveQueue() {
    const listContainer = document.getElementById('queueList');
    const emptyIndicator = document.getElementById('queueEmptyIndicator');
    
    // Filters items that are active ('pending' or 'running')
    const activeJobs = state.jobs.filter(j => j.status === 'pending' || j.status === 'running' || j.status === 'retrying');

    if (activeJobs.length === 0) {
      listContainer.innerHTML = '';
      emptyIndicator.style.display = 'flex';
      document.getElementById('kpiPendingVal').textContent = '0';
      return;
    }

    emptyIndicator.style.display = 'none';
    document.getElementById('kpiPendingVal').textContent = activeJobs.length.toString();

    listContainer.innerHTML = activeJobs.map(job => {
      const isRunning = job.status === 'running';
      const progressPercent = job.progress || 0;
      
      const priorityClass = `priority-${job.priority || 'medium'}`;
      const statusLabel = isRunning ? 'running' : job.status;
      const statusDotClass = `status-dot-${job.status}`;

      return `
        <div class="queue-row" data-id="${job.id}">
          <div class="task-info">
            <div class="task-name-row">
              <span class="task-name">${job.name}</span>
              <span class="priority-badge ${priorityClass}">${job.priority}</span>
            </div>
            <span class="task-type-badge">${job.type || 'webhook'}</span>
          </div>
          
          <div class="task-progress-block">
            <div class="progress-meta">
              <span>Progress</span>
              <span class="tabular font-mono">${progressPercent}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>

          <div class="task-status-block">
            <span class="status-dot ${statusDotClass}"></span>
            <span class="status-label font-mono text-muted">${statusLabel}</span>
          </div>

          <div class="task-actions">
            ${isRunning 
              ? `<button class="btn btn-secondary btn-icon-sm" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></button>`
              : `<button class="btn btn-secondary btn-icon-sm" onclick="triggerRunManualSim('${job.id}')" title="Force Run Now"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></button>`
            }
            <button class="btn btn-secondary btn-icon-sm" onclick="cancelJobSim('${job.id}')" title="Cancel/Delete Job">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function applyTableFilters() {
    const searchVal = document.getElementById('tableSearchInput').value.toLowerCase().trim();
    const statusVal = document.getElementById('filterStatus').value;
    const typeVal = document.getElementById('filterType').value;
    const sortVal = document.getElementById('sortOrder').value;

    // Filter historical logs ('completed' or 'failed')
    let list = state.jobs.filter(j => j.status === 'completed' || j.status === 'failed');

    if (searchVal) {
      list = list.filter(j => j.name.toLowerCase().includes(searchVal) || j.id.toLowerCase().includes(searchVal));
    }

    if (statusVal !== 'all') {
      list = list.filter(j => j.status === statusVal);
    }

    if (typeVal !== 'all') {
      list = list.filter(j => j.type === typeVal);
    }

    // Sort order logic
    if (sortVal === 'newest') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortVal === 'oldest') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortVal === 'fastest') {
      list.sort((a, b) => (a.duration || 9999) - (b.duration || 9999));
    }

    state.filteredHistory = list;
    state.currentPage = 1;
    renderTable();
  }

  function renderTable() {
    const tbody = document.getElementById('historyTableBody');
    const startIdx = (state.currentPage - 1) * state.rowsPerPage;
    const endIdx = startIdx + state.rowsPerPage;
    const pageItems = state.filteredHistory.slice(startIdx, endIdx);

    const paginationInfo = document.getElementById('paginationInfo');
    const total = state.filteredHistory.length;

    if (total === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 40px 0;">No historical job executions match current query filters.</td></tr>`;
      paginationInfo.textContent = 'Showing 0 of 0 execution records';
      renderPaginationControls(0);
      return;
    }

    paginationInfo.textContent = `Showing ${startIdx + 1}-${Math.min(endIdx, total)} of ${total} execution records`;
    renderPaginationControls(total);

    tbody.innerHTML = pageItems.map(job => {
      const isSuccess = job.status === 'completed';
      const statusBadgeClass = isSuccess ? 'status-completed' : 'status-failed';
      const durationVal = job.duration ? `${job.duration}ms` : '—';
      
      const createdLabel = formatRelativeTime(job.created_at);
      const executedLabel = job.executed_at ? formatTimeOfDay(job.executed_at) : '—';

      return `
        <tr>
          <td>
            <div class="job-name-cell">${job.name}</div>
            <div class="job-meta-cell font-mono">ID: ${job.id}</div>
          </td>
          <td class="font-mono text-muted" style="font-size: 0.8125rem;">${job.type || 'webhook'}</td>
          <td class="tabular">${createdLabel}</td>
          <td class="tabular">${executedLabel}</td>
          <td>
            <span class="status-badge ${statusBadgeClass}">${job.status}</span>
          </td>
          <td class="text-right">
            ${isSuccess 
              ? `<button class="btn btn-secondary btn-sm" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span>Synced</span></button>`
              : `<button class="btn btn-secondary btn-sm" onclick="retryJobSim('${job.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg><span>Retry</span></button>`
            }
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderPaginationControls(totalItems) {
    const container = document.getElementById('paginationNumbers');
    const maxPages = Math.ceil(totalItems / state.rowsPerPage);
    
    document.getElementById('prevPageBtn').disabled = state.currentPage === 1;
    document.getElementById('nextPageBtn').disabled = state.currentPage === maxPages || maxPages === 0;

    let html = '';
    for (let i = 1; i <= maxPages; i++) {
      const activeClass = i === state.currentPage ? 'active' : '';
      html += `<button class="pagination-btn ${activeClass}" onclick="goToTablePageSim(${i})">${i}</button>`;
    }
    container.innerHTML = html;
  }

  function updateKpis() {
    const listCompleted = state.jobs.filter(j => j.status === 'completed');
    const listFailed = state.jobs.filter(j => j.status === 'failed');
    const totalHistoric = listCompleted.length + listFailed.length;

    // Total metric
    const totalEl = document.querySelector('#kpiTotal .kpi-number');
    totalEl.textContent = state.jobs.length.toLocaleString();

    // Success rate metric
    const successEl = document.querySelector('#kpiSuccess .kpi-number');
    if (totalHistoric > 0) {
      const rate = (listCompleted.length / totalHistoric) * 100;
      successEl.textContent = `${rate.toFixed(2)}%`;
    } else {
      successEl.textContent = '100%';
    }

    // Average execution latency
    const latencyEl = document.querySelector('#kpiAvgTime .kpi-number');
    const hasDurations = listCompleted.filter(j => j.duration);
    if (hasDurations.length > 0) {
      const totalLatency = hasDurations.reduce((acc, j) => acc + j.duration, 0);
      const avg = totalLatency / hasDurations.length;
      latencyEl.textContent = `${Math.round(avg)}ms`;
    } else {
      latencyEl.textContent = '148ms';
    }
  }

  function addActivityLog(message, type = 'info') {
    const feed = document.getElementById('activityFeed');
    const timeStr = new Date().toISOString().split('T')[1].substring(0, 8); // UTC seconds
    const item = document.createElement('div');
    item.className = 'activity-item';

    let nodeColorClass = 'node-info';
    if (type === 'success') nodeColorClass = 'node-success';
    if (type === 'error') nodeColorClass = 'node-error';

    item.innerHTML = `
      <div class="activity-node ${nodeColorClass}"></div>
      <div class="activity-detail">
        <span class="activity-message">${message}</span>
        <span class="activity-time font-mono">${timeStr} UTC</span>
      </div>
    `;

    feed.prepend(item);

    // Limit elements to 10 max to prevent rendering slop
    while (feed.childElementCount > 10) {
      feed.removeChild(feed.lastChild);
    }
  }

  // --- MOCK SIMULATION ENGINE ---

  function startMockSimulator() {
    if (state.simIntervalId) clearInterval(state.simIntervalId);

    state.simIntervalId = setInterval(() => {
      let stateChanged = false;

      // 1. Process active running queue ticks
      state.jobs.forEach(job => {
        if (job.status === 'running') {
          job.progress += Math.floor(Math.random() * 25) + 10;
          if (job.progress >= 100) {
            job.progress = 100;
            // Complete or fail randomly (90% success probability)
            const success = Math.random() > 0.1;
            job.status = success ? 'completed' : 'failed';
            job.executed_at = new Date().toISOString();
            job.duration = Math.floor(Math.random() * 600) + 40; // 40-640ms

            if (success) {
              addActivityLog(`Job executed successfully: <strong>${job.name}</strong> [${job.duration}ms]`, 'success');
              showToast(`Task ${job.id} completed!`, 'success');
            } else {
              job.error = 'Segmentation fault in node memory workspace trigger';
              addActivityLog(`Job failed: <strong>${job.name}</strong> on task worker pool`, 'error');
              showToast(`Task ${job.id} failed executing`, 'error');
            }
          }
          stateChanged = true;
        }
      });

      // 2. Randomly spawn pending tasks scheduled for immediate triggers (15% chance per tick)
      if (Math.random() < 0.12 && state.jobs.filter(j => j.status === 'pending').length < 4) {
        const name = mockTaskNames[Math.floor(Math.random() * mockTaskNames.length)];
        const delaySeconds = 5;
        const targetType = inferJobType(name);
        const newSimJob = {
          id: `job_${Math.random().toString(36).substr(2, 6)}`,
          name: name,
          status: 'pending',
          run_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
          created_at: new Date().toISOString(),
          progress: 0,
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          type: targetType,
          payload: { auto_simulated: true, cron: '*/5 * * * *' }
        };
        state.jobs.push(newSimJob);
        addActivityLog(`Task queued by engine daemon: <strong>${newSimJob.name}</strong>`, 'info');
        stateChanged = true;
      }

      // 3. Process ready pending tasks to running status
      const now = new Date();
      state.jobs.forEach(job => {
        if (job.status === 'pending' && new Date(job.run_at) <= now) {
          job.status = 'running';
          job.progress = 0;
          stateChanged = true;
        }
      });

      if (stateChanged && state.viewState === 'nominal') {
        renderActiveQueue();
        applyTableFilters();
        updateKpis();
      }
    }, state.simulationTickRate || 1500);
  }

  // --- HELPER UTILITIES ---

  function clearFormErrors() {
    document.getElementById('taskName').classList.remove('error');
    document.getElementById('taskPayload').classList.remove('error');
    document.getElementById('nameError').style.display = 'none';
    document.getElementById('jsonError').style.display = 'none';
  }

  function getIsoStringOffset(seconds) {
    return new Date(Date.now() + seconds * 1000).toISOString();
  }

  function inferJobType(name) {
    if (name.includes('sms') || name.includes('email') || name.includes('notification')) return 'email';
    if (name.includes('sync') || name.includes('flush') || name.includes('reindex')) return 'db_sync';
    if (name.includes('backup') || name.includes('prune')) return 'backup';
    return 'webhook';
  }

  function formatRelativeTime(isoString) {
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 5) return 'just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  }

  function formatTimeOfDay(isoString) {
    const date = new Date(isoString);
    const hrs = String(date.getUTCHours()).padStart(2, '0');
    const mins = String(date.getUTCMinutes()).padStart(2, '0');
    const secs = String(date.getUTCSeconds()).padStart(2, '0');
    return `${hrs}:${mins}:${secs} UTC`;
  }

  // TOAST NOTIFICATIONS
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    container.appendChild(toast);
    
    // Trigger animations
    setTimeout(() => toast.classList.add('active'), 50);

    const closeToast = () => {
      toast.classList.remove('active');
      setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector('.toast-close').addEventListener('click', closeToast);
    
    // Auto remove after 4 seconds
    setTimeout(closeToast, 4000);
  }

  // EXPORT CSV
  function exportLogsToCsv() {
    const list = state.filteredHistory;
    if (list.length === 0) {
      showToast('No logs available to export.', 'info');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Job ID,Job Name,Status,Type,Scheduled Run At,Executed At,Duration (ms),Error Message\n';

    list.forEach(job => {
      const row = [
        job.id,
        job.name,
        job.status,
        job.type,
        job.run_at,
        job.executed_at || '',
        job.duration || '',
        `"${(job.error || '').replace(/"/g, '""')}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aetherengine_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Task history CSV generated!', 'success');
  }

  // System clock loop
  function initClock() {
    const utcClock = document.getElementById('utcClock');
    setInterval(() => {
      const d = new Date();
      const hrs = String(d.getUTCHours()).padStart(2, '0');
      const mins = String(d.getUTCMinutes()).padStart(2, '0');
      const secs = String(d.getUTCSeconds()).padStart(2, '0');
      utcClock.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  // --- WINDOW BINDINGS (Allow execution triggers in inline calls) ---
  window.triggerRunManualSim = (jobId) => {
    if (state.dataSource === 'simulated') {
      const targetJob = state.jobs.find(j => j.id === jobId);
      if (targetJob) {
        targetJob.status = 'running';
        targetJob.progress = 0;
        addActivityLog(`Force start running: <strong>${targetJob.name}</strong>`, 'info');
        renderActiveQueue();
      }
    } else {
      // In live mode, we post to schedule run
      triggerSchedulerTick();
    }
  };

  window.cancelJobSim = (jobId) => {
    cancelJob(jobId);
  };

  window.retryJobSim = (jobId) => {
    retryJob(jobId);
  };

  window.goToTablePageSim = (pageNum) => {
    state.currentPage = pageNum;
    renderTable();
  };

})();
