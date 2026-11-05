/**
 * API Client Module
 * Provides AJAX fetch wrappers for all RESTful endpoints.
 */

const API = {
  tokenKey: "edu_feedback_token",

  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  },

  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(endpoint, config);
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const errorMsg = data.error || (typeof data === "string" ? data : "Request failed");
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || "GET"} ${endpoint}]:`, err);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  },

  // Auth Endpoints
  register(userData) {
    return this.post("/api/auth/register", userData);
  },

  login(credentials) {
    return this.post("/api/auth/login", credentials);
  },

  getMe() {
    return this.get("/api/auth/me");
  },

  logout() {
    return this.post("/api/auth/logout", {});
  },

  // Feedback Endpoints
  submitFeedback(feedbackData) {
    return this.post("/api/feedback", feedbackData);
  },

  getSummary(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/api/summary${query ? "?" + query : ""}`);
  },

  getFeedbacks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/api/feedback${query ? "?" + query : ""}`);
  },

  getFeedbackDetail(id) {
    return this.get(`/api/feedback/${id}`);
  },

  getMyHistory() {
    return this.get("/api/feedback/my-history");
  },

  deleteFeedback(id) {
    return this.delete(`/api/feedback/${id}`);
  },

  previewSentiment(message) {
    return this.post("/api/sentiment/preview", { message });
  },

  // Faculty Endpoints
  getFaculties() {
    return this.get("/api/faculty");
  },

  createFaculty(facultyData) {
    return this.post("/api/faculty", facultyData);
  },

  updateFaculty(id, facultyData) {
    return this.put(`/api/faculty/${id}`, facultyData);
  },

  deleteFaculty(id) {
    return this.delete(`/api/faculty/${id}`);
  },

  // Subject Endpoints
  getSubjects() {
    return this.get("/api/subjects");
  },

  createSubject(subjectData) {
    return this.post("/api/subjects", subjectData);
  },

  updateSubject(id, subjectData) {
    return this.put(`/api/subjects/${id}`, subjectData);
  },

  deleteSubject(id) {
    return this.delete(`/api/subjects/${id}`);
  },

  // Reset / Seed
  seedDatabase() {
    return this.post("/api/seed", {});
  },

  // Export
  getExportUrl(format = "csv") {
    return `/api/reports/export?format=${format}`;
  }
};
