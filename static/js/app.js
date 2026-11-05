/**
 * Main Application Logic & User Interface Controller
 * Coordinates API requests, UI states, real-time sentiment previews, and visualizations.
 */

const App = {
  currentUser: null,
  faculties: [],
  subjects: [],
  currentView: "home",
  currentAdminSubtab: "feedbacks",
  previewDebounceTimer: null,
  searchDebounceTimer: null,

  async init() {
    // 1. Check user authentication
    await this.checkAuth();

    // 2. Load faculties and subjects
    await this.loadFacultiesAndSubjects();

    // 3. Setup star ratings
    this.setupStarRatings();

    // 4. Load initial overview KPIs
    await this.loadOverviewKPIs();

    // 5. Default route
    this.navigateTo("home");
  },

  // -------------------------------------------------------------
  // Authentication & State
  // -------------------------------------------------------------
  async checkAuth() {
    try {
      const data = await API.getMe();
      if (data && data.authenticated) {
        this.currentUser = data.user;
      } else {
        this.currentUser = null;
      }
    } catch (err) {
      this.currentUser = null;
    }
    this.renderUserNav();
    this.updateSubmissionIdentity();
  },

  renderUserNav() {
    const container = document.getElementById("user-actions-container");
    if (!container) return;

    if (this.currentUser) {
      const isAdm = this.currentUser.role === "admin";
      container.innerHTML = `
        <div class="user-badge">
          <span class="role-tag">${isAdm ? "ADMIN" : "STUDENT"}</span>
          <span style="font-weight: 600;">${this.escapeHtml(this.currentUser.name)}</span>
        </div>
        <button class="btn btn-outline btn-sm" onclick="App.logout()">Sign Out</button>
      `;
    } else {
      container.innerHTML = `
        <button class="btn btn-outline btn-sm" onclick="App.openAuthModal('student')">Sign In</button>
        <button class="btn btn-primary btn-sm" onclick="App.openRegisterModal()">Register</button>
      `;
    }
  },

  updateSubmissionIdentity() {
    const pill = document.getElementById("submission-identity-pill");
    const anonCheck = document.getElementById("anonymous-checkbox-container");
    if (!pill) return;

    if (this.currentUser) {
      pill.innerHTML = `
        <span class="badge" style="background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3);">
          Submitting as Student: ${this.escapeHtml(this.currentUser.name)}
        </span>
      `;
      if (anonCheck) anonCheck.style.display = "block";
    } else {
      pill.innerHTML = `
        <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-secondary); border: 1px solid var(--border-color);">
          Submitting as Anonymous Guest
        </span>
      `;
      if (anonCheck) anonCheck.style.display = "none";
    }
  },

  async handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const submitBtn = document.getElementById("auth-submit-btn");

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing In...";
      const res = await API.login({ email, password });
      if (res.token) {
        API.setToken(res.token);
      }
      this.currentUser = res.user;
      this.closeModals();
      this.renderUserNav();
      this.updateSubmissionIdentity();
      this.showToast(`Welcome back, ${res.user.name}!`, "success");

      if (this.currentUser.role === "admin") {
        this.navigateTo("admin");
      } else {
        this.navigateTo("student");
      }
    } catch (err) {
      this.showToast(err.message || "Login failed", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  },

  async handleRegisterSubmit(event) {
    event.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const student_id = document.getElementById("reg-student-id").value.trim();
    const department = document.getElementById("reg-dept").value.trim();
    const password = document.getElementById("reg-password").value;

    try {
      const res = await API.register({ name, email, student_id, department, password });
      if (res.token) {
        API.setToken(res.token);
      }
      this.currentUser = res.user;
      this.closeModals();
      this.renderUserNav();
      this.updateSubmissionIdentity();
      this.showToast("Registration successful! You are now logged in.", "success");
      this.navigateTo("student");
    } catch (err) {
      this.showToast(err.message || "Registration failed", "error");
    }
  },

  async logout() {
    try {
      await API.logout();
    } catch (e) {
      // ignore
    }
    API.setToken(null);
    this.currentUser = null;
    this.renderUserNav();
    this.updateSubmissionIdentity();
    this.showToast("Signed out successfully", "success");
    this.navigateTo("home");
  },

  fillDemoLogin(role) {
    if (role === "admin") {
      document.getElementById("login-email").value = "admin@feedback.edu";
      document.getElementById("login-password").value = "Admin@123";
    } else {
      document.getElementById("login-email").value = "student@feedback.edu";
      document.getElementById("login-password").value = "student123";
    }
  },

  // -------------------------------------------------------------
  // Navigation & Views
  // -------------------------------------------------------------
  navigateTo(viewName) {
    this.currentView = viewName;

    // Toggle active navigation button
    document.querySelectorAll(".nav-btn").forEach(btn => {
      if (btn.dataset.view === viewName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Toggle view sections
    document.querySelectorAll(".app-view").forEach(section => {
      section.classList.remove("active-view");
    });
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add("active-view");
    }

    // Trigger view-specific loaders
    if (viewName === "home") {
      this.loadOverviewKPIs();
    } else if (viewName === "analytics") {
      this.loadAnalyticsData();
    } else if (viewName === "student") {
      this.loadStudentPortal();
    } else if (viewName === "admin") {
      this.loadAdminDashboard();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // -------------------------------------------------------------
  // Data Loaders
  // -------------------------------------------------------------
  async loadFacultiesAndSubjects() {
    try {
      const [facRes, subRes] = await Promise.all([
        API.getFaculties(),
        API.getSubjects()
      ]);

      this.faculties = facRes.faculties || [];
      this.subjects = subRes.subjects || [];

      // Populate select elements
      const facSelect = document.getElementById("faculty-select");
      if (facSelect) {
        facSelect.innerHTML = '<option value="">-- Choose Faculty Member --</option>';
        this.faculties.forEach(f => {
          facSelect.innerHTML += `<option value="${f.id}">${this.escapeHtml(f.name)} (${this.escapeHtml(f.department)})</option>`;
        });
      }

      const subSelect = document.getElementById("subject-select");
      if (subSelect) {
        subSelect.innerHTML = '<option value="">-- Choose Subject / Course --</option>';
        this.subjects.forEach(s => {
          subSelect.innerHTML += `<option value="${s.id}">${this.escapeHtml(s.code)} - ${this.escapeHtml(s.name)}</option>`;
        });
      }

      // Admin filter selects
      const adminFacFilter = document.getElementById("admin-filter-faculty");
      if (adminFacFilter) {
        adminFacFilter.innerHTML = '<option value="">All Faculty Members</option>';
        this.faculties.forEach(f => {
          adminFacFilter.innerHTML += `<option value="${f.id}">${this.escapeHtml(f.name)}</option>`;
        });
      }

      const adminSubFilter = document.getElementById("admin-filter-subject");
      if (adminSubFilter) {
        adminSubFilter.innerHTML = '<option value="">All Subjects</option>';
        this.subjects.forEach(s => {
          adminSubFilter.innerHTML += `<option value="${s.id}">${this.escapeHtml(s.code)} - ${this.escapeHtml(s.name)}</option>`;
        });
      }
    } catch (err) {
      console.error("Error loading faculties/subjects:", err);
    }
  },

  async loadOverviewKPIs() {
    try {
      const summary = await API.getSummary();
      document.getElementById("kpi-total-feedback").textContent = summary.total_feedback || 0;
      document.getElementById("kpi-positive-pct").textContent = `${summary.sentiment_percentages.Positive || 0}%`;
      document.getElementById("kpi-avg-rating").textContent = `${summary.avg_rating || 0} / 5.0`;
      document.getElementById("kpi-faculty-count").textContent = this.faculties.length || (summary.faculty_breakdown?.length || 0);
    } catch (err) {
      console.error("Error loading KPIs:", err);
    }
  },

  async loadAnalyticsData() {
    try {
      const summary = await API.getSummary();

      // Render Charts
      AppCharts.renderSentimentPie("chart-sentiment-pie", summary.sentiment_counts);
      AppCharts.renderRatingDist("chart-rating-dist", summary.rating_distribution);
      AppCharts.renderFacultyBar("chart-faculty-bar", summary.faculty_breakdown);
      AppCharts.renderSubjectStacked("chart-subject-stacked", summary.subject_breakdown);
      AppCharts.renderTimeline("chart-timeline", summary.timeline);

      // Render Faculty Summary Table
      const tbody = document.querySelector("#faculty-summary-table tbody");
      if (tbody) {
        tbody.innerHTML = "";
        summary.faculty_breakdown.forEach(f => {
          const sentimentBadgeClass = f.avg_sentiment_score > 0.05 ? "badge-pos" : (f.avg_sentiment_score < -0.05 ? "badge-neg" : "badge-neu");
          tbody.innerHTML += `
            <tr>
              <td><strong>${this.escapeHtml(f.name)}</strong></td>
              <td>${this.escapeHtml(f.department)}</td>
              <td><span style="color: var(--text-secondary);">${this.escapeHtml(f.designation || 'Faculty')}</span></td>
              <td>${f.total_reviews}</td>
              <td><span style="color: var(--star-gold); font-weight: 700;">★ ${f.avg_rating}</span> / 5.0</td>
              <td><span class="badge badge-pos">${f.positive_count}</span></td>
              <td><span class="badge badge-neu">${f.neutral_count}</span></td>
              <td><span class="badge badge-neg">${f.negative_count}</span></td>
              <td><span class="badge ${sentimentBadgeClass}">${f.avg_sentiment_score > 0 ? "+" : ""}${f.avg_sentiment_score}</span></td>
            </tr>
          `;
        });
      }
    } catch (err) {
      this.showToast("Failed to load analytics data", "error");
    }
  },

  // -------------------------------------------------------------
  // Student Portal
  // -------------------------------------------------------------
  async loadStudentPortal() {
    const unauthBox = document.getElementById("student-unauth-box");
    const authBox = document.getElementById("student-auth-box");

    if (!this.currentUser) {
      if (unauthBox) unauthBox.style.display = "block";
      if (authBox) authBox.style.display = "none";
      return;
    }

    if (unauthBox) unauthBox.style.display = "none";
    if (authBox) authBox.style.display = "block";

    // Populate student profile
    document.getElementById("student-profile-name").textContent = this.currentUser.name;
    document.getElementById("student-profile-details").textContent = 
      `${this.currentUser.department || 'Student'} • ID: ${this.currentUser.student_id || 'N/A'} • ${this.currentUser.email}`;

    // Load history
    try {
      const res = await API.getMyHistory();
      const feedbacks = res.feedbacks || [];
      document.getElementById("student-history-count-badge").textContent = `${feedbacks.length} Submissions`;

      const tbody = document.querySelector("#student-history-table tbody");
      if (tbody) {
        tbody.innerHTML = "";
        if (feedbacks.length === 0) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No feedback submissions yet. Click "Submit New Feedback" to submit your first evaluation!</td></tr>`;
          return;
        }

        feedbacks.forEach(fb => {
          const badgeClass = fb.sentiment === "Positive" ? "badge-pos" : (fb.sentiment === "Negative" ? "badge-neg" : "badge-neu");
          tbody.innerHTML += `
            <tr>
              <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${fb.timestamp}</span></td>
              <td><strong>${this.escapeHtml(fb.faculty_name)}</strong></td>
              <td>${this.escapeHtml(fb.subject_code)}</td>
              <td><span style="color: var(--star-gold); font-weight: 700;">★ ${fb.rating}</span></td>
              <td><span class="badge ${badgeClass}">${fb.sentiment}</span></td>
              <td>${fb.sentiment_score > 0 ? "+" : ""}${fb.sentiment_score}</td>
              <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${this.escapeHtml(fb.message)}
              </td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="App.viewFeedbackDetails(${fb.id})">View</button>
              </td>
            </tr>
          `;
        });
      }
    } catch (err) {
      console.error("Error loading student history:", err);
    }
  },

  // -------------------------------------------------------------
  // Admin Dashboard
  // -------------------------------------------------------------
  async loadAdminDashboard() {
    const unauthBox = document.getElementById("admin-unauth-box");
    const authBox = document.getElementById("admin-auth-box");

    if (!this.currentUser || this.currentUser.role !== "admin") {
      if (unauthBox) unauthBox.style.display = "block";
      if (authBox) authBox.style.display = "none";
      return;
    }

    if (unauthBox) unauthBox.style.display = "none";
    if (authBox) authBox.style.display = "block";

    await this.loadAdminFeedbacks();
    await this.loadAdminFaculties();
    await this.loadAdminSubjects();
  },

  switchAdminSubtab(subtab) {
    this.currentAdminSubtab = subtab;
    const tabs = ["feedbacks", "faculties", "subjects"];
    tabs.forEach(t => {
      const btn = document.getElementById(`admin-subtab-${t}`);
      const panel = document.getElementById(`admin-panel-${t}`);
      if (t === subtab) {
        if (btn) btn.classList.add("active");
        if (panel) panel.style.display = "block";
      } else {
        if (btn) btn.classList.remove("active");
        if (panel) panel.style.display = "none";
      }
    });
  },

  async loadAdminFeedbacks() {
    const faculty_id = document.getElementById("admin-filter-faculty")?.value || "";
    const subject_id = document.getElementById("admin-filter-subject")?.value || "";
    const sentiment = document.getElementById("admin-filter-sentiment")?.value || "";
    const rating = document.getElementById("admin-filter-rating")?.value || "";
    const search = document.getElementById("admin-search-input")?.value.trim() || "";

    try {
      const res = await API.getFeedbacks({ faculty_id, subject_id, sentiment, rating, search, limit: 100 });
      const feedbacks = res.feedbacks || [];
      const tbody = document.querySelector("#admin-feedback-table tbody");

      if (tbody) {
        tbody.innerHTML = "";
        if (feedbacks.length === 0) {
          tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">No feedbacks match the criteria.</td></tr>`;
          return;
        }

        feedbacks.forEach(fb => {
          const badgeClass = fb.sentiment === "Positive" ? "badge-pos" : (fb.sentiment === "Negative" ? "badge-neg" : "badge-neu");
          tbody.innerHTML += `
            <tr>
              <td><span style="font-size: 0.8rem; color: var(--text-muted);">#${fb.id}</span></td>
              <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${fb.timestamp}</span></td>
              <td><strong>${this.escapeHtml(fb.faculty_name)}</strong></td>
              <td>${this.escapeHtml(fb.subject_code)}</td>
              <td><span style="color: var(--star-gold); font-weight: 700;">★ ${fb.rating}</span></td>
              <td><span class="badge ${badgeClass}">${fb.sentiment}</span></td>
              <td>${fb.sentiment_score > 0 ? "+" : ""}${fb.sentiment_score}</td>
              <td><span style="font-size: 0.85rem;">${this.escapeHtml(fb.student_name)}</span></td>
              <td style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${this.escapeHtml(fb.message)}
              </td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-outline btn-sm" onclick="App.viewFeedbackDetails(${fb.id})">Details</button>
                  <button class="btn btn-danger btn-sm" onclick="App.deleteFeedbackItem(${fb.id})">Delete</button>
                </div>
              </td>
            </tr>
          `;
        });
      }
    } catch (err) {
      console.error("Error loading admin feedbacks:", err);
    }
  },

  debounceAdminSearch() {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.loadAdminFeedbacks();
    }, 300);
  },

  clearAdminFilters() {
    if (document.getElementById("admin-filter-faculty")) document.getElementById("admin-filter-faculty").value = "";
    if (document.getElementById("admin-filter-subject")) document.getElementById("admin-filter-subject").value = "";
    if (document.getElementById("admin-filter-sentiment")) document.getElementById("admin-filter-sentiment").value = "";
    if (document.getElementById("admin-filter-rating")) document.getElementById("admin-filter-rating").value = "";
    if (document.getElementById("admin-search-input")) document.getElementById("admin-search-input").value = "";
    this.loadAdminFeedbacks();
  },

  async deleteFeedbackItem(id) {
    if (!confirm(`Are you sure you want to delete feedback #${id}? This action cannot be undone.`)) {
      return;
    }
    try {
      await API.deleteFeedback(id);
      this.showToast(`Feedback #${id} deleted successfully`, "success");
      await this.loadAdminFeedbacks();
      await this.loadOverviewKPIs();
    } catch (err) {
      this.showToast(err.message || "Failed to delete feedback", "error");
    }
  },

  async loadAdminFaculties() {
    try {
      const res = await API.getFaculties();
      const faculties = res.faculties || [];
      const tbody = document.querySelector("#admin-faculty-table tbody");
      if (tbody) {
        tbody.innerHTML = "";
        faculties.forEach(f => {
          tbody.innerHTML += `
            <tr>
              <td>#${f.id}</td>
              <td><strong>${this.escapeHtml(f.name)}</strong></td>
              <td>${this.escapeHtml(f.department)}</td>
              <td>${this.escapeHtml(f.designation || 'Faculty')}</td>
              <td><span style="color: var(--text-secondary);">${this.escapeHtml(f.email || 'N/A')}</span></td>
              <td>${f.feedback_count}</td>
              <td><span style="color: var(--star-gold); font-weight: 700;">★ ${f.avg_rating}</span></td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-outline btn-sm" onclick="App.openFacultyModal(${JSON.stringify(f).replace(/"/g, '&quot;')})">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="App.deleteFacultyItem(${f.id})">Delete</button>
                </div>
              </td>
            </tr>
          `;
        });
      }
    } catch (err) {
      console.error("Error loading admin faculties:", err);
    }
  },

  async loadAdminSubjects() {
    try {
      const res = await API.getSubjects();
      const subjects = res.subjects || [];
      const tbody = document.querySelector("#admin-subject-table tbody");
      if (tbody) {
        tbody.innerHTML = "";
        subjects.forEach(s => {
          tbody.innerHTML += `
            <tr>
              <td>#${s.id}</td>
              <td><strong>${this.escapeHtml(s.code)}</strong></td>
              <td>${this.escapeHtml(s.name)}</td>
              <td>${this.escapeHtml(s.department)}</td>
              <td>${this.escapeHtml(s.semester || 'Semester 1')}</td>
              <td>${s.feedback_count}</td>
              <td><span style="color: var(--star-gold); font-weight: 700;">★ ${s.avg_rating}</span></td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-outline btn-sm" onclick="App.openSubjectModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="App.deleteSubjectItem(${s.id})">Delete</button>
                </div>
              </td>
            </tr>
          `;
        });
      }
    } catch (err) {
      console.error("Error loading admin subjects:", err);
    }
  },

  // -------------------------------------------------------------
  // Faculty & Subject CRUD Modals
  // -------------------------------------------------------------
  openFacultyModal(faculty = null) {
    const title = document.getElementById("faculty-modal-title");
    const idInput = document.getElementById("faculty-id-input");
    const nameInput = document.getElementById("faculty-name-input");
    const deptInput = document.getElementById("faculty-dept-input");
    const desigInput = document.getElementById("faculty-desig-input");
    const emailInput = document.getElementById("faculty-email-input");

    if (faculty) {
      title.textContent = "Edit Faculty Member";
      idInput.value = faculty.id;
      nameInput.value = faculty.name;
      deptInput.value = faculty.department;
      desigInput.value = faculty.designation || "";
      emailInput.value = faculty.email || "";
    } else {
      title.textContent = "Add New Faculty Member";
      idInput.value = "";
      nameInput.value = "";
      deptInput.value = "";
      desigInput.value = "";
      emailInput.value = "";
    }
    document.getElementById("faculty-modal").classList.add("active");
  },

  async handleFacultySave(event) {
    event.preventDefault();
    const id = document.getElementById("faculty-id-input").value;
    const name = document.getElementById("faculty-name-input").value.trim();
    const department = document.getElementById("faculty-dept-input").value.trim();
    const designation = document.getElementById("faculty-desig-input").value.trim();
    const email = document.getElementById("faculty-email-input").value.trim();

    try {
      if (id) {
        await API.updateFaculty(id, { name, department, designation, email });
        this.showToast("Faculty updated successfully", "success");
      } else {
        await API.createFaculty({ name, department, designation, email });
        this.showToast("Faculty added successfully", "success");
      }
      this.closeModals();
      await this.loadFacultiesAndSubjects();
      await this.loadAdminFaculties();
    } catch (err) {
      this.showToast(err.message || "Failed to save faculty", "error");
    }
  },

  async deleteFacultyItem(id) {
    if (!confirm("Are you sure you want to delete this faculty member? All associated feedback will be deleted.")) {
      return;
    }
    try {
      await API.deleteFaculty(id);
      this.showToast("Faculty member deleted", "success");
      await this.loadFacultiesAndSubjects();
      await this.loadAdminFaculties();
    } catch (err) {
      this.showToast(err.message || "Failed to delete faculty", "error");
    }
  },

  openSubjectModal(subject = null) {
    const title = document.getElementById("subject-modal-title");
    const idInput = document.getElementById("subject-id-input");
    const codeInput = document.getElementById("subject-code-input");
    const nameInput = document.getElementById("subject-name-input");
    const deptInput = document.getElementById("subject-dept-input");
    const semInput = document.getElementById("subject-sem-input");

    if (subject) {
      title.textContent = "Edit Subject";
      idInput.value = subject.id;
      codeInput.value = subject.code;
      nameInput.value = subject.name;
      deptInput.value = subject.department;
      semInput.value = subject.semester || "";
    } else {
      title.textContent = "Add New Subject";
      idInput.value = "";
      codeInput.value = "";
      nameInput.value = "";
      deptInput.value = "";
      semInput.value = "";
    }
    document.getElementById("subject-modal").classList.add("active");
  },

  async handleSubjectSave(event) {
    event.preventDefault();
    const id = document.getElementById("subject-id-input").value;
    const code = document.getElementById("subject-code-input").value.trim().toUpperCase();
    const name = document.getElementById("subject-name-input").value.trim();
    const department = document.getElementById("subject-dept-input").value.trim();
    const semester = document.getElementById("subject-sem-input").value.trim();

    try {
      if (id) {
        await API.updateSubject(id, { code, name, department, semester });
        this.showToast("Subject updated successfully", "success");
      } else {
        await API.createSubject({ code, name, department, semester });
        this.showToast("Subject added successfully", "success");
      }
      this.closeModals();
      await this.loadFacultiesAndSubjects();
      await this.loadAdminSubjects();
    } catch (err) {
      this.showToast(err.message || "Failed to save subject", "error");
    }
  },

  async deleteSubjectItem(id) {
    if (!confirm("Are you sure you want to delete this subject? All associated feedback will be deleted.")) {
      return;
    }
    try {
      await API.deleteSubject(id);
      this.showToast("Subject deleted", "success");
      await this.loadFacultiesAndSubjects();
      await this.loadAdminSubjects();
    } catch (err) {
      this.showToast(err.message || "Failed to delete subject", "error");
    }
  },

  // -------------------------------------------------------------
  // Feedback Submission & Real-Time Sentiment Preview
  // -------------------------------------------------------------
  setupStarRatings() {
    const desc = document.getElementById("rating-desc-text");
    const starLabels = {
      "5": "5 Stars - Excellent",
      "4": "4 Stars - Very Good",
      "3": "3 Stars - Average",
      "2": "2 Stars - Below Average",
      "1": "1 Star - Poor"
    };

    document.querySelectorAll(".star-rating input").forEach(radio => {
      radio.addEventListener("change", (e) => {
        if (desc) desc.textContent = starLabels[e.target.value] || "";
      });
    });
  },

  handleMessageInput(textarea) {
    const text = textarea.value;
    const charCounter = document.getElementById("char-counter");
    if (charCounter) {
      charCounter.textContent = `${text.length} / 1000 characters`;
    }

    clearTimeout(this.previewDebounceTimer);
    const indicator = document.getElementById("live-sentiment-indicator");

    if (text.trim().length < 5) {
      if (indicator) indicator.style.display = "none";
      return;
    }

    this.previewDebounceTimer = setTimeout(async () => {
      try {
        const preview = await API.previewSentiment(text);
        if (indicator) {
          indicator.style.display = "flex";
          const badge = document.getElementById("meter-sentiment-badge");
          const bar = document.getElementById("meter-sentiment-bar");
          const score = document.getElementById("meter-sentiment-score");

          badge.className = "meter-badge";
          if (preview.sentiment === "Positive") {
            badge.classList.add("badge-pos");
            bar.style.backgroundColor = "var(--sentiment-pos)";
          } else if (preview.sentiment === "Negative") {
            badge.classList.add("badge-neg");
            bar.style.backgroundColor = "var(--sentiment-neg)";
          } else {
            badge.classList.add("badge-neu");
            bar.style.backgroundColor = "var(--sentiment-neu)";
          }
          badge.textContent = preview.sentiment;

          // Normalize score -1..1 to 0..100%
          const pct = Math.round(((preview.compound + 1) / 2) * 100);
          bar.style.width = `${pct}%`;
          score.textContent = `${preview.compound > 0 ? "+" : ""}${preview.compound}`;
        }
      } catch (e) {
        // ignore preview failure
      }
    }, 250);
  },

  async handleFeedbackSubmit(event) {
    event.preventDefault();
    const faculty_id = document.getElementById("faculty-select").value;
    const subject_id = document.getElementById("subject-select").value;
    const ratingRadio = document.querySelector(".star-rating input:checked");
    const message = document.getElementById("feedback-message").value.trim();
    const isAnonymousCheck = document.getElementById("submit-anonymous-check")?.checked || false;
    const submitBtn = document.getElementById("feedback-submit-btn");

    if (!faculty_id || !subject_id) {
      this.showToast("Please choose both a faculty member and a subject.", "error");
      return;
    }
    if (!ratingRadio) {
      this.showToast("Please select a star rating (1-5).", "error");
      return;
    }
    if (!message) {
      this.showToast("Please provide your written feedback comment.", "error");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Analyzing & Submitting...";

      const payload = {
        faculty_id: parseInt(faculty_id),
        subject_id: parseInt(subject_id),
        rating: parseInt(ratingRadio.value),
        message: message,
        is_anonymous: isAnonymousCheck
      };

      const res = await API.submitFeedback(payload);

      // Display dynamic sentiment result modal card (TCS iON Page 9 compliant)
      this.displaySentimentResult(res.sentiment_result, res.is_anonymous);
      this.showToast("Feedback submitted and analyzed successfully!", "success");

      // Reset form controls
      this.resetFeedbackForm(false);

      // Refresh overview KPIs
      this.loadOverviewKPIs();
    } catch (err) {
      this.showToast(err.message || "Failed to submit feedback", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Submit Feedback (AJAX)
      `;
    }
  },

  displaySentimentResult(analysis, isAnonymous) {
    const card = document.getElementById("sentiment-result-card");
    if (!card) return;

    card.style.display = "block";
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const pill = document.getElementById("result-sentiment-pill");
    pill.className = "result-sentiment-pill";
    if (analysis.sentiment === "Positive") {
      pill.classList.add("badge-pos");
      pill.innerHTML = `★ Positive Sentiment (${analysis.compound > 0 ? "+" : ""}${analysis.compound})`;
    } else if (analysis.sentiment === "Negative") {
      pill.classList.add("badge-neg");
      pill.innerHTML = `▲ Negative Sentiment (${analysis.compound})`;
    } else {
      pill.classList.add("badge-neu");
      pill.innerHTML = `● Neutral Sentiment (${analysis.compound})`;
    }

    document.getElementById("result-polarity-score").textContent = 
      `${analysis.compound > 0 ? "+" : ""}${analysis.compound} (Normalized -1.0 to +1.0)`;
    document.getElementById("result-confidence-score").textContent = `${analysis.confidence}%`;
    document.getElementById("result-message-summary").textContent = 
      `Recorded as ${isAnonymous ? "Anonymous Submission" : "Verified Student Submission"}. Sentiment score was computed via natural language processing.`;

    // Detected Keywords
    const kwCloud = document.getElementById("result-keywords-cloud");
    kwCloud.innerHTML = "";
    if (analysis.keywords && analysis.keywords.length > 0) {
      analysis.keywords.forEach(kw => {
        const typeColor = kw.type === "positive" ? "var(--sentiment-pos)" : "var(--sentiment-neg)";
        kwCloud.innerHTML += `
          <span class="keyword-tag" style="border-left: 3px solid ${typeColor};">
            ${this.escapeHtml(kw.word)} (${kw.score > 0 ? "+" : ""}${kw.score})
          </span>
        `;
      });
    } else {
      kwCloud.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">Standard descriptive text (no polarized words).</span>`;
    }

    // Aspect Grid
    const aspectsGrid = document.getElementById("result-aspects-grid");
    aspectsGrid.innerHTML = "";
    const aspectKeys = Object.keys(analysis.aspects || {});
    if (aspectKeys.length > 0) {
      aspectKeys.forEach(k => {
        const item = analysis.aspects[k];
        const badgeClass = item.sentiment === "Positive" ? "badge-pos" : (item.sentiment === "Negative" ? "badge-neg" : "badge-neu");
        const niceName = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        aspectsGrid.innerHTML += `
          <div class="aspect-item">
            <span style="font-size: 0.85rem; font-weight: 600;">${niceName}</span>
            <span class="badge ${badgeClass}">${item.sentiment}</span>
          </div>
        `;
      });
    } else {
      aspectsGrid.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">Overall course & faculty feedback.</span>`;
    }
  },

  hideSentimentResult() {
    const card = document.getElementById("sentiment-result-card");
    if (card) card.style.display = "none";
  },

  resetFeedbackForm(hideResult = true) {
    document.getElementById("faculty-select").value = "";
    document.getElementById("subject-select").value = "";
    document.querySelectorAll(".star-rating input").forEach(r => r.checked = false);
    document.getElementById("rating-desc-text").textContent = "Select rating";
    document.getElementById("feedback-message").value = "";
    document.getElementById("char-counter").textContent = "0 / 1000 characters";
    const indicator = document.getElementById("live-sentiment-indicator");
    if (indicator) indicator.style.display = "none";
    if (hideResult) this.hideSentimentResult();
  },

  // -------------------------------------------------------------
  // Details Modal
  // -------------------------------------------------------------
  async viewFeedbackDetails(id) {
    try {
      const res = await API.getFeedbackDetail(id);
      const fb = res.feedback;
      const modal = document.getElementById("feedback-detail-modal");
      const content = document.getElementById("feedback-detail-content");

      const badgeClass = fb.sentiment === "Positive" ? "badge-pos" : (fb.sentiment === "Negative" ? "badge-neg" : "badge-neu");

      content.innerHTML = `
        <div style="margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="badge ${badgeClass}" style="font-size: 0.95rem; padding: 6px 14px;">
              ${fb.sentiment} Sentiment (${fb.sentiment_score > 0 ? "+" : ""}${fb.sentiment_score})
            </span>
            <span style="color: var(--star-gold); font-size: 1.2rem; font-weight: 700;">★ ${fb.rating} / 5</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">
            Submitted: ${fb.timestamp} &bull; By: <strong>${this.escapeHtml(fb.student_name)}</strong>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 4px;">Faculty Member</div>
          <div style="font-size: 1.1rem; font-weight: 700;">${this.escapeHtml(fb.faculty_name)} <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: normal;">(${this.escapeHtml(fb.faculty_department)})</span></div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 4px;">Course / Subject</div>
          <div style="font-size: 1rem; font-weight: 600;">${this.escapeHtml(fb.subject_code)} - ${this.escapeHtml(fb.subject_name)}</div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 6px;">Written Feedback</div>
          <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; font-size: 0.95rem; line-height: 1.5;">
            ${this.escapeHtml(fb.message)}
          </div>
        </div>
      `;

      modal.classList.add("active");
    } catch (err) {
      this.showToast("Failed to load feedback details", "error");
    }
  },

  // -------------------------------------------------------------
  // Modals & Popups
  // -------------------------------------------------------------
  openAuthModal(defaultRole = "student") {
    this.closeModals();
    this.fillDemoLogin(defaultRole);
    document.getElementById("auth-modal").classList.add("active");
  },

  openRegisterModal() {
    this.closeModals();
    document.getElementById("register-modal").classList.add("active");
  },

  closeModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
  },

  // -------------------------------------------------------------
  // Seed & Export
  // -------------------------------------------------------------
  async triggerSeedData() {
    if (!confirm("This will reset the database and re-seed it with realistic sample faculty, subjects, and reviews. Proceed?")) {
      return;
    }
    try {
      await API.seedDatabase();
      this.showToast("Database successfully re-seeded with sample data!", "success");
      await this.loadFacultiesAndSubjects();
      await this.loadOverviewKPIs();
      await this.loadAdminFeedbacks();
      await this.loadAdminFaculties();
      await this.loadAdminSubjects();
    } catch (err) {
      this.showToast("Failed to re-seed database", "error");
    }
  },

  exportReport(format = "csv") {
    window.location.href = API.getExportUrl(format);
  },

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${this.escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Global Esc key listener for modals
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    App.closeModals();
  }
});

// Initialize application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
