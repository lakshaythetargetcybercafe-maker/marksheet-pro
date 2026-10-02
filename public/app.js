const app = document.getElementById('app');

const state = {
  token: localStorage.getItem('token') || '',
  students: [],
  dashboard: {}
};

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function renderLogin() {
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h2>Admin Login</h2>
        <form id="loginForm">
          <input name="username" placeholder="Username" value="admin" required />
          <input name="password" type="password" placeholder="Password" value="admin123" required />
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const payload = Object.fromEntries(form.entries());

    try {
      const result = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      state.token = result.token;
      localStorage.setItem('token', result.token);
      initDashboard();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function initDashboard() {
  const stats = await apiFetch('/api/dashboard/stats');
  const students = await apiFetch('/api/students');

  state.dashboard = stats;
  state.students = students;

  renderDashboard();
}

function renderDashboard() {
  app.innerHTML = `
    <div class="container">
      <header class="topbar">
        <h2>University Marksheet Portal</h2>
        <button id="logoutBtn">Logout</button>
      </header>

      <section class="stats">
        <div class="stat-card">
          <h3>Total Students</h3>
          <p>${state.dashboard.total_students || 0}</p>
        </div>
        <div class="stat-card">
          <h3>Total Marksheets</h3>
          <p>${state.dashboard.total_marksheets || 0}</p>
        </div>
        <div class="stat-card">
          <h3>Total Admins</h3>
          <p>${state.dashboard.total_admins || 0}</p>
        </div>
      </section>

      <section class="panel">
        <h3>Bulk Student Import</h3>
        <form id="bulkImportForm" enctype="multipart/form-data">
          <input type="file" name="csvFile" accept=".csv" required />
          <button type="submit">Upload CSV</button>
        </form>
      </section>

      <section class="panel">
        <h3>Add Student</h3>
        <form id="studentForm">
          <div class="grid">
            <input name="student_name" placeholder="Student Name" required />
            <input name="father_name" placeholder="Father Name" />
            <input name="mother_name" placeholder="Mother Name" />
            <input name="roll_no" placeholder="Roll No" required />
            <input name="enrollment_no" placeholder="Enrollment No" />
            <input name="institution_name" placeholder="Institution Name" />
            <input name="course_name" placeholder="Course" />
            <input name="semester" placeholder="Semester" />
            <input name="academic_session" placeholder="Academic Session" />
          </div>
          <button type="submit">Save Student</button>
        </form>
      </section>

      <section class="panel">
        <h3>Students</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Roll No</th>
              <th>Course</th>
              <th>Semester</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${state.students.map((s) => `
              <tr>
                <td>${s.student_name}</td>
                <td>${s.roll_no}</td>
                <td>${s.course_name || '-'}</td>
                <td>${s.semester || '-'}</td>
                <td>
                  <button data-id="${s.id}" class="view-btn">View</button>
                  <button data-id="${s.id}" class="pdf-btn">PDF</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    state.token = '';
    renderLogin();
  });

  document.getElementById('bulkImportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = e.target.querySelector('input[type="file"]');
    if (!fileInput.files[0]) return;

    const formData = new FormData();
    formData.append('csvFile', fileInput.files[0]);

    try {
      const response = await fetch('/api/students/bulk-import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${state.token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Bulk import failed');

      alert('Bulk import complete');
      initDashboard();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const payload = Object.fromEntries(form.entries());

    try {
      await apiFetch('/api/students', {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.token}` },
        body: JSON.stringify(payload)
      });

      e.target.reset();
      initDashboard();
    } catch (error) {
      alert(error.message);
    }
  });

  document.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const data = await apiFetch(`/api/marksheet/student/${id}/view`, {
        headers: { Authorization: `Bearer ${state.token}` }
      });
      alert(JSON.stringify(data, null, 2));
    });
  });

  document.querySelectorAll('.pdf-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      window.open(`/api/marksheet/student/${id}/pdf`, '_blank');
    });
  });
}

if (state.token) {
  initDashboard();
} else {
  renderLogin();
}
