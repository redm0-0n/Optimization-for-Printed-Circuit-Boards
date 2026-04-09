const BASE = "/api";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  /* Boards */
  uploadBoard(file) {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE}/boards/upload`, { method: "POST", body: fd }).then(
      (r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.detail); });
        return r.json();
      }
    );
  },
  listBoards:  () => req("/boards/"),
  getBoard:    (id) => req(`/boards/${id}`),
  deleteBoard: (id) => req(`/boards/${id}`, { method: "DELETE" }),

  /* Optimization */
  startRun: (boardId, algorithm, parameters = {}) =>
    req("/optimize/", {
      method: "POST",
      body: JSON.stringify({ board_id: boardId, algorithm, parameters }),
    }),
  listRuns:  () => req("/optimize/runs"),
  getRun:    (id) => req(`/optimize/runs/${id}`),
  deleteRun: (id) => req(`/optimize/runs/${id}`, { method: "DELETE" }),
  compare:   (ids) => req("/optimize/compare", {
    method: "POST",
    body: JSON.stringify(ids),
  }),

  health: () => req("/health"),
};